import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../firebase"

interface AdminUser {
	uid: string
	adminId: string
	name: string
	email: string
	phoneNumber?: string
	createdAtMillis?: number
}

interface AuthContextType {
	user: AdminUser | null
	login: (email: string, password: string) => Promise<void>
	logout: () => Promise<void>
	refreshUser: () => Promise<void>
	isAuthenticated: boolean
	isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}

interface AuthProviderProps {
	children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [user, setUser] = useState<AdminUser | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const unsub = onAuthStateChanged(auth, async (fbUser) => {
			try {
				if (!fbUser) {
					setUser(null)
					return
				}

				// Admin accounts are stored in the `admin` collection.
				const snap = await getDoc(doc(db, "admin", fbUser.uid))
				const data = snap.exists() ? snap.data() : null
				if (!data || data.role !== "admin") {
					setUser(null)
					return
				}

				setUser({
					uid: fbUser.uid,
					adminId: String(data.adminId || ""),
					name: String(data.fullName || ""),
					email: String(data.email || fbUser.email || ""),
					phoneNumber: String(data.phone || ""),
					createdAtMillis: Number(data.createdAtMillis || 0) || undefined,
				})
			} catch (e) {
				console.error("Auth state error:", e)
				setUser(null)
			} finally {
				setIsLoading(false)
			}
		})

		return () => unsub()
	}, [])

	const login = async (_email: string, _password: string) => {
		throw new Error("Use AdminLogin to sign in.")
	}

	const refreshUser = async () => {
		const fbUser = auth.currentUser
		if (!fbUser) {
			setUser(null)
			return
		}
		try {
			const snap = await getDoc(doc(db, "admin", fbUser.uid))
			const data = snap.exists() ? snap.data() : null
			if (!data || data.role !== "admin") {
				setUser(null)
				return
			}
			setUser({
				uid: fbUser.uid,
				adminId: String(data.adminId || ""),
				name: String(data.fullName || ""),
				email: String(data.email || fbUser.email || ""),
				phoneNumber: String(data.phone || ""),
				createdAtMillis: Number(data.createdAtMillis || 0) || undefined,
			})
		} catch (e) {
			console.error("Refresh user error:", e)
		}
	}

	const logout = async () => {
		await auth.signOut()
	}

	const value: AuthContextType = {
		user,
		login,
		logout,
		refreshUser,
		isAuthenticated: !!user,
		isLoading
	}

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	)
}




