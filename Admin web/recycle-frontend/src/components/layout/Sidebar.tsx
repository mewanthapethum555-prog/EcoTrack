import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  BarChart3,
  FileCheck,
  Truck,
  Calendar,
  Route,
  AlertTriangle,
  Users,
  UserPlus,
  TrendingUp,
  CreditCard,
  Settings,
  Menu,
  X,
  Leaf
} from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"

const menuItems = [
  {
    title: "Dashboard",
    icon: BarChart3,
    path: "/dashboard",
    badge: null
  },
  {
    title: "Item Reviews",
    icon: FileCheck,
    path: "/reviews",
    badge: null
  },
  {
    title: "Pickup Management",
    icon: Truck,
    path: "/pickups",
    badge: null
  },
  {
    title: "Schedule Pickups",
    icon: Calendar,
    path: "/schedule-pickups",
    badge: null
  },
  {
    title: "Route Planning",
    icon: Route,
    path: "/routes",
    badge: null
  },
  {
    title: "User Management",
    icon: Users,
    path: "/users",
    badge: null
  },
  {
    title: "Driver Registration",
    icon: UserPlus,
    path: "/driver-registration",
    badge: null
  },
  {
    title: "Analytics",
    icon: TrendingUp,
    path: "/analytics",
    badge: null
  },
  {
    title: "Subscriptions",
    icon: CreditCard,
    path: "/subscriptions",
    badge: null
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/settings",
    badge: null
  }
]

interface SidebarProps {
  className?: string
  onCollapsedChange?: (collapsed: boolean) => void
}

export function Sidebar({ className, onCollapsedChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/"
    return location.pathname.startsWith(path)
  }

  const toggleSidebar = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    onCollapsedChange?.(next)
  }

  return (
    <div className={cn(
      "flex flex-col bg-[hsl(141,70%,26%)] text-[hsl(var(--sidebar-foreground))] border-r border-border transition-all duration-300 shadow-xl relative z-20",
      isCollapsed ? "w-14" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between h-20 px-4 border-b border-border bg-[hsl(141,70%,26%)]">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-14 bg-[hsl(var(--forest))] rounded-lg flex items-center justify-center shadow-sm">
              <Leaf className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">Eco Track</h1>
              <p className="text-xs text-white/80">Admin Panel</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const next = !isCollapsed
            setIsCollapsed(next)
            onCollapsedChange?.(next)
          }}
          className="h-8 w-8 p-0 text-white hover:bg-[hsl(141,70%,26%)]"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive: linkIsActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                "hover:bg-[hsl(var(--sage)_/_0.15)] hover:text-white",
                linkIsActive
                  ? "bg-[hsl(var(--forest-light)_/_0.2)] text-black border border-[hsl(var(--forest)_/_0.4)] shadow-sm"
                  : "text-white/90",
                isCollapsed && "justify-center px-0"
              )
            }
          >
            <item.icon
              className={cn(
                "flex-shrink-0",
                isCollapsed ? "h-5 w-5" : "h-5 w-5 text-white"
              )}
            />
            {!isCollapsed && (
              <>
                <span className="font-medium">{item.title}</span>
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className="ml-auto bg-orange-100 text-orange-700 border-orange-200 text-xs px-1.5 py-0.5"
                  >
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}