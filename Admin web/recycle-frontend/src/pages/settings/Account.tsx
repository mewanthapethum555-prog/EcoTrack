import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Button } from "../../components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"
import { Separator } from "../../components/ui/separator"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { 
  User, 
  Mail, 
  Phone, 
  Key, 
  Save, 
  Eye, 
  EyeOff, 
  Shield,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useToast } from "../../hooks/use-toast"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "../../firebase"
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword as firebaseUpdatePassword,
} from "firebase/auth"
import { auth } from "../../firebase"

export default function AccountSettings() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    adminId: ""
  })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Load current user data
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        adminId: user.adminId || ""
      })
    }
  }, [user])


  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
    setError("")
    setSuccess("")
  }

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }))
    setError("")
    setSuccess("")
  }

  const handleSaveProfile = async () => {
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      // Validate profile data
      if (!profileData.name.trim()) {
        throw new Error("Name is required")
      }
      if (!profileData.email.trim()) {
        throw new Error("Email is required")
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
        throw new Error("Please enter a valid email address")
      }

      if (!user?.uid) throw new Error("Not signed in")

      await updateDoc(doc(db, "admin", user.uid), {
        fullName: profileData.name.trim(),
        email: profileData.email.trim(),
        phone: profileData.phoneNumber.trim(),
      })
      await refreshUser()

      setSuccess("Profile updated successfully!")
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async () => {
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      // Validate password data
      if (!passwordData.currentPassword.trim()) {
        throw new Error("Current password is required")
      }
      if (!passwordData.newPassword.trim()) {
        throw new Error("New password is required")
      }
      if (passwordData.newPassword.length < 6) {
        throw new Error("New password must be at least 6 characters long")
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error("New passwords do not match")
      }

      const currentUser = auth.currentUser
      if (!currentUser?.email) throw new Error("Not signed in")

      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      )
      await reauthenticateWithCredential(currentUser, credential)
      await firebaseUpdatePassword(currentUser, passwordData.newPassword)

      // Clear password fields
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })

      setSuccess("Password changed successfully!")
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password")
      toast({
        title: "Password Change Failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your admin account information and security</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-success/20 bg-success/5">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">{success}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card className="border-primary/20">
          <CardHeader className="bg-primary/5 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-primary">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Picture */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src="" alt={profileData.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {profileData.name.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
            </div>

            <Separator />

            {/* Profile Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => handleProfileChange("name", e.target.value)}
                    className="pl-10"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleProfileChange("email", e.target.value)}
                    className="pl-10"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={profileData.phoneNumber}
                    onChange={(e) => handleProfileChange("phoneNumber", e.target.value)}
                    className="pl-10"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminId">Admin ID</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="adminId"
                    value={profileData.adminId}
                    disabled
                    className="pl-10 bg-muted"
                    placeholder="Admin ID"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Admin ID cannot be changed
                </p>
              </div>
            </div>

            <Separator />

            <Button 
              onClick={handleSaveProfile} 
              disabled={isLoading}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : "Save Profile Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="border-warning/20">
          <CardHeader className="bg-warning/5 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-warning">
              <Key className="w-5 h-5" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    name="current-password"
                    autoComplete="off"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    name="new-password"
                    autoComplete="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="Enter new password"
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
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirm-password"
                    autoComplete="new-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="Confirm new password"
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

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Password Requirements</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• At least 6 characters long</li>
                <li>• Mix of letters and numbers recommended</li>
                <li>• Avoid common passwords</li>
              </ul>
            </div>

            <Button 
              onClick={handleChangePassword} 
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              <Key className="h-4 w-4 mr-2" />
              {isLoading ? "Changing..." : "Change Password"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <Card className="border-accent/20">
        <CardHeader className="bg-accent/5 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-accent">
            <Shield className="w-5 h-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Account Status</Label>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span className="text-sm">Active</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account Created</Label>
              <p className="text-sm text-muted-foreground">
                {user?.createdAtMillis
                  ? new Date(user.createdAtMillis).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <p className="text-sm text-muted-foreground">Administrator</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
