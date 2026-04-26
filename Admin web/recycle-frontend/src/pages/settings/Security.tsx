import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Label } from "../../components/ui/label"
import { Input } from "../../components/ui/input"
import { Switch } from "../../components/ui/switch"
import { Button } from "../../components/ui/button"
import { useToast } from "../../hooks/use-toast"
import { loadSettings, saveSettings } from "../../services/settingsService"

export default function SecuritySettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [twoFA, setTwoFA] = useState(false)
  const [minLength, setMinLength] = useState(8)

  useEffect(() => {
    loadSettings().then((s) => {
      const sec = s.security
      if (sec) {
        setTwoFA(sec.twoFA)
        setMinLength(sec.minPasswordLength)
      }
    }).catch(() => toast({ title: "Failed to load", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSettings({ security: { twoFA, minPasswordLength: minLength } })
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
          <CardTitle>Access & Passwords</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Require 2FA for admin users</p>
            </div>
            <Switch checked={twoFA} onCheckedChange={(v) => setTwoFA(!!v)} />
          </div>
          <div>
            <Label>Minimum Password Length</Label>
            <Input type="number" min={6} value={minLength} onChange={(e) => setMinLength(Number(e.target.value) || 8)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
