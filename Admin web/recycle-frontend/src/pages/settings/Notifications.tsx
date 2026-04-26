import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Label } from "../../components/ui/label"
import { Switch } from "../../components/ui/switch"
import { Button } from "../../components/ui/button"
import { useToast } from "../../hooks/use-toast"
import { loadSettings, saveSettings } from "../../services/settingsService"

export default function NotificationSettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState(true)
  const [sms, setSms] = useState(false)
  const [push, setPush] = useState(true)

  useEffect(() => {
    loadSettings().then((s) => {
      const n = s.notifications
      if (n) {
        setEmail(n.email)
        setSms(n.sms)
        setPush(n.push)
      }
    }).catch(() => toast({ title: "Failed to load", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSettings({ notifications: { email, sms, push } })
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
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email notifications</Label>
              <p className="text-sm text-muted-foreground">Receive updates via email</p>
            </div>
            <Switch checked={email} onCheckedChange={(v) => setEmail(!!v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>SMS notifications</Label>
              <p className="text-sm text-muted-foreground">Receive SMS alerts</p>
            </div>
            <Switch checked={sms} onCheckedChange={(v) => setSms(!!v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Push notifications</Label>
              <p className="text-sm text-muted-foreground">Browser push alerts</p>
            </div>
            <Switch checked={push} onCheckedChange={(v) => setPush(!!v)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
