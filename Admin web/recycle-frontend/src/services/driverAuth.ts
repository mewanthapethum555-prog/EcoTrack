import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "../firebase"

export interface DriverCredentials {
  fullName: string
  email: string
  password: string
  phoneNumber: string
  city?: string
  state?: string
}

/**
 * Registers a driver in Firebase Auth and writes driver profile documents.
 *
 * Notes:
 * - User mobile app currently reads driver role from the `users` collection.
 * - Admin request also asked to store driver profiles in the `driver` collection.
 *   We write to both to keep the app compatible and still satisfy the requested collection.
 */
export class DriverAuthService {
  static async registerDriver(driverData: DriverCredentials): Promise<void> {
    const cred = await createUserWithEmailAndPassword(auth, driverData.email, driverData.password)
    const uid = cred.user.uid

    const createdAtMillis = Date.now()

    // Admin-requested collection.
    await setDoc(doc(db, "driver", uid), {
      role: "driver",
      driverId: uid,
      fullName: driverData.fullName,
      email: driverData.email,
      phone: driverData.phoneNumber,
      city: driverData.city || "",
      state: driverData.state || "",
      createdAt: serverTimestamp(),
      createdAtMillis,
      accountStatus: "active",
      tier: "none",
      totalPickups: 0,
      totalRecycled: "0 kg",
      rewardPoints: 0,
      address: "",
    })

    // Keep Android compatibility: existing driver login expects `users/{uid}` with role="driver".
    await setDoc(
      doc(db, "users", uid),
      {
        role: "driver",
        fullName: driverData.fullName,
        email: driverData.email,
        phone: driverData.phoneNumber,
        city: driverData.city || "",
        state: driverData.state || "",
        createdAtMillis,
        accountStatus: "active",
        tier: "none",
        totalPickups: 0,
        totalRecycled: "0 kg",
        rewardPoints: 0,
        address: "",
      },
      { merge: true },
    )
  }
}

