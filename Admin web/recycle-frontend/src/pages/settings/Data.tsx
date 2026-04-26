import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Label } from "../../components/ui/label"
import { Input } from "../../components/ui/input"
import { useToast } from "../../hooks/use-toast"
import { loadSettings, saveSettings } from "../../services/settingsService"

export default function DataSettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [retentionDays, setRetentionDays] = useState(90)

  useEffect(() => {
    loadSettings().then((s) => {
      setRetentionDays(s.data?.retentionDays ?? 90)
    }).catch(() => toast({ title: "Failed to load", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSettings({ data: { retentionDays } })
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
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Retention (days)</Label>
            <Input type="number" min={1} value={retentionDays} onChange={(e) => setRetentionDays(Number(e.target.value) || 90)} />
            <p className="text-xs text-muted-foreground mt-1">How long to keep historical data before archiving.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
