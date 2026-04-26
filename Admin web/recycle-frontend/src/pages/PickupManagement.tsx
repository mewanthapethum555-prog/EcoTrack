import { useEffect, useMemo, useState } from "react"
import { 
  Calendar,
  Clock,
  MapPin,
  Truck,
  User,
  Phone,
  Check,
  X,
  Search,
  Filter,
  MoreHorizontal,
  Navigation,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { useToast } from "../hooks/use-toast"
import { collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore"
import { db } from "../firebase"

type PickupStatus = "scheduled" | "in_progress" | "completed" | "rejected"

type PickupRow = {
  id: string
  customerName: string
  customerPhone: string
  address: string
  type: string
  items: number
  weightKg: number
  amount: number
  scheduledAtMillis: number
  status: PickupStatus
  // Optional fields (in case your Firestore docs include them)
  driverId?: string
  driverUid?: string
  driver?: string
  truck?: string
  priority?: string
  notes?: string
}

type DriverRow = {
  id: string
  name: string
  phone: string
  truck?: string
  status?: string
}

export default function PickupManagement() {
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const { toast } = useToast()
  const [pickups, setPickups] = useState<PickupRow[]>([])
  const [drivers, setDrivers] = useState<DriverRow[]>([])
  const [loading, setLoading] = useState(true)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-primary/10 text-primary border-primary/20"
      case "in_progress":
      case "in-progress":
        return "bg-warning/10 text-warning border-warning/20"
      case "completed":
        return "bg-success/10 text-success border-success/20"
      case "rejected":
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20"
      default: return "bg-muted/10 text-muted-foreground border-border"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-destructive/10 text-destructive border-destructive/20"
      case "normal": return "bg-muted/10 text-muted-foreground border-border" 
      case "low": return "bg-success/10 text-success border-success/20"
      default: return "bg-muted/10 text-muted-foreground border-border"
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const pickupsSnap = await getDocs(
          query(collection(db, "pickups"), orderBy("scheduledAtMillis", "desc")),
        )

        const rows: PickupRow[] = pickupsSnap.docs.map((d) => {
          const data: any = d.data()
          const rawStatus: string = String(data.status || "")
          const status: PickupStatus =
            rawStatus === "in-progress"
              ? "in_progress"
              : rawStatus === "cancelled"
                ? "rejected"
                : (rawStatus as PickupStatus)

          return {
            id: d.id,
            customerName: String(data.customerName || ""),
            customerPhone: String(data.customerPhone || ""),
            address: String(data.address || ""),
            type: String(data.type || ""),
            items: Number(data.items || 0),
            weightKg: Number(data.weightKg || 0),
            amount: Number(data.amount || 0),
            scheduledAtMillis: Number(data.scheduledAtMillis || 0),
            status:
              status === "scheduled" ||
              status === "in_progress" ||
              status === "completed" ||
              status === "rejected"
                ? status
                : "scheduled",
            driverId: data.driverId ? String(data.driverId) : undefined,
            driverUid: data.driverUid ? String(data.driverUid) : undefined,
            driver: data.driver ? String(data.driver) : undefined,
            truck: data.truck ? String(data.truck) : undefined,
            priority: data.priority ? String(data.priority) : undefined,
            notes: data.notes ? String(data.notes) : undefined,
          }
        })

        // Driver Management tab: load drivers from Android app `driver` collection
        const usersSnap = await getDocs(collection(db, "driver"))
        const driverRows: DriverRow[] = usersSnap.docs
          .map((d) => {
            const data: any = d.data()
            return {
              id: d.id,
              name: String(data.fullName || data.name || "Unknown Driver"),
              phone: String(data.phone || ""),
              truck: data.truck ? String(data.truck) : undefined,
              status: data.status ? String(data.status) : undefined,
            }
          })
          .filter(Boolean) as DriverRow[]

        setPickups(rows)
        setDrivers(driverRows)
      } catch (e) {
        console.error("Failed to load pickups", e)
        toast({
          title: "Failed to load pickups",
          description: "Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [toast])

  const filteredPickups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return pickups.filter((pickup) => {
      const matchesStatus = filterStatus === "all" || pickup.status === filterStatus

      const scheduledDate =
        pickup.scheduledAtMillis > 0
          ? new Date(pickup.scheduledAtMillis).toISOString().slice(0, 10)
          : ""
      const matchesDate = !selectedDate || selectedDate === scheduledDate

      const matchesSearch =
        pickup.customerName.toLowerCase().includes(term) ||
        pickup.customerPhone.toLowerCase().includes(term) ||
        pickup.address.toLowerCase().includes(term) ||
        pickup.id.toLowerCase().includes(term) ||
        pickup.type.toLowerCase().includes(term)

      return matchesStatus && matchesDate && matchesSearch
    })
  }, [filterStatus, pickups, searchTerm, selectedDate])

  const handleStatusUpdate = async (pickupId: string, newStatus: PickupStatus) => {
    try {
      await updateDoc(doc(db, "pickups", pickupId), { status: newStatus })
      setPickups((prev) => prev.map((p) => (p.id === pickupId ? { ...p, status: newStatus } : p)))
      toast({
        title: "Status Updated",
        description: `Pickup ${pickupId} status changed to ${newStatus.replace("_", " ")}.`,
      })
    } catch (e) {
      console.error("Failed to update pickup status", e)
      toast({
        title: "Failed to update status",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDriverAssign = async (pickupId: string, driverId: string) => {
    try {
      const pickup = pickups.find((p) => p.id === pickupId)
      if (pickup?.status === "completed") {
        toast({
          title: "Driver can't be changed",
          description: "This pickup is already completed.",
          variant: "destructive",
        })
        return
      }

      if (driverId === "unassigned") {
        await updateDoc(doc(db, "pickups", pickupId), { driverId: "", driverUid: "", driver: "", assignedDriverId: "", truck: "" })
        setPickups((prev) => prev.map((p) => (p.id === pickupId ? { ...p, driverId: undefined, driverUid: undefined, driver: undefined, truck: undefined } : p)))
        toast({
          title: "Driver Unassigned",
          description: `Removed driver from pickup ${pickupId}.`,
        })
      } else {
        const selectedDriver = drivers.find(d => d.id === driverId)
        await updateDoc(doc(db, "pickups", pickupId), { 
          driverId: driverId, 
          driverUid: driverId, 
          assignedDriverId: driverId,
          driver: selectedDriver?.name || "", 
          truck: selectedDriver?.truck || "" 
        })
        setPickups((prev) => prev.map((p) => (p.id === pickupId ? { ...p, driverId, driverUid: driverId, driver: selectedDriver?.name, truck: selectedDriver?.truck } : p)))
        toast({
          title: "Driver Assigned",
          description: `Assigned ${selectedDriver?.name || "driver"} to pickup ${pickupId}.`,
        })
      }
    } catch (e) {
      console.error("Failed to assign driver", e)
      toast({
        title: "Failed to assign driver",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pickup Management</h1>
          <p className="text-muted-foreground">Schedule and manage recycling pickups</p>
        </div>
        <div />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-eco shadow-eco border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/90">Today's Pickups</p>
                <p className="text-2xl font-bold text-white">
                  {loading
                    ? "…"
                    : filteredPickups.filter((p) => {
                        const d = p.scheduledAtMillis
                        if (!d) return false
                        return new Date(d).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
                      }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-warning/90 shadow-elevated border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/90">In Progress</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? "…" : filteredPickups.filter((p) => p.status === "in_progress").length}
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
                <p className="text-sm text-white/90">Completed</p>
                <p className="text-2xl font-bold text-white">
                  {loading ? "…" : filteredPickups.filter((p) => p.status === "completed").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/90 shadow-card border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/90">Overdue</p>
                <p className="text-2xl font-bold text-white">
                  {loading
                    ? "…"
                    : filteredPickups.filter((p) => p.status === "rejected").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pickups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pickups">Pickup Schedule</TabsTrigger>
          <TabsTrigger value="drivers">Driver Management</TabsTrigger>
          <TabsTrigger value="routes">Route Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="pickups" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search pickups..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-48"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Pickups Table */}
          <Card>
            <CardHeader>
              <CardTitle>Pickup Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Scheduled Time</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPickups.map((pickup) => (
                    <TableRow key={pickup.id}>
                      <TableCell className="font-medium">{pickup.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{pickup.customerName}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {pickup.customerPhone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{pickup.address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{pickup.type}</div>
                          <div className="text-sm text-muted-foreground">
                            {pickup.items > 0 ? `${pickup.items} items` : pickup.weightKg > 0 ? `${pickup.weightKg} kg` : "—"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {pickup.scheduledAtMillis
                            ? new Date(pickup.scheduledAtMillis).toLocaleString()
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={pickup.driverId || "unassigned"}
                          onValueChange={(value) => handleDriverAssign(pickup.id, value)}
                        >
                          <SelectTrigger
                            className="w-32 h-8"
                            disabled={pickup.status === "completed"}
                          >
                            <SelectValue placeholder="Assign Driver" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {drivers.map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Truck className="h-3 w-3" />
                          {pickup.truck || "No truck"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(pickup.status)}>
                          {pickup.status === "in_progress"
                            ? "In Progress"
                            : pickup.status.charAt(0).toUpperCase() + pickup.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Navigation className="h-4 w-4" />
                          </Button>
                          <Select
                            value={pickup.status}
                            onValueChange={(value) => handleStatusUpdate(pickup.id, value as PickupStatus)}
                          >
                            <SelectTrigger className="w-24 h-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Complete</SelectItem>
                              <SelectItem value="rejected">Reject</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Driver Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {drivers.map((driver) => (
                  <Card key={driver.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-forest rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{driver.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {driver.truck || "—"}
                          </div>
                          <Badge className={driver.status === "available" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}>
                            {driver.status || "—"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {drivers.length === 0 && !loading && (
                  <div className="text-muted-foreground col-span-3 text-center py-6">
                    No drivers found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Route Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Interactive route map would be displayed here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}