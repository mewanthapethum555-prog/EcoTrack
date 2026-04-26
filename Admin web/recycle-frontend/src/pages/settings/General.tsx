import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Label } from "../../components/ui/label"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Button } from "../../components/ui/button"
import { useToast } from "../../hooks/use-toast"
import { loadSettings, saveSettings } from "../../services/settingsService"

export default function GeneralSettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [org, setOrg] = useState({ name: "", contactEmail: "", address: "" })
  const [regional, setRegional] = useState({ timezone: "Asia/Colombo", language: "en" })

  useEffect(() => {
    loadSettings().then((s) => {
      setOrg(s.organization || { name: "", contactEmail: "", address: "" })
      setRegional(s.regional || { timezone: "Asia/Colombo", language: "en" })
    }).catch(() => toast({ title: "Failed to load", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSettings({ organization: org, regional })
      toast({ title: "Settings saved" })
    } catch {
      toast({ title: "Save failed", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input value={org.name} onChange={(e) => setOrg((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" value={org.contactEmail} onChange={(e) => setOrg((p) => ({ ...p, contactEmail: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={org.address} onChange={(e) => setOrg((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regional Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Timezone</Label>
              <Select value={regional.timezone} onValueChange={(v) => setRegional((p) => ({ ...p, timezone: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Colombo">Asia/Colombo (Sri Lanka)</SelectItem>
                  <SelectItem value="utc-8">Pacific (UTC-8)</SelectItem>
                  <SelectItem value="utc-5">Eastern (UTC-5)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={regional.language} onValueChange={(v) => setRegional((p) => ({ ...p, language: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
