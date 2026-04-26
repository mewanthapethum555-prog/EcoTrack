import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { 
  Settings as SettingsIcon,
  User,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import AccountSettings from "./settings/Account"
import GeneralSettings from "./settings/General"

export default function Settings() {
  const location = useLocation()
  const navigate = useNavigate()
  // Get the current tab from URL path
  const getCurrentTab = () => {
    const path = location.pathname
    if (path.includes('/account')) return 'account'
    if (path.includes('/general')) return 'general'
    return 'account' // Default to account
  }

  const handleTabChange = (value: string) => {
    navigate(`/settings/${value}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage system configuration and preferences</p>
      </div>

      <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <AccountSettings />
        </TabsContent>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>


      </Tabs>
    </div>
  )
}