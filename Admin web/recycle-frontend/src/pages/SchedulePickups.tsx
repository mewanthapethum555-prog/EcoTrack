import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Truck, 
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Search,
  Filter
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog"
import { useEffect, useMemo, useState } from "react"
import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, updateDoc } from "firebase/firestore"
import { db } from "../firebase"
import { useToast } from "../hooks/use-toast"

// Mock data for scheduled pickups
const scheduledPickups = [
  {
    id: 1,
    customerName: "John Silva",
    phone: "+94 77 123 4567",
    address: "No. 45, Galle Road, Wadduwa",
    scheduledDate: "2024-01-22",
    scheduledTime: "09:00",
    wasteType: "Mixed Waste",
    quantity: "2 bags",
    status: "scheduled",
    assignedDriver: "Driver A",
    notes: "Customer prefers morning pickup"
  },
  {
    id: 2,
    customerName: "Maria Fernando",
    phone: "+94 71 987 6543",
    address: "Main Street, Wadduwa",
    scheduledDate: "2024-01-22",
    scheduledTime: "14:30",
    wasteType: "Recyclables",
    quantity: "1 bag",
    status: "in_progress",
    assignedDriver: "Driver B",
    notes: "Glass bottles included"
  },
  {
    id: 3,
    customerName: "David Perera",
    phone: "+94 76 555 1234",
    address: "Lake Road, Wadduwa",
    scheduledDate: "2024-01-23",
    scheduledTime: "11:00",
    wasteType: "Organic Waste",
    quantity: "3 bags",
    status: "completed",
    assignedDriver: "Driver C",
    notes: "Compost material"
  }
]

const drivers = [
  { id: 1, name: "Driver A", status: "available", phone: "+94 77 111 1111" },
  { id: 2, name: "Driver B", status: "busy", phone: "+94 77 222 2222" },
  { id: 3, name: "Driver C", status: "available", phone: "+94 77 333 3333" }
]

const wasteTypes = [
  "Mixed Waste",
  "Recyclables",
  "Organic Waste",
  "Hazardous Waste",
  "Electronic Waste",
  "Paper & Cardboard"
]

export default function SchedulePickups() {
  const { toast } = useToast()
  const [pickups, setPickups] = useState<any[]>(scheduledPickups)
  const [showNewPickupForm, setShowNewPickupForm] = useState(false)
  const [editingPickup, setEditingPickup] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [driversState, setDriversState] = useState<any[]>(drivers)
  const [loading, setLoading] = useState(true)

  const [newPickup, setNewPickup] = useState({
    customerName: "",
    phone: "",
    address: "",
    scheduledDate: "",
    scheduledTime: "",
    wasteType: "",
    quantity: "",
    notes: ""
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const toDateKey = (millis: number) => new Date(millis).toISOString().slice(0, 10)
  const toTime = (millis: number) => new Date(millis).toISOString().slice(11, 16)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const usersSnap = await getDocs(collection(db, "driver"))
        const driverRows = usersSnap.docs
          .map((d) => {
            const data: any = d.data()
            return {
              id: d.id,
              name: String(data.fullName || data.name || "Unknown Driver"),
              phone: data.phone ? String(data.phone) : "",
              status: "available",
              truck: data.truck ? String(data.truck) : "",
            }
          })
          .filter(Boolean)
        setDriversState(driverRows as any[])

        const pickupsSnap = await getDocs(
          query(collection(db, "pickups"), orderBy("scheduledAtMillis", "desc")),
        )

        const pickupRows = pickupsSnap.docs.map((d) => {
          const data: any = d.data()
          const scheduledAtMillis = Number(data.scheduledAtMillis || 0)
          const rawStatus = String(data.status || "scheduled")
          const status =
            rawStatus === "rejected" || rawStatus === "cancelled"
              ? "cancelled"
              : rawStatus === "in-progress"
                ? "in_progress"
                : rawStatus

          const items = Number(data.items || 0)
          return {
            id: d.id,
            customerName: String(data.customerName || ""),
            phone: String(data.customerPhone || ""),
            address: String(data.address || ""),
            scheduledDate: scheduledAtMillis ? toDateKey(scheduledAtMillis) : "",
            scheduledTime: scheduledAtMillis ? toTime(scheduledAtMillis) : "",
            wasteType: String(data.type || data.wasteType || ""),
            quantity: items > 0 ? `${items} items` : data.weightKg ? `${Number(data.weightKg)} kg` : "",
            status,
            assignedDriver: data.assignedDriver ? String(data.assignedDriver) : data.driver ? String(data.driver) : null,
            notes: data.notes ? String(data.notes) : "",
          }
        })

        setPickups(pickupRows as any[])
      } catch (e) {
        console.error("Failed to load schedule pickups", e)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredPickups = pickups.filter(pickup => {
    const matchesSearch = pickup.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pickup.address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || pickup.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleSubmitNewPickup = async () => {
    try {
      if (!newPickup.customerName.trim() || !newPickup.phone.trim() || !newPickup.address.trim()) {
        toast({ title: "Missing data", description: "Customer name, phone and address are required.", variant: "destructive" })
        return
      }
      if (!newPickup.scheduledDate || !newPickup.scheduledTime || !newPickup.wasteType) {
        toast({ title: "Missing data", description: "Scheduled date, time and waste type are required.", variant: "destructive" })
        return
      }

      // Resolve recycler userId using phone or full name.
      const usersSnap = await getDocs(collection(db, "users"))
      const match =
        usersSnap.docs.find((d) => String(d.data().phone || "").trim() === newPickup.phone.trim()) ||
        usersSnap.docs.find((d) => String(d.data().fullName || d.data().name || "").trim().toLowerCase() === newPickup.customerName.trim().toLowerCase())

      if (!match) {
        toast({ title: "Customer not found", description: "No user exists in `users` collection for this customer.", variant: "destructive" })
        return
      }

      const userId = match.id
      const combined = `${newPickup.scheduledDate}T${newPickup.scheduledTime}:00`
      const scheduledAtMillis = new Date(combined).getTime()
      const safeScheduledAtMillis = Number.isFinite(scheduledAtMillis) ? scheduledAtMillis : Date.now()

      const items = (() => {
        const m = newPickup.quantity.match(/(\d+(\.\d+)?)/)
        return m ? Math.max(0, Math.round(Number(m[1]))) : 0
      })()

      const docRef = doc(collection(db, "pickups"))
      await setDoc(docRef, {
        userId,
        status: "scheduled",
        address: newPickup.address.trim(),
        customerName: newPickup.customerName.trim(),
        customerPhone: newPickup.phone.trim(),
        type: newPickup.wasteType,
        weightKg: 0,
        items,
        amount: 0,
        scheduledAtMillis: safeScheduledAtMillis,
        createdAtMillis: Date.now(),
        notes: newPickup.notes || "",
        assignedDriver: null,
      })

      setPickups((prev) => [
        {
          id: docRef.id,
          customerName: newPickup.customerName.trim(),
          phone: newPickup.phone.trim(),
          address: newPickup.address.trim(),
          scheduledDate: newPickup.scheduledDate,
          scheduledTime: newPickup.scheduledTime,
          wasteType: newPickup.wasteType,
          quantity: items > 0 ? `${items} items` : newPickup.quantity,
          status: "scheduled",
          assignedDriver: null,
          notes: newPickup.notes || "",
        },
        ...prev,
      ])

      setNewPickup({
        customerName: "",
        phone: "",
        address: "",
        scheduledDate: "",
        scheduledTime: "",
        wasteType: "",
        quantity: "",
        notes: "",
      })
      setShowNewPickupForm(false)
      toast({ title: "Pickup scheduled", description: "Pickup saved to Firestore." })
    } catch (e) {
      console.error("Schedule pickup failed", e)
      toast({ title: "Failed to schedule", description: "Please try again.", variant: "destructive" })
    }
  }

  const handleEditPickup = (pickup: any) => {
    setEditingPickup(pickup)
    setNewPickup({
      customerName: pickup.customerName,
      phone: pickup.phone,
      address: pickup.address,
      scheduledDate: pickup.scheduledDate,
      scheduledTime: pickup.scheduledTime,
      wasteType: pickup.wasteType,
      quantity: pickup.quantity,
      notes: pickup.notes
    })
  }

  const handleUpdatePickup = async () => {
    if (!editingPickup) return
    try {
      const combined = `${newPickup.scheduledDate}T${newPickup.scheduledTime}:00`
      const scheduledAtMillis = new Date(combined).getTime()
      const safeScheduledAtMillis = Number.isFinite(scheduledAtMillis) ? scheduledAtMillis : Date.now()

      const items = (() => {
        const m = newPickup.quantity.match(/(\d+(\.\d+)?)/)
        return m ? Math.max(0, Math.round(Number(m[1]))) : 0
      })()

      const statusForFirestore =
        editingPickup.status === "cancelled"
          ? "rejected"
          : editingPickup.status

      await updateDoc(doc(db, "pickups", editingPickup.id), {
        address: newPickup.address.trim(),
        customerName: newPickup.customerName.trim(),
        customerPhone: newPickup.phone.trim(),
        type: newPickup.wasteType,
        items,
        weightKg: 0,
        scheduledAtMillis: safeScheduledAtMillis,
        notes: newPickup.notes || "",
        status: statusForFirestore,
      })

      setPickups((prev) =>
        prev.map((pickup) =>
          pickup.id === editingPickup.id
            ? {
                ...pickup,
                customerName: newPickup.customerName.trim(),
                phone: newPickup.phone.trim(),
                address: newPickup.address.trim(),
                scheduledDate: newPickup.scheduledDate,
                scheduledTime: newPickup.scheduledTime,
                wasteType: newPickup.wasteType,
                quantity: items > 0 ? `${items} items` : newPickup.quantity,
                notes: newPickup.notes || "",
              }
            : pickup,
        ),
      )

      setEditingPickup(null)
      setNewPickup({
        customerName: "",
        phone: "",
        address: "",
        scheduledDate: "",
        scheduledTime: "",
        wasteType: "",
        quantity: "",
        notes: "",
      })
      setShowNewPickupForm(false)
      toast({ title: "Pickup updated", description: "Changes saved." })
    } catch (e) {
      console.error("Update pickup failed", e)
      toast({ title: "Failed to update pickup", description: "Please try again.", variant: "destructive" })
    }
  }

  const handleDeletePickup = async (id: string) => {
    try {
      await deleteDoc(doc(db, "pickups", id))
      setPickups((prev) => prev.filter((pickup) => pickup.id !== id))
      toast({ title: "Deleted", description: "Pickup removed." })
    } catch (e) {
      console.error("Delete pickup failed", e)
      toast({ title: "Failed to delete", description: "Please try again.", variant: "destructive" })
    }
  }

  const handleAssignDriver = async (pickupId: string, driverId: string) => {
    try {
      const driver = driversState.find(d => d.id === driverId)
      const driverName = driver ? driver.name : "Unknown Driver"

      await updateDoc(doc(db, "pickups", pickupId), {
        assignedDriverId: driverId,
        driverId: driverId,
        assignedDriver: driverName,
        driver: driverName,
        status: "in_progress",
      })
      setPickups((prev) =>
        prev.map((pickup) =>
          pickup.id === pickupId ? { ...pickup, assignedDriver: driverName, status: "in_progress" } : pickup,
        ),
      )
      toast({ title: "Driver assigned", description: "Pickup updated." })
    } catch (e) {
      console.error("Assign driver failed", e)
      toast({ title: "Failed to assign driver", description: "Please try again.", variant: "destructive" })
    }
  }

  const handleCompletePickup = async (pickupId: string) => {
    try {
      await updateDoc(doc(db, "pickups", pickupId), { status: "completed" })
      setPickups((prev) => prev.map((pickup) => (pickup.id === pickupId ? { ...pickup, status: "completed" } : pickup)))
      toast({ title: "Pickup completed", description: "Status updated." })
    } catch (e) {
      console.error("Complete pickup failed", e)
      toast({ title: "Failed to complete", description: "Please try again.", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Schedule Pickups</h1>
        <p className="text-muted-foreground">
          Manage scheduled waste pickups and coordinate with drivers
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Scheduled</p>
                <p className="text-2xl font-bold text-blue-900">
                  {pickups.filter(p => p.status === "scheduled").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">In Progress</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {pickups.filter(p => p.status === "in_progress").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-100 to-green-200 border-green-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Completed</p>
                <p className="text-2xl font-bold text-green-900">
                  {pickups.filter(p => p.status === "completed").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-800">Total Today</p>
                <p className="text-2xl font-bold text-purple-900">
                  {pickups.filter(p => p.scheduledDate === new Date().toISOString().split('T')[0]).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-4">
          <Button 
            onClick={() => setShowNewPickupForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule New Pickup
          </Button>
        </div>
        
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pickups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* New Pickup Form */}
      {showNewPickupForm && (
        <Card className="bg-gradient-to-br from-green-100 to-green-200 border-green-300">
          <CardHeader>
            <CardTitle>{editingPickup ? "Edit Pickup" : "Schedule New Pickup"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Customer Name</label>
                <Input
                  value={newPickup.customerName}
                  onChange={(e) => setNewPickup(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  value={newPickup.phone}
                  onChange={(e) => setNewPickup(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input
                value={newPickup.address}
                onChange={(e) => setNewPickup(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter complete address"
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Scheduled Date</label>
                <Input
                  type="date"
                  value={newPickup.scheduledDate}
                  onChange={(e) => setNewPickup(prev => ({ ...prev, scheduledDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Scheduled Time</label>
                <Input
                  type="time"
                  value={newPickup.scheduledTime}
                  onChange={(e) => setNewPickup(prev => ({ ...prev, scheduledTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Waste Type</label>
                <Select onValueChange={(value) => setNewPickup(prev => ({ ...prev, wasteType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select waste type" />
                  </SelectTrigger>
                  <SelectContent>
                    {wasteTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Quantity</label>
              <Input
                value={newPickup.quantity}
                onChange={(e) => setNewPickup(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="e.g., 2 bags, 1 container"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={newPickup.notes}
                onChange={(e) => setNewPickup(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes or special instructions"
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={editingPickup ? handleUpdatePickup : handleSubmitNewPickup} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editingPickup ? "Update Pickup" : "Schedule Pickup"}
              </Button>
              <Button variant="outline" onClick={() => {
                setShowNewPickupForm(false)
                setEditingPickup(null)
                setNewPickup({
                  customerName: "",
                  phone: "",
                  address: "",
                  scheduledDate: "",
                  scheduledTime: "",
                  wasteType: "",
                  quantity: "",
                  notes: ""
                })
              }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pickups List */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Pickups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPickups.map((pickup) => (
              <div key={pickup.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{pickup.customerName}</h3>
                      <Badge className={getStatusColor(pickup.status)}>
                        {pickup.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{pickup.wasteType} • {pickup.quantity}</p>
                    <p className="text-sm text-muted-foreground">
                      {pickup.scheduledDate} at {pickup.scheduledTime}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditPickup(pickup)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDeletePickup(pickup.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{pickup.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{pickup.phone}</span>
                    </div>
                  </div>
                  
                  <div>
                    {pickup.notes && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Notes:</span> {pickup.notes}
                      </p>
                    )}
                    {pickup.assignedDriver && (
                      <p className="text-sm mt-1">
                        <span className="font-medium">Assigned Driver:</span> {pickup.assignedDriver}
                      </p>
                    )}
                  </div>
                </div>
                
                {pickup.status === "scheduled" && (
                  <div className="flex gap-2">
                    <Select onValueChange={(value) => handleAssignDriver(pickup.id, value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Assign Driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {driversState.filter(d => d.status === "available").map((driver: any) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name} - {driver.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {pickup.status === "in_progress" && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleCompletePickup(pickup.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Complete
                    </Button>
                  </div>
                )}
              </div>
            ))}
            
            {filteredPickups.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No pickups found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
