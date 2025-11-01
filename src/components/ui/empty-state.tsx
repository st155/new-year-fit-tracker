import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
  debugInfo?: {
    label: string
    value: string | number | boolean
  }[]
}

export function EmptyState({ icon, title, description, action, className, debugInfo }: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center text-center py-12 px-6">
        {icon && (
          <div className="mb-4 text-muted-foreground/50">
            {icon}
          </div>
        )}
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
        {action && (
          <Button onClick={action.onClick} className="bg-gradient-primary hover:opacity-90">
            {action.label}
          </Button>
        )}
        {debugInfo && import.meta.env.DEV && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg text-xs text-left w-full max-w-md border border-info/30">
            <p className="font-semibold text-info mb-2">🔍 Debug Info:</p>
            <ul className="space-y-1 text-muted-foreground">
              {debugInfo.map((info, i) => (
                <li key={i}>• {info.label}: {String(info.value)}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}