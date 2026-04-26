
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "../firebase"

export interface AdminCredentials {
	adminId: string
	password: string
	name: string
	email: string
	phoneNumber: string
}

export interface AdminProfile {
	uid: string
	adminId: string
	name: string
	email: string
	phoneNumber: string
	role: "admin"
}

export class AdminAuthService {
	static async registerAdmin(adminData: AdminCredentials): Promise<void> {
		const cred = await createUserWithEmailAndPassword(auth, adminData.email, adminData.password)
		const uid = cred.user.uid

		// Store admin profile in a dedicated `admin` collection (separate from Android app `users`).
		await setDoc(doc(db, "admin", uid), {
			role: "admin",
			adminId: adminData.adminId,
			fullName: adminData.name,
			email: adminData.email,
			phone: adminData.phoneNumber,
			createdAt: serverTimestamp(),
			createdAtMillis: Date.now(),
			// Fields expected by the Admin Panel "User Management" table UI.
			accountStatus: "active",
			tier: "none",
			totalPickups: 0,
			totalRecycled: "0 kg",
			rewardPoints: 0,
			address: "",
		})
	}

	static async loginAdmin(email: string, password: string): Promise<AdminProfile> {
		const cred = await signInWithEmailAndPassword(auth, email, password)
		const uid = cred.user.uid

		const snap = await getDoc(doc(db, "admin", uid))
		const data = snap.exists() ? snap.data() : null

		if (!data || data.role !== "admin") {
			await signOut(auth)
			throw new Error("This account is not an admin.")
		}

		return {
			uid,
			adminId: String(data.adminId || ""),
			name: String(data.fullName || ""),
			email: String(data.email || email),
			phoneNumber: String(data.phone || ""),
			role: "admin",
		}
	}

	static async logout(): Promise<void> {
		await signOut(auth)
	}
}
