import { useEffect, useMemo, useState } from "react"
import { 
  Search, 
  Filter, 
  Eye, 
  Check, 
  X, 
  MoreHorizontal,
  Calendar,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Upload
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Checkbox } from "../components/ui/checkbox"
import { Textarea } from "../components/ui/textarea"
import { useToast } from "../hooks/use-toast"
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore"
import { db } from "../firebase"

type SubmissionStatus = "pending" | "approved" | "rejected"

type SubmissionRow = {
  id: string
  userId: string
  user: string
  email: string
  location: string
  itemType: string
  quantity: string
  submittedAt: string
  status: SubmissionStatus
  images: string[]
  estimatedWeight: string
  notes: string
  pickupDateText?: string
  preferredTimeText?: string
  categories?: string[]
  weightKg?: number
  createdAtMillis?: number
  reviewedAtMillis?: number
}

export default function ItemReviews() {
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const { toast } = useToast()
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [loading, setLoading] = useState(true)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-warning/10 text-warning border-warning/20"
      case "approved": return "bg-success/10 text-success border-success/20" 
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/20"
      default: return "bg-muted/10 text-muted-foreground border-border"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <AlertCircle className="h-3 w-3" />
      case "approved": return <CheckCircle2 className="h-3 w-3" />
      case "rejected": return <XCircle className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  const formatDateTime = (millis: number) => {
    if (!millis) return ""
    const d = new Date(millis)
    return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`
  }

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

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "approved", reviewedAtMillis: decisionAt } : s,
        ),
      )

      toast({
        title: "Item Approved",
        description: `Submission ${id} approved and pickup scheduled.`,
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

  const handleReject = async (id: string) => {
    try {
      const decisionAt = Date.now()
      await updateDoc(doc(db, "submissions", id), {
        status: "rejected",
        reviewedAtMillis: decisionAt,
      })
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "rejected", reviewedAtMillis: decisionAt } : s,
        ),
      )
      toast({
        title: "Item Rejected",
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

  const handleBatchAction = async (action: string) => {
    try {
      if (action === "Approved") {
        await Promise.all(selectedItems.map((id) => handleApprove(id)))
      } else {
        await Promise.all(selectedItems.map((id) => handleReject(id)))
      }
      toast({
        title: `Batch ${action}`,
        description: `${selectedItems.length} submission(s) updated.`,
      })
    } finally {
      setSelectedItems([])
    }
  }

  useEffect(() => {
    const loadSubmissions = async () => {
      setLoading(true)
      try {
        // Resolve user profile details once.
        const usersSnap = await getDocs(collection(db, "users"))
        const userMap = new Map<string, any>()
        usersSnap.forEach((d) => userMap.set(d.id, d.data()))

        const subsSnap = await getDocs(collection(db, "submissions"))
        const rows: SubmissionRow[] = subsSnap.docs.map((d) => {
          const data: any = d.data()
          const userId = String(data.userId || "")
          const userData: any = userMap.get(userId)

          const categories: string[] = Array.isArray(data.categories) ? data.categories : []
          const itemType = categories.length ? categories.join(", ") : String(data.type || data.itemType || "")
          const quantity =
            categories.length > 0
              ? `${categories.length} items`
              : data.weightKg
                ? `${Number(data.weightKg)} kg`
                : "0"

          const statusRaw = String(data.status || "pending")
          const status: SubmissionStatus =
            statusRaw === "approved" ? "approved" : statusRaw === "rejected" ? "rejected" : "pending"

          const createdAtMillis = Number(data.createdAtMillis || 0)
          const reviewedAtMillis = Number(data.reviewedAtMillis || 0)
          const pickupDateText = data.pickupDateText ? String(data.pickupDateText) : ""
          const preferredTimeText = data.preferredTimeText ? String(data.preferredTimeText) : ""
          const submittedAt =
            createdAtMillis > 0
              ? formatDateTime(createdAtMillis)
              : pickupDateText && preferredTimeText
                ? `${pickupDateText} ${preferredTimeText}`
                : ""

          const imageUri = data.imageUri ? String(data.imageUri) : ""

          return {
            id: d.id,
            userId,
            user: String(userData?.fullName || userData?.name || ""),
            email: String(userData?.email || ""),
            location: String(data.description || ""),
            itemType: itemType || "Unknown",
            quantity,
            submittedAt,
            status,
            images: imageUri ? [imageUri] : [],
            estimatedWeight: data.weightKg !== undefined ? `${data.weightKg} kg` : "0 kg",
            notes: String(data.description || data.notes || ""),
            pickupDateText: pickupDateText || undefined,
            preferredTimeText: preferredTimeText || undefined,
            categories,
            weightKg: Number(data.weightKg || 0),
            createdAtMillis: createdAtMillis || undefined,
            reviewedAtMillis: reviewedAtMillis || undefined,
          }
        })

        setSubmissions(rows)
      } catch (e) {
        console.error("Failed to load submissions", e)
        toast({
          title: "Failed to load submissions",
          description: "Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadSubmissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast])

  const filteredSubmissions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return submissions.filter((item) => {
      const matchesStatus = filterStatus === "all" || item.status === filterStatus
      const matchesSearch =
        item.user.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.itemType.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term)
      return matchesStatus && (term ? matchesSearch : true)
    })
  }, [filterStatus, searchTerm, submissions])

  const todayKey = new Date().toISOString().slice(0, 10)

  const pendingReviews = submissions.filter((s) => s.status === "pending").length
  const approvedToday = submissions.filter((s) => {
    if (s.status !== "approved") return false
    if (!s.createdAtMillis) return false
    return new Date(s.createdAtMillis).toISOString().slice(0, 10) === todayKey
  }).length
  const rejectedToday = submissions.filter((s) => {
    if (s.status !== "rejected") return false
    if (!s.createdAtMillis) return false
    return new Date(s.createdAtMillis).toISOString().slice(0, 10) === todayKey
  }).length

  const avgReviewMinutes = (() => {
    const decisions = submissions.filter((s) => {
      if (s.status !== "approved" && s.status !== "rejected") return false
      return (s.createdAtMillis || 0) > 0 && (s.reviewedAtMillis || 0) > 0
    })

    if (decisions.length === 0) return null
    const totalMs = decisions.reduce((sum, s) => sum + ((s.reviewedAtMillis || 0) - (s.createdAtMillis || 0)), 0)
    const avgMs = totalMs / decisions.length
    return avgMs / 60000
  })()

  const formattedAvgReviewTime = avgReviewMinutes == null ? "—" : avgReviewMinutes < 60 ? `${avgReviewMinutes.toFixed(1)}m` : `${(avgReviewMinutes / 60).toFixed(1)}h`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Item Reviews</h1>
          <p className="text-muted-foreground">Review and approve recyclable item submissions</p>
        </div>
      </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-warning/90 shadow-elevated border-warning/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/90">Pending Reviews</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? "…" : pendingReviews}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-forest shadow-elevated border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/90">Approved Today</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? "…" : approvedToday}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-destructive/90 shadow-card border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <XCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/90">Rejected Today</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? "…" : rejectedToday}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-eco shadow-eco border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/90">Avg Review Time</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? "…" : formattedAvgReviewTime}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, item type, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedItems.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedItems.length} item(s) selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleBatchAction("Approved")}>
                  <Check className="h-4 w-4 mr-2" />
                  Approve Selected
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBatchAction("Rejected")}>
                  <X className="h-4 w-4 mr-2" />
                  Reject Selected
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedItems.length === filteredSubmissions.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedItems(filteredSubmissions.map(item => item.id))
                      } else {
                        setSelectedItems([])
                      }
                    }}
                  />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Item Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No submissions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedItems.includes(submission.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItems([...selectedItems, submission.id])
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== submission.id))
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{submission.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{submission.user}</div>
                        <div className="text-sm text-muted-foreground">{submission.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{submission.itemType}</TableCell>
                    <TableCell>{submission.quantity}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {submission.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {submission.submittedAt}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(submission.status)}>
                        {getStatusIcon(submission.status)}
                        <span className="ml-1 capitalize">{submission.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Review Submission {submission.id}</DialogTitle>
                            </DialogHeader>
                            {selectedSubmission && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">User</label>
                                    <p>{selectedSubmission.user}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Item Type</label>
                                    <p>{selectedSubmission.itemType}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Quantity</label>
                                    <p>{selectedSubmission.quantity}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Estimated Weight</label>
                                    <p>{selectedSubmission.estimatedWeight}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium">Images</label>
                                  <div className="grid grid-cols-3 gap-2 mt-1">
                                    {selectedSubmission.images.map((img: string, idx: number) => (
                                      <img key={idx} src={img} alt={`Item ${idx + 1}`} className="w-full h-24 object-cover rounded-lg border" />
                                    ))}
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium">Notes</label>
                                  <p className="text-sm text-muted-foreground">{selectedSubmission.notes}</p>
                                </div>

                                <div>
                                  <label className="text-sm font-medium">Admin Notes</label>
                                  <Textarea placeholder="Add review notes..." className="mt-1" />
                                </div>
                                
                                <div className="flex gap-2 pt-4">
                                  <Button onClick={() => handleApprove(selectedSubmission.id)} className="flex-1">
                                    <Check className="h-4 w-4 mr-2" />
                                    Approve
                                  </Button>
                                  <Button variant="outline" onClick={() => handleReject(selectedSubmission.id)} className="flex-1">
                                    <X className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        {submission.status === "pending" && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleApprove(submission.id)}
                            >
                              <Check className="h-4 w-4 text-success" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleReject(submission.id)}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}