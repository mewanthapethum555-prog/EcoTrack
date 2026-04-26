import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { cn } from "../../lib/utils"

interface MetricsCardProps {
  title: string
  value: string | number
  change?: {
    value: string
    type: "increase" | "decrease" | "neutral"
  }
  icon?: ReactNode
  description?: string
  className?: string
}

export function MetricsCard({
  title,
  value,
  change,
  icon,
  description,
  className
}: MetricsCardProps) {
  const getChangeColor = (type: "increase" | "decrease" | "neutral") => {
    switch (type) {
      case "increase":
        return "bg-success/10 text-success border-success/20"
      case "decrease":
        return "bg-destructive/10 text-destructive border-destructive/20"
      case "neutral":
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Card className={cn("relative overflow-hidden bg-gradient-to-br from-green-100 to-green-200 border-green-300 shadow-lg backdrop-blur-sm", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[hsl(var(--forest)_/_0.9)]">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-[hsl(var(--forest))]">{value}</p>
              {change && (
                <Badge variant="outline" className={cn("text-xs", getChangeColor(change.type))}>
                  {change.value}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-sm text-[hsl(var(--earth)_/_0.8)]">{description}</p>
            )}
          </div>
          {icon && (
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-[hsl(var(--forest)_/_0.15)] border border-[hsl(var(--forest)_/_0.25)] flex items-center justify-center text-[hsl(var(--forest))]">
                {icon}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Eco-friendly gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[hsl(var(--earth-light)_/_0.1)] pointer-events-none" />
    </Card>
  )
}