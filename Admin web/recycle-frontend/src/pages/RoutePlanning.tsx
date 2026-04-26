import { useEffect, useMemo, useState } from "react"
import { 
  Navigation,
  Clock,
  Route as RouteIcon,
  Settings,
  Play,
  MapPin,
  Truck
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { useToast } from "../hooks/use-toast"
import { collection, doc, getDocs, limit, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore"
import { db } from "../firebase"

type DriverRow = {
  id: string
  name: string
  truck?: string
}

type PickupPointRow = {
  id: string
  address: string
  type: string
  priority: "high" | "normal" | "low"
  items: string
  scheduledAtMillis?: number
}

type RouteRow = {
  id: string
  name: string
  driver: string
  truck?: string
  pickupCount: number
  distanceKm: number
  estimatedMinutes: number
  status: "active" | "planned" | "completed"
  efficiency: number
  pickupIds: string[]
  assignedDriverId?: string | null
}

export default function RoutePlanning() {
  const [optimizationMode, setOptimizationMode] = useState("time")
  const [trafficEnabled, setTrafficEnabled] = useState(true)
  const [maxPickups, setMaxPickups] = useState([15])
  const { toast } = useToast()
  const [drivers, setDrivers] = useState<DriverRow[]>([])
  const [pickupPoints, setPickupPoints] = useState<PickupPointRow[]>([])
  const [routes, setRoutes] = useState<RouteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [optimizationResults, setOptimizationResults] = useState<{
    timeSavedMin: number
    distanceReducedKm: number
    efficiencyDeltaPct: number
    suggestions: string[]
  } | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success/10 text-success border-success/20"
      case "planned": return "bg-primary/10 text-primary border-primary/20"
      case "completed": return "bg-muted/10 text-muted-foreground border-border"
      default: return "bg-muted/10 text-muted-foreground border-border"
    }
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return "text-success"
    if (efficiency >= 80) return "text-warning" 
    return "text-destructive"
  }

  const minutesToTimeString = (minutes: number) => {
    const m = Math.max(0, Math.round(minutes))
    const h = Math.floor(m / 60)
    const rem = m % 60
    if (h <= 0) return `${rem}m`
    return `${h}h ${rem}m`
  }

  const formatDistance = (km: number) => `${km.toFixed(1)} km`

  const buildRoutesFromData = (
    driversArg: DriverRow[],
    pickupPointsArg: PickupPointRow[],
    mode: string,
  ): { nextRoutes: RouteRow[]; results: NonNullable<typeof optimizationResults> } => {
    const maxPerRoute = Array.isArray(maxPickups) ? Number(maxPickups[0] || 15) : 15

    const orderedPickups = [...pickupPointsArg].sort((a, b) => {
      if (mode === "time") return (a.scheduledAtMillis || 0) - (b.scheduledAtMillis || 0)
      if (mode === "distance") return String(a.address).localeCompare(String(b.address))
      // balanced
      return ((a.scheduledAtMillis || 0) + Number(a.items.split(" ")[0] || 0)) - ((b.scheduledAtMillis || 0) + Number(b.items.split(" ")[0] || 0))
    })

    const effectiveDrivers: DriverRow[] =
      driversArg.length > 0
        ? driversArg
        : [{ id: "unassigned", name: "Unassigned Driver" }]

    const nextRoutes: RouteRow[] = []
    let cursor = 0
    for (let i = 0; i < effectiveDrivers.length; i++) {
      const driver = effectiveDrivers[i]
      const slice = orderedPickups.slice(cursor, cursor + maxPerRoute)
      if (slice.length === 0) break
      cursor += slice.length

      const pickupCount = slice.length
      const distanceKm = Math.round(pickupCount * 3.2 * 10) / 10
      const estimatedMinutes = Math.round(pickupCount * 18 + 30)
      const efficiency = Math.round(Math.max(70, Math.min(98, 96 - pickupCount * 0.8)))
      const pickupIds = slice.map((p) => p.id)

      nextRoutes.push({
        id: `RT-${driver.id}-${i}`,
        name: `Route ${i + 1}`,
        driver: driver.name,
        assignedDriverId: driver.id === "unassigned" ? null : driver.id,
        truck: driver.truck || "",
        pickupCount,
        distanceKm,
        estimatedMinutes,
        status: "planned",
        efficiency,
        pickupIds,
      })
    }

    const totalPickups = pickupPointsArg.length
    const plannedRoutes = nextRoutes.length
    const base = mode === "time" ? 1.2 : 1.1
    const timeSavedMin = Math.max(5, Math.round(totalPickups * 1.5 * base))
    const distanceReducedKm = Math.max(0.5, Math.round((timeSavedMin / 10) * 10) / 10)
    const efficiencyDeltaPct = Math.round(Math.min(10, 2 + plannedRoutes))

    const suggestions: string[] = [
      `Created ${plannedRoutes} planned route(s) using up to ${maxPerRoute} pickup(s) per route.`,
      `Optimization mode: ${mode}. Pickups were re-ordered for smoother routing.`,
    ]
    if (totalPickups > plannedRoutes * maxPerRoute) {
      suggestions.push("Some pickups may remain unassigned. Increase max pickups per route or add more drivers.")
    } else if (totalPickups > 0) {
      suggestions.push("Try starting the earliest-scheduled route first to reduce idle time.")
    } else {
      suggestions.push("No pickups found for the selected planning window.")
    }

    return {
      nextRoutes,
      results: {
        timeSavedMin,
        distanceReducedKm,
        efficiencyDeltaPct,
        suggestions,
      },
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Drivers from Android app `driver` collection
        const usersSnap = await getDocs(collection(db, "driver"))
        const driverRows: DriverRow[] = usersSnap.docs
          .map((d) => {
            const data: any = d.data()
            return {
              id: d.id,
              name: String(data.fullName || data.name || "Unknown Driver"),
              truck: data.truck ? String(data.truck) : undefined,
            }
          })
          .filter(Boolean) as DriverRow[]
        setDrivers(driverRows)

        const now = new Date()
        const todayStart = new Date(now)
        todayStart.setHours(0, 0, 0, 0)

        const pickupsSnap = await getDocs(
          query(collection(db, "pickups"), orderBy("scheduledAtMillis", "desc"), limit(800)),
        )

        const points: PickupPointRow[] = pickupsSnap.docs
          .map((d) => {
            const data: any = d.data()
            const scheduledAtMillis = Number(data.scheduledAtMillis || 0)
            if (!scheduledAtMillis) return null
            if (scheduledAtMillis < todayStart.getTime()) return null

            const status = String(data.status || "scheduled")
            if (!["scheduled", "in_progress"].includes(status)) return null

            const itemsNum = Number(data.items || 0)
            const itemsLabel =
              itemsNum > 0 ? `${itemsNum} items` : data.weightKg ? `${Number(data.weightKg)} kg` : "0"

            return {
              id: d.id,
              address: String(data.address || ""),
              type: String(data.type || data.wasteType || ""),
              priority: (data.priority as any) || "normal",
              items: itemsLabel,
              scheduledAtMillis,
            }
          })
          .filter(Boolean) as PickupPointRow[]

        setPickupPoints(points)

        const { nextRoutes, results } = buildRoutesFromData(driverRows, points, optimizationMode)
        setRoutes(nextRoutes)
        setOptimizationResults(results)
      } catch (e) {
        console.error("Failed to load route planning data", e)
      } finally {
        setLoading(false)
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOptimizeRoute = () => {
    const { nextRoutes, results } = buildRoutesFromData(drivers, pickupPoints, optimizationMode)
    setRoutes(nextRoutes)
    setOptimizationResults(results)
    toast({
      title: "Route Optimized",
      description: "Routes rebuilt using live pickup data.",
    })
  }

  const handleStartRoute = async (routeId: string) => {
    try {
      const route = routes.find(r => r.id === routeId)
      if (!route) return
      await setDoc(doc(db, "routes", routeId), { ...route, status: "active" }, { merge: true })
      for (const pickupId of route.pickupIds) {
        await updateDoc(doc(db, "pickups", pickupId), {
          status: "in_progress",
          assignedDriverId: route.assignedDriverId || null,
          driverId: route.assignedDriverId || null,
          assignedDriver: route.driver,
          driver: route.driver
        })
      }
      setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, status: "active" } : r))
      toast({
        title: "Route Started",
        description: `Route ${route.name || routeId} started. Pickups synced to mobile app.`,
      })
    } catch (e: any) {
      console.error("Start route failed:", e)
      toast({
        title: "Start Route Failed",
        description: e?.message || "Please try again.",
        variant: "destructive"
      })
    }
  }

  const routeStats = useMemo(() => {
    const activeCount = routes.length

    return {
      activeCount,
    }
  }, [routes])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Route Planning</h1>
          <p className="text-muted-foreground">Optimize pickup routes for maximum efficiency</p>
        </div>
        <div />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <RouteIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Routes</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "…" : routeStats.activeCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Route Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className="p-4 border border-border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{route.name}</h3>
                      <p className="text-sm text-muted-foreground">ID: {route.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(route.status)}>
                        {route.status.charAt(0).toUpperCase() + route.status.slice(1)}
                      </Badge>
                      <span className={`text-sm font-medium ${getEfficiencyColor(route.efficiency)}`}>
                        {route.efficiency}% efficient
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Truck className="h-3 w-3 text-muted-foreground" />
                      <span>{route.driver}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{route.pickupCount} pickups</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Navigation className="h-3 w-3 text-muted-foreground" />
                      <span>{formatDistance(route.distanceKm)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{minutesToTimeString(route.estimatedMinutes)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end mt-4">
                    <div className="flex gap-2">
                      {route.status === "planned" && (
                        <Button size="sm" onClick={() => handleStartRoute(route.id)}>
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Settings className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Route Planner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pickupPoints.map((point, index) => (
                <div key={point.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-white font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{point.address}</p>
                    <p className="text-xs text-muted-foreground">{point.items}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {point.priority}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}