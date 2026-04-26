import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { Eye, EyeOff, Lock, User, Mail, Phone, UserPlus } from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import { AdminAuthService } from "../../services/adminAuth"

export default function AdminRegister() {
	const [formData, setFormData] = useState({
		name: "",
		adminId: "",
		phoneNumber: "",
		emailAddress: "",
		password: "",
		confirmPassword: ""
	})
	const [showPassword, setShowPassword] = useState(false)
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

	const validateForm = () => {
		if (!formData.name.trim()) {
			throw new Error("Name is required")
		}
		if (!formData.adminId.trim()) {
			throw new Error("Admin ID is required")
		}
		if (!formData.phoneNumber.trim()) {
			throw new Error("Phone number is required")
		}
		if (!formData.emailAddress.trim()) {
			throw new Error("Email address is required")
		}
		if (!formData.password.trim()) {
			throw new Error("Password is required")
		}
		if (formData.password.length < 6) {
			throw new Error("Password must be at least 6 characters long")
		}
		if (formData.password !== formData.confirmPassword) {
			throw new Error("Passwords do not match")
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress)) {
			throw new Error("Please enter a valid email address")
		}
		// Accept Sri Lankan formats: 0XXXXXXXXX, 94XXXXXXXXX, +94XXXXXXXXX
		const phone = formData.phoneNumber.replace(/[\s\-\(\)]/g, "")
		const isSriLanka =
			/^0\d{9}$/.test(phone) ||
			/^94\d{9}$/.test(phone) ||
			/^\+94\d{9}$/.test(phone)

		if (!isSriLanka) {
			throw new Error("Please enter a valid phone number")
		}
		
		// Admin ID/email uniqueness is enforced by your backend rules/DB.
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError("")

		try {
			validateForm()

			// Create admin data object
			const adminData = {
				adminId: formData.adminId.trim(),
				password: formData.password,
				name: formData.name.trim(),
				email: formData.emailAddress.trim(),
				phoneNumber: formData.phoneNumber.trim()
			}

			await AdminAuthService.registerAdmin(adminData)

			toast({
				title: "Registration Successful",
				description: "Admin account created successfully! You can now login.",
			})
			navigate("/admin/login")
		} catch (err) {
			setError(err instanceof Error ? err.message : "Registration failed")
			toast({
				title: "Registration Failed",
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
							<UserPlus className="w-8 h-8 text-primary-foreground" />
						</div>
					</div>
					<CardTitle className="text-2xl font-bold">Admin Registration</CardTitle>
					<CardDescription>
						Create a new admin account to access the dashboard
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

							<div className="space-y-2">
								<Label htmlFor="adminId">Admin ID</Label>
								<div className="relative">
									<User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id="adminId"
										name="adminId"
										type="text"
										placeholder="Enter admin ID"
										value={formData.adminId}
										onChange={handleInputChange}
										className="pl-10"
										required
									/>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="phoneNumber">Phone Number</Label>
								<div className="relative">
									<Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id="phoneNumber"
										name="phoneNumber"
										type="tel"
										placeholder="Enter phone number"
										value={formData.phoneNumber}
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
										placeholder="Enter email address"
										value={formData.emailAddress}
										onChange={handleInputChange}
										className="pl-10"
										required
									/>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="password">Password</Label>
								<div className="relative">
									<Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id="password"
										name="password"
										type={showPassword ? "text" : "password"}
										placeholder="Enter password"
										value={formData.password}
										onChange={handleInputChange}
										className="pl-10 pr-10"
										required
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
										onClick={() => setShowPassword(!showPassword)}
									>
										{showPassword ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</Button>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="confirmPassword">Confirm Password</Label>
								<div className="relative">
									<Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id="confirmPassword"
										name="confirmPassword"
										type={showConfirmPassword ? "text" : "password"}
										placeholder="Confirm password"
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
						</div>

						<Button
							type="submit"
							className="w-full"
							disabled={isLoading}
						>
							{isLoading ? "Creating Account..." : "Create Admin Account"}
						</Button>
					</form>

					<div className="mt-6 text-center">
						<p className="text-sm text-muted-foreground">
							Already have an admin account?{" "}
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
