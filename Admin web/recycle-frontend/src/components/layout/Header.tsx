import { Bell, Search, Menu, User, LogOut } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { Avatar, AvatarFallback } from "../ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { useState, useRef, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore"
import { db } from "../../firebase"

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<string[]>([])
  const searchRef = useRef<HTMLDivElement | null>(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [loadingNotifications, setLoadingNotifications] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [latestPendingId, setLatestPendingId] = useState<string | null>(null)
  const [latestPendingMillis, setLatestPendingMillis] = useState<number | null>(null)
  const [latestPickupId, setLatestPickupId] = useState<string | null>(null)
  const [latestPickupMillis, setLatestPickupMillis] = useState<number | null>(null)
  const [latestUserName, setLatestUserName] = useState<string | null>(null)
  const [latestUserMillis, setLatestUserMillis] = useState<number | null>(null)

  const formatRelativeTime = (millis: number | null | undefined) => {
    if (!millis) return ""
    const diffMs = Date.now() - millis
    if (diffMs < 0) return "just now"
    const sec = Math.floor(diffMs / 1000)
    if (sec < 60) return `${sec}s ago`
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min}m ago`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h ago`
    const days = Math.floor(hr / 24)
    return `${days}d ago`
  }

  // Small in-memory dataset to demonstrate search behavior
  const searchableItems = [
    "Recent activities",
    "Quick actions",
    "Submission queue",
    "Pickup schedule",
    "Current routes",
    "User management",
    "Users: Sarah Senevirathna",
    "Users: John Doe",
    "Route: North Sector",
    "Regional performance",
    "Analytics overview",
    "Settings: Account",
    "Settings: Notifications",
    "Settings: System",
  ]

  useEffect(() => {
    if (!searchQuery) {
      setResults([])
      return
    }
    const q = searchQuery.toLowerCase()
    const filtered = searchableItems
      .filter((s) => s.toLowerCase().includes(q))
      .slice(0, 10)
    setResults(filtered)
  }, [searchQuery])

  // close results when clicking outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setResults([])
      }
    }
    document.addEventListener("click", onDoc)
    return () => document.removeEventListener("click", onDoc)
  }, [])

  // Load real notifications from Firestore (no hardcoded dropdown content).
  useEffect(() => {
    const loadNotifications = async () => {
      setLoadingNotifications(true)
      try {
        const pendingSnap = await getDocs(
          query(collection(db, "submissions"), where("status", "==", "pending")),
        )
        setPendingCount(pendingSnap.size)

        const [latestPendingSnap, latestPickupSnap, latestUserSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "submissions"),
              where("status", "==", "pending"),
              orderBy("createdAtMillis", "desc"),
              limit(1),
            ),
          ),
          getDocs(
            query(
              collection(db, "pickups"),
              where("status", "==", "in_progress"),
              orderBy("createdAtMillis", "desc"),
              limit(1),
            ),
          ),
          getDocs(
            query(collection(db, "users"), orderBy("createdAtMillis", "desc"), limit(1)),
          ),
        ])

        const latestPendingDoc = latestPendingSnap.docs[0]
        const latestPendingData = latestPendingDoc?.data() as any
        setLatestPendingId(latestPendingDoc?.id ?? null)
        setLatestPendingMillis(
          latestPendingData ? Number(latestPendingData.createdAtMillis || 0) : null,
        )

        const latestPickupDoc = latestPickupSnap.docs[0]
        const latestPickupData = latestPickupDoc?.data() as any
        setLatestPickupId(latestPickupDoc?.id ?? null)
        setLatestPickupMillis(
          latestPickupData
            ? Number(latestPickupData.createdAtMillis || latestPickupData.scheduledAtMillis || 0)
            : null,
        )

        const latestUserDoc = latestUserSnap.docs[0]
        const latestUserData = latestUserDoc?.data() as any
        setLatestUserName(latestUserData ? String(latestUserData.fullName || latestUserData.name || "") : null)
        setLatestUserMillis(
          latestUserData ? Number(latestUserData.createdAtMillis || 0) : null,
        )
      } catch (e) {
        console.error("Failed to load notifications", e)
      } finally {
        setLoadingNotifications(false)
      }
    }

    loadNotifications()
    // Refresh occasionally so the badge stays accurate.
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    // use solid sidebar background (no gradient)
    <header className="h-20 border-b border-border bg-[hsl(141,70%,26%)] shadow-xl relative z-20">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden text-white hover:bg-[hsl(var(--sage)_/_0.1)]"
          >
            <Menu className="h-5 w-5 text-white" />
          </Button>

          {/* Truck GIF Logo */}
          <div className="flex items-center gap-2">
            <div className="truck-container">
              <img
                src="/assets/header-truck.gif"
                alt="Eco Track Truck"
                className="h-8 md:h-12 w-auto object-contain truck-animation"
                onError={(e) => {
                  // Hide GIF if it fails to load
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
            <div className="text-white hidden sm:block">
              <h1 className="text-lg font-bold">Eco Track</h1>
              <p className="text-xs text-white/80">Recycling Management</p>
            </div>
            <div className="text-white sm:hidden">
              <h1 className="text-sm font-bold">Eco Track</h1>
            </div>
          </div>

          <div className="relative w-96 max-w-sm" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white" />
            <Input
              id="admin-global-search"
              name="admin-global-search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery((e.target as HTMLInputElement).value)
              }
              placeholder="Search items, users, routes..."
              className="pl-9 bg-background/80 border-[hsl(var(--sage)_/_0.25)] focus:border-[hsl(var(--forest)_/_0.4)] text-[hsl(var(--foreground))]"
            />
            {results.length > 0 && (
              <div className="search-results">
                {results.map((r) => (
                  <div
                    key={r}
                    className="item"
                    onClick={() => {
                      // minimal behavior: log selection (replace with navigation or handler)
                      console.log("Search select:", r)
                      setSearchQuery("")
                      setResults([])
                    }}
                  >
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* System Status */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-sm text-white hidden sm:inline font-medium">
              All systems operational
            </span>
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative text-white hover:bg-[hsl(var(--sage)_/_0.1)]"
              >
                <Bell className="h-5 w-5 text-white" />
                <Badge
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-warning text-black"
                >
                  {loadingNotifications ? "…" : pendingCount}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-4 border-b border-border bg-[hsl(var(--sidebar-background))]">
                <h4 className="font-semibold text-[hsl(var(--sidebar-foreground))]">
                  Notifications
                </h4>
                <p className="text-sm text-[hsl(var(--sidebar-foreground)_/_0.85)]">
                  {loadingNotifications ? "Loading..." : `You have ${pendingCount} pending items`}
                </p>
              </div>
              <div className="p-2">
                {loadingNotifications ? (
                  <div className="text-sm text-muted-foreground p-4">Loading notifications...</div>
                ) : pendingCount > 0 ? (
                  <DropdownMenuItem className="flex-col items-start gap-1 p-4">
                    <div className="flex items-center gap-2 w-full">
                      <div className="w-2 h-2 bg-warning rounded-full"></div>
                      <span className="font-medium">{pendingCount} items pending review</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatRelativeTime(latestPendingMillis)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Latest: submission {latestPendingId ?? "—"}
                    </p>
                  </DropdownMenuItem>
                ) : null}

                {latestPickupId ? (
                  <DropdownMenuItem className="flex-col items-start gap-1 p-4">
                    <div className="flex items-center gap-2 w-full">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="font-medium">Pickup in progress</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatRelativeTime(latestPickupMillis)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Latest: pickup {latestPickupId}
                    </p>
                  </DropdownMenuItem>
                ) : null}

                {latestUserName ? (
                  <DropdownMenuItem className="flex-col items-start gap-1 p-4">
                    <div className="flex items-center gap-2 w-full">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="font-medium">New user registered</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatRelativeTime(latestUserMillis)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {latestUserName} joined the platform
                    </p>
                  </DropdownMenuItem>
                ) : null}

                {pendingCount === 0 && !latestPickupId && !latestUserName ? (
                  <div className="text-sm text-muted-foreground p-4">No notifications</div>
                ) : null}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center">
                <span className="text-[hsl(var(--forest))]">
                  View all notifications
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-[hsl(var(--sage)_/_0.1)]"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.name?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
                <span className="ml-2 hidden sm:inline text-white">
                  {user?.name || "Admin"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.name?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{user?.name || "Admin"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email || "admin@recycle.com"}</p>
                    <p className="text-xs text-muted-foreground">ID: {user?.adminId || "ADMIN"}</p>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <DropdownMenuItem className="gap-2" onClick={() => navigate("/settings/account")}> 
                  <User className="h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="gap-2 text-destructive focus:text-destructive"
                  onClick={() => {
                    logout()
                    navigate("/admin/login")
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}