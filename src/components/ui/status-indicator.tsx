import { Check, X, Clock, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type ConnectionStatus = "connected" | "disconnected" | "pending" | "error"

interface StatusIndicatorProps {
  status: ConnectionStatus
  lastSync?: Date
  className?: string
}

export function StatusIndicator({ status, lastSync, className }: StatusIndicatorProps) {
  const getStatusConfig = (status: ConnectionStatus) => {
    switch (status) {
      case "connected":
        return {
          icon: Check,
          label: "Подключено",
          variant: "default" as const,
          className: "bg-success/10 text-success border-success/20 hover:bg-success/20"
        }
      case "disconnected":
        return {
          icon: X,
          label: "Отключено",
          variant: "secondary" as const,
          className: "bg-muted text-muted-foreground border-muted"
        }
      case "pending":
        return {
          icon: Clock,
          label: "Ожидание",
          variant: "outline" as const,
          className: "bg-warning/10 text-warning border-warning/20"
        }
      case "error":
        return {
          icon: AlertCircle,
          label: "Ошибка",
          variant: "destructive" as const,
          className: "bg-destructive/10 text-destructive border-destructive/20"
        }
      default:
        return {
          icon: AlertCircle,
          label: "Неизвестно",
          variant: "secondary" as const,
          className: "bg-muted text-muted-foreground"
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  const formatLastSync = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "только что"
    if (diffMins < 60) return `${diffMins} мин назад`
    if (diffHours < 24) return `${diffHours} ч назад`
    return `${diffDays} дн назад`
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Badge className={cn("w-fit flex items-center gap-1", config.className)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
      {lastSync && status === "connected" && (
        <span className="text-xs text-muted-foreground">
          Синхронизация: {formatLastSync(lastSync)}
        </span>
      )}
    </div>
  )
}