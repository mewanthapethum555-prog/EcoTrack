import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Label } from "../../components/ui/label"
import { Switch } from "../../components/ui/switch"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { useToast } from "../../hooks/use-toast"
import { loadSettings, saveSettings } from "../../services/settingsService"

export default function SystemSettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoApproval, setAutoApproval] = useState(false)
  const [routeOptimization, setRouteOptimization] = useState(true)
  const [realTimeTracking, setRealTimeTracking] = useState(true)
  const [apiKey, setApiKey] = useState("")

  useEffect(() => {
    loadSettings().then((s) => {
      const sys = s.system
      if (sys) {
        setAutoApproval(sys.autoApproval)
        setRouteOptimization(sys.routeOptimization)
        setRealTimeTracking(sys.realTimeTracking)
        setApiKey(sys.apiKey || "")
      }
    }).catch(() => toast({ title: "Failed to load", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSettings({
        system: { autoApproval, routeOptimization, realTimeTracking, apiKey },
      })
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
          <CardTitle>System Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Approval</Label>
              <p className="text-sm text-muted-foreground">Automatically approve common items</p>
            </div>
            <Switch checked={autoApproval} onCheckedChange={(v) => setAutoApproval(!!v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Route Optimization</Label>
              <p className="text-sm text-muted-foreground">Enable automatic route planning</p>
            </div>
            <Switch checked={routeOptimization} onCheckedChange={(v) => setRouteOptimization(!!v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Real-time Tracking</Label>
              <p className="text-sm text-muted-foreground">Show vehicle location in real time</p>
            </div>
            <Switch checked={realTimeTracking} onCheckedChange={(v) => setRealTimeTracking(!!v)} />
          </div>
          <div className="space-y-2">
            <Label>Service API Key</Label>
            <div className="flex gap-2">
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Optional" />
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(apiKey); toast({ title: "Copied" }) }}>Copy</Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
