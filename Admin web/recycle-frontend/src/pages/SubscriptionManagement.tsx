import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Pencil,
  RefreshCw,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { useToast } from "../hooks/use-toast"
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore"
import { db } from "../firebase"

const PLANS_COLLECTION = "subscription_plans"
const DEFAULT_PLANS = [
  {
    id: "basic",
    name: "Basic Plan",
    price: 500,
    currency: "LKR",
    duration: "monthly",
    validDays: 30,
    pickupLimit: 5,
    features: ["Recycler-focused tracking", "Pickup scheduling", "Standard reporting"],
    activeRole: "recycler",
  },
  {
    id: "premium",
    name: "Premium Plan",
    price: 1000,
    currency: "LKR",
    duration: "monthly",
    validDays: 60,
    pickupLimit: 10,
    features: ["Driver dispatch overview", "Live status monitoring", "Operational insights"],
    activeRole: "driver",
  },
  {
    id: "enterprise",
    name: "Enterprise Plan",
    price: 2000,
    currency: "LKR",
    duration: "monthly",
    validDays: 100,
    pickupLimit: 20,
    features: ["Full analytics", "Priority admin workflow", "System-wide visibility"],
    activeRole: "all",
  },
] as const

type PlanDoc = {
  id: string
  name: string
  price: number
  currency: string
  duration: string
  validDays: number // Plan valid for X days
  pickupLimit: number
  features: string[]
  activeRole: string
  updatedAtMillis?: number
}

type SubmissionStatus = "pending" | "approved" | "rejected"

type SubmissionRow = {
  id: string
  userId: string
  userName: string
  userRole: "driver" | "recycler" | string
  itemType: string
  quantity: string
  location: string
  wasteType: string
  status: SubmissionStatus
  createdAtMillis?: number
  categories?: string[]
  weightKg?: number
  amount?: number
  pickupDateText?: string
  preferredTimeText?: string
  reviewedAtMillis?: number
  subscriptionPlanId?: string
  subscriptionPlanName?: string
}

type ConnectionStatus = "connected" | "disconnected"

type ConnectionRow = {
  userId: string
  userName: string
  userRole: string
  subscriptionPlanName?: string
  connectionStatus: ConnectionStatus
  lastSeenAtMillis?: number
  lastSeenText: string
}

const PLAN_FILTER = {
  all: "all",
  basic: "basic",
  premium: "premium",
  enterprise: "enterprise",
} as const

export default function SubscriptionManagement() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [connections, setConnections] = useState<ConnectionRow[]>([])
  const [confirmations, setConfirmations] = useState<SubmissionRow[]>([])
  const [selectedPlan, setSelectedPlan] = useState<(typeof PLAN_FILTER)[keyof typeof PLAN_FILTER]>(PLAN_FILTER.all)

  const [refreshingConnections, setRefreshingConnections] = useState(false)
  const [plans, setPlans] = useState<PlanDoc[]>([])
  const [managePlanOpen, setManagePlanOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanDoc | null>(null)
  const [editPrice, setEditPrice] = useState("")
  const [editValidDays, setEditValidDays] = useState("")
  const [savingPlan, setSavingPlan] = useState(false)

  const formatRelativeTime = (ms?: number) => {
    if (!ms) return "Never"
    const diff = Date.now() - ms
    if (diff < 60 * 1000) return "Just now"
    const minutes = Math.floor(diff / (60 * 1000))
    if (minutes < 60) return `${minutes} minutes ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 48) return `${hours} hours ago`
    const days = Math.floor(hours / 24)
    return `${days} days ago`
  }

  const getStatusColor = (status: SubmissionStatus) => {
    switch (status) {
      case "pending":
        return "bg-warning/10 text-warning border-warning/20"
      case "approved":
        return "bg-success/10 text-success border-success/20"
      case "rejected":
        return "bg-destructive/10 text-destructive border-destructive/20"
      default:
        return "bg-muted/10 text-muted-foreground border-border"
    }
  }

  const getStatusIcon = (status: SubmissionStatus) => {
    switch (status) {
      case "pending":
        return <AlertTriangle className="h-3 w-3" />
      case "approved":
        return <CheckCircle className="h-3 w-3" />
      case "rejected":
        return <XCircle className="h-3 w-3" />
      default:
        return <Activity className="h-3 w-3" />
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const subSnap = await getDoc(doc(db, "submissions", id))
      if (!subSnap.exists()) throw new Error("Submission not found")

      const data: any = subSnap.data()
      const userId = String(data.userId || "")

      const categories: string[] = Array.isArray(data.categories) ? data.categories : []
      const decisionAt = Date.now()

      // Approve submission first.
      await updateDoc(doc(db, "submissions", id), {
        status: "approved",
        reviewedAtMillis: decisionAt,
      })

      // Fetch the user profile to fill pickup details.
      const userSnap = await getDoc(doc(db, "users", userId))
      const userData: any = userSnap.exists() ? userSnap.data() : null

      const pickupDateText = data.pickupDateText ? String(data.pickupDateText) : ""
      const preferredTimeText = data.preferredTimeText ? String(data.preferredTimeText) : ""
      const scheduledAtMillis = (() => {
        if (!pickupDateText || !preferredTimeText) return Date.now()
        const combined = `${pickupDateText}T${preferredTimeText}:00`
        const t = new Date(combined).getTime()
        return Number.isFinite(t) ? t : Date.now()
      })()

      const type = categories.length ? categories[0] : String(data.type || data.itemType || "")
      const items = categories.length || 0

      await setDoc(
        doc(db, "pickups", id),
        {
          userId,
          status: "scheduled",
          address: String(userData?.address || ""),
          customerName: String(userData?.fullName || userData?.name || ""),
          customerPhone: String(userData?.phone || ""),
          type,
          weightKg: Number(data.weightKg || 0),
          items: Number(items || 0),
          amount: Number(data.amount || 0),
          scheduledAtMillis,
          createdAtMillis: Date.now(),
        },
        { merge: true },
      )

      setConfirmations((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "approved", reviewedAtMillis: decisionAt } : s,
        ),
      )

      toast({
        title: "Submission approved",
        description: `Pickup scheduled for submission ${id}.`,
      })
    } catch (e: any) {
      console.error("Approve failed", e)
      toast({
        title: "Approve failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const seedAndLoadPlans = async (): Promise<PlanDoc[]> => {
    for (const p of DEFAULT_PLANS) {
      const ref = doc(db, PLANS_COLLECTION, p.id)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        await setDoc(ref, {
          id: p.id,
          name: p.name,
          price: p.price,
          currency: p.currency,
          duration: p.duration,
          validDays: p.validDays,
          pickupLimit: p.pickupLimit,
          features: p.features,
          activeRole: p.activeRole,
          updatedAtMillis: Date.now(),
        })
      } else {
        const data = snap.data() as any
        if (data.validDays == null && data.validUntil != null) {
          await updateDoc(ref, {
            validDays: p.validDays,
            validUntil: deleteField(),
            updatedAtMillis: Date.now(),
          })
        }
        if (data.validUntil != null) {
          await updateDoc(ref, {
            validUntil: deleteField(),
            updatedAtMillis: Date.now(),
          })
        }
        if (data.pickupLimit == null) {
          await updateDoc(ref, {
            pickupLimit: p.pickupLimit,
            updatedAtMillis: Date.now(),
          })
        }
      }
    }

    const plansSnap = await getDocs(collection(db, PLANS_COLLECTION))
    const order = ["basic", "premium", "enterprise"]
    const defaultsById = Object.fromEntries(DEFAULT_PLANS.map((p) => [p.id, p]))
    const loaded: PlanDoc[] = plansSnap.docs
      .map((d) => {
        const data = d.data() as any
        const def = defaultsById[d.id]
        return {
          id: String(data.id || d.id),
          name: String(data.name || def?.name || ""),
          price: Number(data.price ?? def?.price ?? 0),
          currency: String(data.currency || "LKR"),
          duration: String(data.duration || "monthly"),
          validDays: Number(data.validDays ?? def?.validDays ?? 30),
          pickupLimit: Number(data.pickupLimit ?? def?.pickupLimit ?? 0),
          features: Array.isArray(data.features) ? data.features : (def?.features || []),
          activeRole: String(data.activeRole || def?.activeRole || ""),
          updatedAtMillis: Number(data.updatedAtMillis || 0),
        }
      })
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    setPlans(loaded)
    return loaded
  }

  const handleOpenManagePlan = (plan: PlanDoc) => {
    setEditingPlan(plan)
    setEditPrice(String(plan.price))
    setEditValidDays(String(plan.validDays))
    setManagePlanOpen(true)
  }

  const handleSavePlan = async () => {
    if (!editingPlan) return
    const priceNum = parseInt(editPrice, 10)
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast({ title: "Invalid price", description: "Enter a valid number.", variant: "destructive" })
      return
    }
    const validDaysNum = parseInt(editValidDays, 10)
    if (Number.isNaN(validDaysNum) || validDaysNum < 1) {
      toast({ title: "Invalid valid days", description: "Enter a valid number of days (1 or more).", variant: "destructive" })
      return
    }
    setSavingPlan(true)
    try {
      await updateDoc(doc(db, PLANS_COLLECTION, editingPlan.id), {
        price: priceNum,
        validDays: validDaysNum,
        updatedAtMillis: Date.now(),
      })
      setPlans((prev) =>
        prev.map((p) =>
          p.id === editingPlan.id
            ? { ...p, price: priceNum, validDays: validDaysNum, updatedAtMillis: Date.now() }
            : p,
        ),
      )
      setManagePlanOpen(false)
      setEditingPlan(null)
      toast({ title: "Plan updated", description: `${editingPlan.name} has been updated.` })
    } catch (e: any) {
      console.error("Save plan failed", e)
      toast({ title: "Save failed", description: e?.message || "Please try again.", variant: "destructive" })
    } finally {
      setSavingPlan(false)
    }
  }

  const handleReject = async (id: string) => {
    try {
      const decisionAt = Date.now()
      await updateDoc(doc(db, "submissions", id), {
        status: "rejected",
        reviewedAtMillis: decisionAt,
      })

      setConfirmations((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "rejected", reviewedAtMillis: decisionAt } : s,
        ),
      )

      toast({
        title: "Submission rejected",
        description: `Submission ${id} has been rejected.`,
        variant: "destructive",
      })
    } catch (e: any) {
      console.error("Reject failed", e)
      toast({
        title: "Reject failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const loadedPlans = await seedAndLoadPlans()
      const planNameById = new Map<string, string>(loadedPlans.map((p) => [p.id, p.name]))

      const now = Date.now()
      const last24StartMs = now - 24 * 60 * 60 * 1000

      // Users (for display + role grouping)
      const usersSnap = await getDocs(collection(db, "users"))
      const usersById = new Map<string, any>()
      usersSnap.forEach((d) => usersById.set(d.id, d.data()))

      const appUsers = Array.from(usersById.entries()).filter(([, u]) => {
        const role = String(u?.role || "")
        return role === "driver" || role === "recycler"
      })
      const resolveUserPlanId = (u: any): string | null => {
        const fromDoc = String(u?.subscriptionPlanId || u?.planId || "").trim().toLowerCase()
        if (fromDoc === "basic" || fromDoc === "premium" || fromDoc === "enterprise") return fromDoc
        return null
      }

      // Pickups (last activity)
      const pickupsSnap = await getDocs(
        query(collection(db, "pickups"), orderBy("scheduledAtMillis", "desc"), limit(3000)),
      )

      const pickups = pickupsSnap.docs.map((d) => ({ id: d.id, data: d.data() as any }))

      const latestActivityByUser = new Map<string, number>() // latest pickup/submission timestamp
      for (const p of pickups) {
        const uid = String(p.data?.userId || "")
        const ms = Number(p.data?.scheduledAtMillis || p.data?.createdAtMillis || 0)
        if (!uid || !ms) continue
        const prev = latestActivityByUser.get(uid) || 0
        if (ms > prev) latestActivityByUser.set(uid, ms)
      }

      // Include submission activity too.
      const subsSnap = await getDocs(
        query(collection(db, "submissions"), orderBy("createdAtMillis", "desc"), limit(2000)),
      )
      for (const d of subsSnap.docs) {
        const data: any = d.data()
        const uid = String(data?.userId || "")
        const ms = Number(data?.createdAtMillis || 0)
        if (!uid || !ms) continue
        const prev = latestActivityByUser.get(uid) || 0
        if (ms > prev) latestActivityByUser.set(uid, ms)
      }

      const connectedCount = appUsers.reduce((acc, [uid]) => {
        const last = latestActivityByUser.get(uid)
        if (last && last >= last24StartMs) return acc + 1
        return acc
      }, 0)

      // Connections list: derived from latest activity within 24h
      const connRows: ConnectionRow[] = appUsers.map(([uid, u]) => {
        const role = String(u?.role || "")
        const planId = resolveUserPlanId(u)
        const lastSeenAtMillis = latestActivityByUser.get(uid)
        const connectionStatus: ConnectionStatus =
          lastSeenAtMillis && lastSeenAtMillis >= last24StartMs ? "connected" : "disconnected"
        return {
          userId: uid,
          userName: String(u?.fullName || u?.name || uid),
          userRole: role,
          subscriptionPlanName: planId ? (planNameById.get(planId) || undefined) : undefined,
          connectionStatus,
          lastSeenAtMillis,
          lastSeenText: formatRelativeTime(lastSeenAtMillis),
        }
      })

      connRows.sort((a, b) => {
        if (a.connectionStatus !== b.connectionStatus) return a.connectionStatus === "connected" ? -1 : 1
        const am = a.lastSeenAtMillis || 0
        const bm = b.lastSeenAtMillis || 0
        return bm - am
      })

      setConnections(connRows)

      const rows: SubmissionRow[] = []
      for (const d of subsSnap.docs) {
        const data: any = d.data()
        const statusRaw = String(data?.status || "pending")
        const status: SubmissionStatus =
          statusRaw === "approved" ? "approved" : statusRaw === "rejected" ? "rejected" : "pending"

        const userId = String(data?.userId || "")
        const userData = usersById.get(userId)
        const userRole = String(userData?.role || "")
        const planId = resolveUserPlanId(userData)

        const categories: string[] = Array.isArray(data?.categories) ? data.categories : []
        const quantity =
          categories.length > 0
            ? `${categories.length} items`
            : data?.weightKg
              ? `${Number(data.weightKg)} kg`
              : "0"

        const itemType = categories.length ? categories.join(", ") : String(data?.type || data?.itemType || "Unknown")

        rows.push({
          id: d.id,
          userId,
          userName: String(userData?.fullName || userData?.name || ""),
          userRole,
          itemType,
          quantity,
          location: String(data?.description || ""),
          wasteType: String(categories[0] || data?.wasteType || ""),
          status,
          createdAtMillis: Number(data?.createdAtMillis || 0) || undefined,
          categories,
          weightKg: Number(data?.weightKg || 0),
          amount: Number(data?.amount || 0),
          pickupDateText: data?.pickupDateText ? String(data.pickupDateText) : undefined,
          preferredTimeText: data?.preferredTimeText ? String(data.preferredTimeText) : undefined,
          reviewedAtMillis: Number(data?.reviewedAtMillis || 0) || undefined,
          subscriptionPlanId: planId || undefined,
          subscriptionPlanName: planId ? (planNameById.get(planId) || undefined) : undefined,
        })
      }

      rows.sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0))
      setConfirmations(rows)

      const pendingCount = rows.filter((r) => r.status === "pending").length
      const planUserCounts: Record<string, number> = { basic: 0, premium: 0, enterprise: 0 }
      let activeSubscribers = 0
      for (const [, u] of appUsers) {
        const planId = resolveUserPlanId(u)
        if (planId && planId in planUserCounts) {
          planUserCounts[planId] += 1
          activeSubscribers += 1
        }
      }

      setStats({
        connectedCount,
        pendingCount,
        activeUsers: activeSubscribers,
        planUserCounts,
      })
    } catch (e) {
      console.error("SubscriptionManagement load failed", e)
      toast({
        title: "Failed to load subscriptions",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Small hack: keep stats in state without re-running expensive queries.
  // (We avoid duplicating fetch logic in each render.)
  const [stats, setStats] = useState({
    connectedCount: 0,
    pendingCount: 0,
    activeUsers: 0,
    planUserCounts: {
      basic: 0,
      premium: 0,
      enterprise: 0,
    } as Record<string, number>,
  })

  // Load on mount.
  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredConfirmations = useMemo(() => {
    if (selectedPlan === PLAN_FILTER.all) return confirmations
    if (selectedPlan === PLAN_FILTER.basic) return confirmations.filter((c) => c.subscriptionPlanId === "basic")
    if (selectedPlan === PLAN_FILTER.premium) return confirmations.filter((c) => c.subscriptionPlanId === "premium")
    if (selectedPlan === PLAN_FILTER.enterprise) return confirmations.filter((c) => c.subscriptionPlanId === "enterprise")
    return confirmations
  }, [confirmations, selectedPlan])

  const subscriptionPlansWithStats = useMemo(() => {
    return plans.map((plan) => {
      let activeUsers = 0
      activeUsers = Number(stats.planUserCounts[plan.id] || 0)
      return { ...plan, activeUsers }
    })
  }, [plans, stats.planUserCounts])

  const handleRefreshConnections = async () => {
    setRefreshingConnections(true)
    try {
      await loadAll()
    } finally {
      setRefreshingConnections(false)
    }
  }

  const formatCreatedAt = (ms?: number) => {
    if (!ms) return ""
    const d = new Date(ms)
    return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Subscription Management</h1>
        <p className="text-muted-foreground">Manage app users and review pending submissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Active Subscribers</p>
                <p className="text-2xl font-bold text-blue-900">{loading ? "…" : stats.activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Wifi className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-800">Connected Devices</p>
                <p className="text-2xl font-bold text-purple-900">{loading ? "…" : stats.connectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">Pending Confirmations</p>
                <p className="text-2xl font-bold text-orange-900">{loading ? "…" : stats.pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="connections">Mobile Connections</TabsTrigger>
          <TabsTrigger value="confirmations">Service Confirmations</TabsTrigger>
        </TabsList>

        {/* Subscription Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {loading && plans.length === 0 ? (
              <div className="col-span-3 py-8 text-center text-muted-foreground">Loading plans...</div>
            ) : (
            subscriptionPlansWithStats.map((plan) => (
              <Card
                key={plan.id}
                className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 h-full flex flex-col"
              >
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {plan.name}
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                      {plan.activeUsers} users
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 h-full">
                  <div className="text-center space-y-1">
                    <div className="text-2xl font-bold text-blue-900">
                      {plan.currency} {plan.price.toLocaleString()}
                    </div>
                    <div className="text-sm text-blue-700">per {plan.duration}</div>
                    <div className="text-xs text-blue-600">
                      Valid for {plan.validDays} days
                    </div>
                    <div className="text-xs text-blue-600">
                      Pickup limit: {plan.pickupLimit}
                    </div>
                  </div>

                  <div className="space-y-2 flex-1">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full text-white hover:bg-green-600 mt-auto"
                    onClick={() => handleOpenManagePlan(plan)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Manage Plan
                  </Button>
                </CardContent>
              </Card>
            ))
            )}
          </div>
        </TabsContent>

        {/* Mobile Connections Tab */}
        <TabsContent value="connections" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Mobile App Connections</h3>
            <Button onClick={handleRefreshConnections} variant="outline" disabled={refreshingConnections || loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {refreshingConnections ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="space-y-0">
                {connections.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No active users found.</div>
                ) : (
                  connections.slice(0, 50).map((connection) => (
                    <div key={connection.userId} className="border-b p-4 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{connection.userName}</h4>
                            <Badge variant="secondary">{connection.userRole}</Badge>
                            {connection.subscriptionPlanName && (
                              <Badge variant="outline">{connection.subscriptionPlanName}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">Last activity: {connection.lastSeenText}</p>
                        </div>

                        <div className="flex gap-2 items-center">
                          {connection.connectionStatus === "connected" ? (
                            <Wifi className="h-5 w-5 text-green-600" />
                          ) : (
                            <WifiOff className="h-5 w-5 text-red-600" />
                          )}
                          <span className="text-sm text-muted-foreground capitalize">
                            {connection.connectionStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Confirmations Tab */}
        <TabsContent value="confirmations" className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <h3 className="text-lg font-semibold">Service Confirmations</h3>
            <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as any)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PLAN_FILTER.all}>All Plans</SelectItem>
                <SelectItem value={PLAN_FILTER.basic}>Basic Plan</SelectItem>
                <SelectItem value={PLAN_FILTER.premium}>Premium Plan</SelectItem>
                <SelectItem value={PLAN_FILTER.enterprise}>Enterprise Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="space-y-0">
                {filteredConfirmations.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No confirmations found.</div>
                ) : (
                  filteredConfirmations.map((confirmation) => (
                    <div key={confirmation.id} className="border-b p-4 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">{confirmation.userName || "Unknown user"}</h4>
                            <Badge className={getStatusColor(confirmation.status)} variant="outline">
                              {getStatusIcon(confirmation.status)}
                              <span className="ml-1">{confirmation.status.toUpperCase()}</span>
                            </Badge>
                            <Badge variant="secondary">{confirmation.userRole}</Badge>
                            {confirmation.subscriptionPlanName && (
                              <Badge variant="outline">{confirmation.subscriptionPlanName}</Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground">
                            Submission ID: {confirmation.id}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {confirmation.itemType} • Qty: {confirmation.quantity}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {confirmation.location ? `Location: ${confirmation.location}` : "Location: —"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Submitted: {formatCreatedAt(confirmation.createdAtMillis)}
                          </p>
                        </div>

                        <div className="flex gap-2 items-center">
                          {confirmation.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(confirmation.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(confirmation.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}

                          {confirmation.status === "approved" && <CheckCircle className="h-5 w-5 text-green-600" />}
                          {confirmation.status === "rejected" && <XCircle className="h-5 w-5 text-red-600" />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manage Plan Dialog */}
      <Dialog open={managePlanOpen} onOpenChange={setManagePlanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Plan: {editingPlan?.name}</DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-price">Price (LKR)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  min={0}
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-valid-days">Valid (days)</Label>
                <Input
                  id="edit-valid-days"
                  type="number"
                  min={1}
                  value={editValidDays}
                  onChange={(e) => setEditValidDays(e.target.value)}
                  placeholder="e.g. 30"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setManagePlanOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan} disabled={savingPlan}>
              {savingPlan ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

