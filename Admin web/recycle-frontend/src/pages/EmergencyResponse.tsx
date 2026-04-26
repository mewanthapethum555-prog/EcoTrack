import { 
  AlertTriangle, 
  Phone, 
  MapPin, 
  Clock, 
  User, 
  Truck,
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import { Textarea } from "../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { useState } from "react"

// Mock emergency data
const emergencyRequests = [
  {
    id: 1,
    customerName: "John Silva",
    phone: "+94 77 123 4567",
    location: "No. 45, Galle Road, Wadduwa",
    emergencyType: "Chemical Spill",
    priority: "high",
    description: "Chemical container leaked near residential area",
    timestamp: "2024-01-20 16:30",
    status: "pending",
    assignedDriver: null
  },
  {
    id: 2,
    customerName: "Maria Fernando",
    phone: "+94 71 987 6543",
    location: "Main Street, Wadduwa",
    emergencyType: "Fire Hazard",
    priority: "critical",
    description: "Waste materials caught fire, spreading smoke",
    timestamp: "2024-01-20 17:15",
    status: "in_progress",
    assignedDriver: "Driver A"
  },
  {
    id: 3,
    customerName: "David Perera",
    phone: "+94 76 555 1234",
    location: "Lake Road, Wadduwa",
    emergencyType: "Blockage",
    priority: "medium",
    description: "Large debris blocking main road",
    timestamp: "2024-01-20 18:00",
    status: "completed",
    assignedDriver: "Driver B"
  }
]

const drivers = [
  { id: 1, name: "Driver A", status: "available", phone: "+94 77 111 1111" },
  { id: 2, name: "Driver B", status: "busy", phone: "+94 77 222 2222" },
  { id: 3, name: "Driver C", status: "available", phone: "+94 77 333 3333" }
]

export default function EmergencyResponse() {
  const [requests, setRequests] = useState(emergencyRequests)
  const [showNewRequestForm, setShowNewRequestForm] = useState(false)
  const [newRequest, setNewRequest] = useState({
    customerName: "",
    phone: "",
    location: "",
    emergencyType: "",
    description: ""
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleAssignDriver = (requestId: number, driverName: string) => {
    setRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, assignedDriver: driverName, status: "in_progress" }
        : req
    ))
  }

  const handleCompleteRequest = (requestId: number) => {
    setRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, status: "completed" }
        : req
    ))
  }

  const handleSubmitNewRequest = () => {
    const newEmergencyRequest = {
      id: requests.length + 1,
      ...newRequest,
      priority: "medium",
      timestamp: new Date().toLocaleString(),
      status: "pending",
      assignedDriver: null
    }
    setRequests(prev => [...prev, newEmergencyRequest])
    setNewRequest({
      customerName: "",
      phone: "",
      location: "",
      emergencyType: "",
      description: ""
    })
    setShowNewRequestForm(false)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Emergency Response</h1>
        <p className="text-muted-foreground">
          Manage urgent waste management emergencies and coordinate rapid response
        </p>
      </div>

      {/* Emergency Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-red-100 to-red-200 border-red-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">Critical</p>
                <p className="text-2xl font-bold text-red-900">
                  {requests.filter(r => r.priority === "critical").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">Pending</p>
                <p className="text-2xl font-bold text-orange-900">
                  {requests.filter(r => r.status === "pending").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">In Progress</p>
                <p className="text-2xl font-bold text-blue-900">
                  {requests.filter(r => r.status === "in_progress").length}
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
                  {requests.filter(r => r.status === "completed").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button 
          onClick={() => setShowNewRequestForm(true)}
          className="bg-red-600 hover:bg-red-700"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Report New Emergency
        </Button>
        <Button variant="outline">
          <Phone className="h-4 w-4 mr-2" />
          Contact Emergency Services
        </Button>
      </div>

      {/* New Request Form */}
      {showNewRequestForm && (
        <Card className="bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-300">
          <CardHeader>
            <CardTitle>Report New Emergency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Customer Name</label>
                <Input
                  value={newRequest.customerName}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  value={newRequest.phone}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                value={newRequest.location}
                onChange={(e) => setNewRequest(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter exact location"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Emergency Type</label>
              <Select onValueChange={(value) => setNewRequest(prev => ({ ...prev, emergencyType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select emergency type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Chemical Spill">Chemical Spill</SelectItem>
                  <SelectItem value="Fire Hazard">Fire Hazard</SelectItem>
                  <SelectItem value="Blockage">Blockage</SelectItem>
                  <SelectItem value="Health Hazard">Health Hazard</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newRequest.description}
                onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the emergency situation"
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSubmitNewRequest} className="bg-red-600 hover:bg-red-700">
                Submit Emergency Report
              </Button>
              <Button variant="outline" onClick={() => setShowNewRequestForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{request.customerName}</h3>
                      <Badge className={getPriorityColor(request.priority)}>
                        {request.priority.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{request.emergencyType}</p>
                    <p className="text-sm text-muted-foreground">{request.timestamp}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{request.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{request.phone}</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">{request.description}</p>
                    {request.assignedDriver && (
                      <p className="text-sm mt-1">
                        <span className="font-medium">Assigned Driver:</span> {request.assignedDriver}
                      </p>
                    )}
                  </div>
                </div>
                
                {request.status === "pending" && (
                  <div className="flex gap-2">
                    <Select onValueChange={(value) => handleAssignDriver(request.id, value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Assign Driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.filter(d => d.status === "available").map(driver => (
                          <SelectItem key={driver.id} value={driver.name}>
                            {driver.name} - {driver.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {request.status === "in_progress" && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleCompleteRequest(request.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Complete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
