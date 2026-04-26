import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { Eye, EyeOff, Lock, User, Mail, KeyRound } from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import { AdminAuthService } from "../../services/adminAuth"

export default function AdminForgotPassword() {
	const [step, setStep] = useState<"verify" | "reset">("verify")
	const [formData, setFormData] = useState({
		adminId: "",
		emailAddress: "",
		name: "",
		newPassword: "",
		confirmPassword: ""
	})
	const [showNewPassword, setShowNewPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState("")
	const navigate = useNavigate()
	const { toast } = useToast()

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target
		setFormData(prev => ({
			...prev,
			[name]: value
		}))
		setError("")
	}

	const handleVerifyStep = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError("")

		try {
			// Validate verification form
			if (!formData.adminId.trim()) {
				throw new Error("Admin ID is required")
			}
			if (!formData.emailAddress.trim()) {
				throw new Error("Email address is required")
			}
			if (!formData.name.trim()) {
				throw new Error("Name is required")
			}
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress)) {
				throw new Error("Please enter a valid email address")
			}

			// Simulate API call to verify admin
			await new Promise(resolve => setTimeout(resolve, 1000))

			// Verify admin details using the authentication service
			const admin = AdminAuthService.verifyAdminDetails(
				formData.adminId.trim(),
				formData.emailAddress.trim(),
				formData.name.trim()
			)

			if (admin) {
				toast({
					title: "Verification Successful",
					description: `Admin details verified for ${admin.name}. You can now reset your password.`,
				})
				setStep("reset")
			} else {
				throw new Error("Admin details not found. Please check your Admin ID, Email, and Name.")
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Verification failed")
			toast({
				title: "Verification Failed",
				description: err instanceof Error ? err.message : "Please try again",
				variant: "destructive",
			})
		} finally {
			setIsLoading(false)
		}
	}

	const handleResetStep = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError("")

		try {
			// Validate reset form
			if (!formData.newPassword.trim()) {
				throw new Error("New password is required")
			}
			if (formData.newPassword.length < 6) {
				throw new Error("Password must be at least 6 characters long")
			}
			if (formData.newPassword !== formData.confirmPassword) {
				throw new Error("Passwords do not match")
			}

			// Simulate API call to reset password
			await new Promise(resolve => setTimeout(resolve, 1000))

			// Update password using the authentication service
			const success = AdminAuthService.updatePassword(formData.adminId.trim(), formData.newPassword)
			
			if (success) {
				toast({
					title: "Password Reset Successful",
					description: "Your password has been updated successfully!",
				})
				navigate("/admin/login")
			} else {
				throw new Error("Failed to update password. Please try again.")
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Password reset failed")
			toast({
				title: "Reset Failed",
				description: err instanceof Error ? err.message : "Please try again",
				variant: "destructive",
			})
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
			<Card className="w-full max-w-lg">
				<CardHeader className="space-y-1 text-center">
					<div className="flex justify-center mb-4">
						<div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
							<KeyRound className="w-8 h-8 text-primary-foreground" />
						</div>
					</div>
					<CardTitle className="text-2xl font-bold">
						{step === "verify" ? "Verify Admin Details" : "Reset Password"}
					</CardTitle>
					<CardDescription>
						{step === "verify" 
							? "Enter your admin details to verify your identity"
							: "Enter your new password to complete the reset"
						}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{step === "verify" ? (
						<form onSubmit={handleVerifyStep} className="space-y-4">
							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							<div className="space-y-2">
								<Label htmlFor="adminId">Admin ID</Label>
								<div className="relative">
									<User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id="adminId"
										name="adminId"
										type="text"
										placeholder="Enter your admin ID"
										value={formData.adminId}
										onChange={handleInputChange}
										className="pl-10"
										required
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="emailAddress">Email Address</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id="emailAddress"
										name="emailAddress"
										type="email"
										placeholder="Enter your email address"
										value={formData.emailAddress}
										onChange={handleInputChange}
										className="pl-10"
										required
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="name">Name</Label>
								<div className="relative">
									<User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id="name"
										name="name"
										type="text"
										placeholder="Enter your full name"
										value={formData.name}
										onChange={handleInputChange}
										className="pl-10"
										required
									/>
								</div>
							</div>

							<Button
								type="submit"
								className="w-full"
								disabled={isLoading}
							>
								{isLoading ? "Verifying..." : "Verify Details"}
							</Button>
						</form>
					) : (
						<form onSubmit={handleResetStep} className="space-y-4">
							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							<div className="space-y-2">
								<Label htmlFor="newPassword">New Password</Label>
								<div className="relative">
									<Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id="newPassword"
										name="newPassword"
										type={showNewPassword ? "text" : "password"}
										placeholder="Enter new password"
										value={formData.newPassword}
										onChange={handleInputChange}
										className="pl-10 pr-10"
										required
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
										onClick={() => setShowNewPassword(!showNewPassword)}
									>
										{showNewPassword ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</Button>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="confirmPassword">Confirm New Password</Label>
								<div className="relative">
									<Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id="confirmPassword"
										name="confirmPassword"
										type={showConfirmPassword ? "text" : "password"}
										placeholder="Confirm new password"
										value={formData.confirmPassword}
										onChange={handleInputChange}
										className="pl-10 pr-10"
										required
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
										onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									>
										{showConfirmPassword ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</Button>
								</div>
							</div>

							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									className="flex-1"
									onClick={() => setStep("verify")}
								>
									Back
								</Button>
								<Button
									type="submit"
									className="flex-1"
									disabled={isLoading}
								>
									{isLoading ? "Resetting..." : "Reset Password"}
								</Button>
							</div>
						</form>
					)}

					<div className="mt-6 text-center">
						<p className="text-sm text-muted-foreground">
							Remember your password?{" "}
							<Link
								to="/admin/login"
								className="text-primary hover:underline font-medium"
							>
								Login here
							</Link>
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
