import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { toast } from "../../hooks/use-toast"
import { 
  FileCheck, 
  Truck, 
  Route, 
  UserPlus, 
  ArrowRight,
  Camera,
  CheckCircle,
  XCircle
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore"
import { db } from "../../firebase"

type PendingPhotoApproval = {
  id: string
  userId: string
  customerName: string
  photoUrl: string
  detectedWaste: string
  confidence?: number
  location: string
  timestamp: string
}

function formatTimestamp(millis?: number) {
  if (!millis) return ""
  const d = new Date(millis)
  const yyyy = d.toISOString().slice(0, 10)
  const hhmm = d.toISOString().slice(11, 16)
  return `${yyyy} ${hhmm}`
}

function PhotoApprovalDialog({
  approvals,
  loading,
  onApprove,
  onReject,
}: {
  approvals: PendingPhotoApproval[]
  loading: boolean
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  return (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Photo Detection Approval</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading pending approvals...</div>
        ) : approvals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No pending photo approvals</div>
        ) : (
          approvals.map((approval) => (
            <div key={approval.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{approval.customerName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {approval.location} • {approval.timestamp}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onApprove(approval.id)}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReject(approval.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <img
                    src={approval.photoUrl}
                    alt="Waste photo"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">AI Detection Result:</label>
                    <p className="text-sm text-muted-foreground">{approval.detectedWaste}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Confidence Level:</label>
                    {typeof approval.confidence === "number" && Number.isFinite(approval.confidence) ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-secondary rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              approval.confidence! > 0.7
                                ? "bg-green-500"
                                : approval.confidence! > 0.5
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${approval.confidence! * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(approval.confidence! * 100)}%
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {typeof approval.confidence === "number" &&
                      Number.isFinite(approval.confidence) &&
                      approval.confidence! < 0.6 &&
                      "⚠️ Low confidence detection - manual review recommended"}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DialogContent>
  )
}

export function QuickActions() {
  const [photoApprovals, setPhotoApprovals] = useState<PendingPhotoApproval[]>([])
  const [loadingApprovals, setLoadingApprovals] = useState(true)
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0)

  const loadPhotoApprovals = async () => {
    setLoadingApprovals(true)
    try {
      const usersSnap = await getDocs(collection(db, "users"))
      const userMap = new Map<string, any>()
      usersSnap.forEach((d) => userMap.set(d.id, d.data()))

      const subsSnap = await getDocs(query(collection(db, "submissions"), where("status", "==", "pending")))
      setPendingReviewsCount(subsSnap.size)

      const approvals: PendingPhotoApproval[] = []
      subsSnap.forEach((d) => {
        const data: any = d.data()
        const imageUri = data.imageUri ? String(data.imageUri) : ""
        if (!imageUri) return

        const userId = String(data.userId || "")
        const userData: any = userMap.get(userId)

        const categories: string[] = Array.isArray(data.categories) ? data.categories : []
        const detectedWaste =
          categories.length > 0
            ? String(categories[0])
            : String(data.type || data.itemType || data.description || "Unknown")

        const confidenceRaw = data.confidence ?? data.confidenceLevel
        const confidence =
          confidenceRaw === undefined || confidenceRaw === null ? undefined : Number(confidenceRaw)

        const location = String(data.address || data.location || data.description || "")
        const createdAtMillis = Number(data.createdAtMillis || 0)

        approvals.push({
          id: d.id,
          userId,
          customerName: String(userData?.fullName || userData?.name || "Unknown"),
          photoUrl: imageUri,
          detectedWaste,
          confidence: typeof confidence === "number" && Number.isFinite(confidence) ? confidence : undefined,
          location,
          timestamp: formatTimestamp(createdAtMillis),
        })
      })

      approvals.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      setPhotoApprovals(approvals)
    } catch (e) {
      console.error("Failed to load photo approvals", e)
      toast({
        title: "Failed to load photo approvals",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingApprovals(false)
    }
  }

  useEffect(() => {
    loadPhotoApprovals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleApprove = async (id: string) => {
    try {
      const subSnap = await getDoc(doc(db, "submissions", id))
      if (!subSnap.exists()) throw new Error("Submission not found")

      const data: any = subSnap.data()
      const userId = String(data.userId || "")
      const categories: string[] = Array.isArray(data.categories) ? data.categories : []

      // Approve submission first.
      const decisionAt = Date.now()
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

      // Create pickup document so Android app can display it in `pickups`.
      await setDoc(
        doc(db, "pickups", id),
        {
          userId,
          status: "scheduled",
          approved: true,
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

      setPhotoApprovals((prev) => prev.filter((p) => p.id !== id))
      setPendingReviewsCount((prev) => Math.max(0, prev - 1))

      toast({
        title: "Photo Approved",
        description: "Submission approved and pickup scheduled.",
      })
    } catch (e: any) {
      console.error("Approve photo failed", e)
      toast({
        title: "Approve failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (id: string) => {
    try {
      const decisionAt = Date.now()
      await updateDoc(doc(db, "submissions", id), {
        status: "rejected",
        reviewedAtMillis: decisionAt,
      })

      setPhotoApprovals((prev) => prev.filter((p) => p.id !== id))
      setPendingReviewsCount((prev) => Math.max(0, prev - 1))

      toast({
        title: "Photo Rejected",
        description: "Submission rejected.",
      })
    } catch (e: any) {
      console.error("Reject photo failed", e)
      toast({
        title: "Reject failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const quickActions = [
    {
      title: "Review Pending Items",
      description: "Pending items need approval",
      icon: FileCheck,
      badge: loadingApprovals ? "…" : String(pendingReviewsCount),
      badgeVariant: "warning" as const,
      href: "/reviews",
    },
    {
      title: "Photo Detection Approval",
      description: "Pending photos need manual review",
      icon: Camera,
      badge: loadingApprovals ? "…" : String(photoApprovals.length),
      badgeVariant: "destructive" as const,
      href: null as string | null,
      isDialog: true as const,
    },
    {
      title: "Schedule Pickup",
      description: "Add new pickup location",
      icon: Truck,
      badge: null as string | null,
      badgeVariant: null as any,
      href: "/schedule-pickups",
    },
    {
      title: "Optimize Routes",
      description: "Plan tomorrow's routes",
      icon: Route,
      badge: null as string | null,
      badgeVariant: null as any,
      href: "/routes",
    },
  ]

  return (
    <Card className="bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-300">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {quickActions.map((action) => {
          if (action.isDialog) {
            return (
              <Dialog key={action.title}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto p-4 group hover:bg-gradient-eco/5 hover:border-primary/20 border border-transparent"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <action.icon className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{action.title}</p>
                          {action.badge && (
                            <Badge 
                              variant={action.badgeVariant === "warning" ? "outline" : action.badgeVariant}
                              className={
                                action.badgeVariant === "warning" 
                                  ? "bg-warning/10 text-warning border-warning/20"
                                  : ""
                              }
                            >
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </Button>
                </DialogTrigger>
                <PhotoApprovalDialog
                  approvals={photoApprovals}
                  loading={loadingApprovals}
                  onApprove={(id) => void handleApprove(id)}
                  onReject={(id) => void handleReject(id)}
                />
              </Dialog>
            )
          }

          return (
            <Button
              key={action.title}
              variant="ghost"
              className="w-full justify-start h-auto p-4 group hover:bg-gradient-eco/5 hover:border-primary/20 border border-transparent"
              asChild
            >
              <a href={action.href}>
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{action.title}</p>
                      {action.badge && (
                        <Badge 
                          variant={action.badgeVariant === "warning" ? "outline" : action.badgeVariant}
                          className={
                            action.badgeVariant === "warning" 
                              ? "bg-warning/10 text-warning border-warning/20"
                              : ""
                          }
                        >
                          {action.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </a>
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}