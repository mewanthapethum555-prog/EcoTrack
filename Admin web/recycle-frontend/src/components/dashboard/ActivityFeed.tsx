import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { CheckCircle, XCircle, Truck, UserPlus, Route } from "lucide-react"
import { cn } from "../../lib/utils"
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore"
import { db } from "../../firebase"

export function ActivityFeed() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActivities() {
      try {
        const q = query(collection(db, 'pickups'), orderBy('createdAtMillis', 'desc'), limit(5))
        const snap = await getDocs(q)
        const acts: any[] = []
        let idCount = 0
        
        snap.forEach(d => {
           const data = d.data() as any
           idCount++
           
           let title = "Pickup Scheduled"
           let type = "schedule"
           let icon = Truck
           let color = "text-primary"
           
           if (data.status === 'completed') {
             title = "Pickup Completed"
             icon = CheckCircle
             color = "text-success"
             type = "pickup"
           } else if (data.status === 'in_progress') {
             title = "Pickup In Progress"
             color = "text-accent"
             type = "route"
           }
           
           let timeStr = "Recently"
           if (data.createdAtMillis) {
               const diff = Date.now() - data.createdAtMillis
               if (diff < 60000) timeStr = "Just now"
               else if (diff < 3600000) timeStr = Math.floor(diff/60000) + " min ago"
               else if (diff < 86400000) timeStr = Math.floor(diff/3600000) + " hours ago"
               else timeStr = Math.floor(diff/86400000) + " days ago"
           }
           
           acts.push({
             id: d.id,
             type,
             title,
             description: `${data.materialType || 'Recyclables'} collected at ${data.address || 'Unknown address'}`,
             user: data.customerName || data.assignedTo || 'System',
             time: timeStr,
             icon,
             color
           })
        })
        setActivities(acts)
      } catch (e) {
        console.error("error fetching activities", e)
      } finally {
        setLoading(false)
      }
    }
    fetchActivities()
  }, [])

	return (
		<Card>
			<CardHeader>
				<CardTitle>Recent Live Activity</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4 bg-[hsl(var(--card-light))] text-[hsl(var(--foreground))]">
			    {loading && <p className="text-sm text-muted-foreground p-4">Loading real-time events...</p>}
			    {!loading && activities.length === 0 && <p className="text-sm p-4 text-muted-foreground">No recent network activity observed.</p>}
				{!loading && activities.map((activity) => (
					<div
						key={activity.id}
						className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
					>
						<div
							className={cn(
								"flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
								"bg-background border-2",
								activity.color === "text-success" &&
									"border-success/20 bg-success/10",
								activity.color === "text-destructive" &&
									"border-destructive/20 bg-destructive/10",
								activity.color === "text-primary" &&
									"border-primary/20 bg-primary/10",
								activity.color === "text-accent" &&
									"border-accent/20 bg-accent/10"
							)}
						>
							<activity.icon className={cn("h-4 w-4", activity.color)} />
						</div>

						<div className="flex-1 min-w-0 space-y-1">
							<div className="flex items-center gap-2">
								<p className="text-sm font-medium text-foreground">
									{activity.title}
								</p>
								<Badge variant="outline" className="text-xs">
									{activity.type}
								</Badge>
							</div>
							<p className="text-sm text-muted-foreground">
								{activity.description}
							</p>
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<Avatar className="w-4 h-4">
									<AvatarFallback className="text-xs">
										{activity.user.charAt(0).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<span>{activity.user}</span>
								<span>•</span>
								<span>{activity.time}</span>
							</div>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	)
}