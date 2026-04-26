import { useEffect, useState } from "react"
import { 
  Users,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  CreditCard,
  Settings,
  Eye,
  Edit,
  UserCheck,
  UserX,
  Award
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import { Checkbox } from "../components/ui/checkbox"
import { useToast } from "../hooks/use-toast"
import { collection, getDocs, updateDoc, doc } from "firebase/firestore"
import { db } from "../firebase"

type UserRow = {
  id: string
  name: string
  email: string
  phone: string
  address: string
  joinDate: string
  status: "active" | "inactive" | "suspended"
  tier: "gold" | "silver" | "bronze" | "none"
  totalPickups: number
  totalRecycled: string
  rewardPoints: number
  avatar: string
}

const mockTransactions = [
  {
    id: "T001",
    userId: "U001",
    type: "reward_earned",
    amount: "+150 points",
    description: "Plastic recycling pickup",
    date: "2024-01-20"
  },
  {
    id: "T002",
    userId: "U001", 
    type: "reward_redeemed",
    amount: "-500 points",
    description: "Gift card redemption",
    date: "2024-01-18"
  }
]

export default function UserManagement() {
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterTier, setFilterTier] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const loadUsers = async () => {
      try {
				// This screen should list Android app users.
				// Android app writes profile documents into the `users` collection.
				const snap = await getDocs(collection(db, "users"))
        const rows: UserRow[] = snap.docs.map((d) => {
          const data: any = d.data()
          const createdAtMillis: number | undefined = data.createdAtMillis
          const joinDate =
            typeof createdAtMillis === "number"
              ? new Date(createdAtMillis).toISOString().slice(0, 10)
              : ""

          return {
            id: d.id,
            name: String(data.fullName || ""),
            email: String(data.email || ""),
            phone: String(data.phone || ""),
            address: String(data.address || ""),
            joinDate,
            status: (data.accountStatus as UserRow["status"]) || "active",
            tier: (data.tier as UserRow["tier"]) || "none",
            totalPickups: Number(data.totalPickups || 0),
            totalRecycled: data.totalRecycled
              ? String(data.totalRecycled)
              : "0 kg",
            rewardPoints: Number(data.rewardPoints || 0),
            avatar: "/placeholder.svg",
          }
        })
        setUsers(rows)
      } catch (e) {
        console.error("Failed to load users", e)
        toast({
          title: "Failed to load users",
          description: "Please try again or check your connection.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [toast])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success/10 text-success border-success/20"
      case "inactive": return "bg-muted/10 text-muted-foreground border-border"
      case "suspended": return "bg-destructive/10 text-destructive border-destructive/20"
      default: return "bg-muted/10 text-muted-foreground border-border"
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "gold": return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "silver": return "bg-gray-100 text-gray-800 border-gray-300"
      case "bronze": return "bg-orange-100 text-orange-800 border-orange-300"
      default: return "bg-muted/10 text-muted-foreground border-border"
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "gold": return <Award className="h-3 w-3" />
      case "silver": return <Star className="h-3 w-3" />
      case "bronze": return <UserCheck className="h-3 w-3" />
      default: return null
    }
  }

  const handleStatusUpdate = async (userId: string, newStatus: UserRow["status"]) => {
    try {
			await updateDoc(doc(db, "users", userId), { accountStatus: newStatus })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)),
      )
      toast({
        title: "Status updated",
        description: `User ${userId} status changed to ${newStatus}.`,
      })
    } catch (e) {
      console.error("Failed to update status", e)
      toast({
        title: "Failed to update user",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleBulkAction = async (action: "Activated" | "Suspended") => {
    const targetStatus: UserRow["status"] =
      action === "Activated" ? "active" : "suspended"
    try {
      await Promise.all(
        selectedUsers.map((id) =>
					updateDoc(doc(db, "users", id), { accountStatus: targetStatus }),
        ),
      )
      setUsers((prev) =>
        prev.map((u) =>
          selectedUsers.includes(u.id) ? { ...u, status: targetStatus } : u,
        ),
      )
      toast({
        title: `Bulk ${action}`,
        description: `${selectedUsers.length} users have been ${action.toLowerCase()}.`,
      })
    } catch (e) {
      console.error("Bulk update failed", e)
      toast({
        title: "Bulk update failed",
        description: "Some users may not have been updated.",
        variant: "destructive",
      })
    } finally {
      setSelectedUsers([])
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesStatus = filterStatus === "all" || user.status === filterStatus
    const matchesTier = filterTier === "all" || user.tier === filterTier
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.id.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesTier && matchesSearch
  })

  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.status === "active").length
  const goldMembers = users.filter((u) => u.tier === "gold").length
  const newThisMonth = users.filter((u) => {
    if (!u.joinDate) return false
    const d = new Date(u.joinDate)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage platform users and their activities</p>
        </div>
        <div />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-eco shadow-eco border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/90">Total Users</p>
                <p className="text-2xl font-bold text-white">{loading ? "…" : totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-forest shadow-elevated border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/90">Active Users</p>
                <p className="text-2xl font-bold text-white">{loading ? "…" : activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-warning/90 shadow-card border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Award className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/90">Gold Members</p>
                <p className="text-2xl font-bold text-white">{loading ? "…" : goldMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-accent/90 shadow-card border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/90">New This Month</p>
                <p className="text-2xl font-bold text-white">{loading ? "…" : newThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="rewards">Rewards & Transactions</TabsTrigger>
          <TabsTrigger value="analytics">User Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterTier} onValueChange={setFilterTier}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedUsers.length > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedUsers.length} user(s) selected
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleBulkAction("Activated")}>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Activate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction("Suspended")}>
                      <UserX className="h-4 w-4 mr-2" />
                      Suspend
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedUsers.length === filteredUsers.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers(filteredUsers.map(user => user.id))
                          } else {
                            setSelectedUsers([])
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Pickups</TableHead>
                    <TableHead>Recycled</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers([...selectedUsers, user.id])
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id))
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">ID: {user.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {user.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTierColor(user.tier)}>
                          {getTierIcon(user.tier)}
                          <span className="ml-1 capitalize">{user.tier}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{user.totalPickups}</TableCell>
                      <TableCell className="font-medium">{user.totalRecycled}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3 text-muted-foreground" />
                          {user.rewardPoints.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(user.status)}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>User Profile - {user.name}</DialogTitle>
                              </DialogHeader>
                              {selectedUser && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-4">
                                    <Avatar className="w-16 h-16">
                                      <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                                      <AvatarFallback>{selectedUser.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                                      <p className="text-sm text-muted-foreground">Member since {selectedUser.joinDate}</p>
                                      <Badge className={getTierColor(selectedUser.tier)}>
                                        {getTierIcon(selectedUser.tier)}
                                        <span className="ml-1 capitalize">{selectedUser.tier}</span>
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">Email</label>
                                      <p>{selectedUser.email}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Phone</label>
                                      <p>{selectedUser.phone}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Total Pickups</label>
                                      <p>{selectedUser.totalPickups}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Total Recycled</label>
                                      <p>{selectedUser.totalRecycled}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium">Address</label>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3 text-muted-foreground" />
                                      {selectedUser.address}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.id}</TableCell>
                      <TableCell>{transaction.userId}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === "reward_earned" ? "default" : "outline"}>
                          {transaction.type === "reward_earned" ? "Earned" : "Redeemed"}
                        </Badge>
                      </TableCell>
                      <TableCell className={transaction.type === "reward_earned" ? "text-success" : "text-muted-foreground"}>
                        {transaction.amount}
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">User analytics charts would be displayed here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}