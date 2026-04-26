import { 
  Recycle, 
  Truck, 
  Users, 
  TrendingUp, 
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react"
import { MetricsCard } from "../components/dashboard/MetricsCard"
import { ActivityFeed } from "../components/dashboard/ActivityFeed"
import { QuickActions } from "../components/dashboard/QuickActions"
import { VehicleTrackingMap } from "../components/maps/VehicleTrackingMap"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { useEffect, useMemo, useState } from "react"
import { collection, getDocs, orderBy, query, limit, where } from "firebase/firestore"
import { db } from "../firebase"

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [totalPickupsToday, setTotalPickupsToday] = useState(0)
  const [pendingReviews, setPendingReviews] = useState(0)
  const [activeUsers, setActiveUsers] = useState(0)
  const [itemsRecycled, setItemsRecycled] = useState(0)

  const now = useMemo(() => new Date(), [])

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true)
      try {
        const pickupsSnap = await getDocs(
          query(collection(db, "pickups"), limit(5000))
        )

        let totalPickups = pickupsSnap.size
        let recycledItemsCount = 0

        pickupsSnap.forEach((d) => {
          const data: any = d.data()
          const status = String(data.status || "").toLowerCase()

          // Tally all items recycled across all time
          if (status === "completed") {
             const items = Number(data.itemCount || data.quantity || 1)
             recycledItemsCount += items
          }
        })
        
        setTotalPickupsToday(totalPickups)
        setItemsRecycled(recycledItemsCount)

        const submissionsSnap = await getDocs(
          query(collection(db, "submissions"), where("status", "==", "pending"))
        )
        setPendingReviews(submissionsSnap.size)

        const usersSnap = await getDocs(collection(db, "users"))
        let appUsers = 0
        usersSnap.forEach((d) => {
          const data: any = d.data()
          const role = String(data.role || "")
          if (role === "driver" || role === "recycler") appUsers++
        })
        setActiveUsers(appUsers)

      } catch (e) {
        console.error("Failed to load dashboard metrics", e)
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [now])

  const formatInt = (n: number) => n.toLocaleString()
  const formatMoneyOrAmount = (n: number) => {
    const rounded = Math.round(n * 100) / 100
    return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Eco Track Admin Panel! All services at one place.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="Total Registered Pickups"
          value={loading ? "…" : formatInt(totalPickupsToday)}
          change={{ value: "+System", type: "increase" }}
          icon={<Truck className="h-6 w-6 text-black" />}
          description={loading ? "Loading..." : "All-time pickups"}
          className="card-light p-4 shadow-card border-border"
        />
        <MetricsCard
          title="Pending Reviews"
          value={loading ? "…" : formatInt(pendingReviews)}
          change={{ value: "+Live", type: "increase" }}
          icon={<CheckCircle className="h-6 w-6 text-black" />}
          description={loading ? "Loading..." : "Awaiting approval"}
          className="card-light p-4 shadow-card border-border"
        />
        <MetricsCard
          title="Active Users"
          value={loading ? "…" : formatInt(activeUsers)}
          change={{ value: "+Live", type: "increase" }}
          icon={<Users className="h-6 w-6 text-black" />}
          description="Drivers + Recyclers"
          className="card-light p-5 shadow-card border-border"
        />
        <MetricsCard
          title="Total Items Recycled"
          value={loading ? "…" : formatMoneyOrAmount(itemsRecycled)}
          change={{ value: "+All-time", type: "increase" }}
          icon={<Recycle className="h-6 w-6 text-black" />}
          description="Total impact"
          className="card-light p-4 shadow-card border-border"
        />
      </div>

      {/* Maps and Status */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live Tracking Map */}
        <VehicleTrackingMap className="lg:col-span-2 border-2 border-blue-300" />

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">API Services</span>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  Operational
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">GPS Tracking</span>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  Online
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Payment Gateway</span>
                </div>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  Maintenance
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Image Processing</span>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  Active
                </Badge>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last updated: 2 minutes ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity and Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityFeed />
        <QuickActions />
      </div>
    </div>
  )
}