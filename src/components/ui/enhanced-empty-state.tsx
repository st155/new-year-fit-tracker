import { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { 
  Target, 
  Trophy, 
  Activity, 
  Users, 
  MessageSquare, 
  Calendar,
  TrendingUp,
  Dumbbell,
  Heart,
  FileText
} from "lucide-react"

interface EnhancedEmptyStateProps {
  variant?: "default" | "goals" | "challenges" | "activity" | "leaderboard" | "notifications" | "posts" | "clients"
  icon?: ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
  illustration?: "motivational" | "data" | "community"
}

const defaultIcons = {
  goals: <Target className="h-12 w-12" />,
  challenges: <Trophy className="h-12 w-12" />,
  activity: <Activity className="h-12 w-12" />,
  leaderboard: <Users className="h-12 w-12" />,
  notifications: <MessageSquare className="h-12 w-12" />,
  posts: <FileText className="h-12 w-12" />,
  clients: <Users className="h-12 w-12" />,
  default: <Heart className="h-12 w-12" />
}

const variantColors = {
  goals: "from-primary/20 to-primary/5",
  challenges: "from-accent/20 to-accent/5",
  activity: "from-green-500/20 to-green-500/5",
  leaderboard: "from-purple-500/20 to-purple-500/5",
  notifications: "from-blue-500/20 to-blue-500/5",
  posts: "from-orange-500/20 to-orange-500/5",
  clients: "from-pink-500/20 to-pink-500/5",
  default: "from-muted/20 to-muted/5"
}

const iconColors = {
  goals: "text-primary",
  challenges: "text-accent",
  activity: "text-green-500",
  leaderboard: "text-purple-500",
  notifications: "text-blue-500",
  posts: "text-orange-500",
  clients: "text-pink-500",
  default: "text-muted-foreground"
}

export function EnhancedEmptyState({ 
  variant = "default",
  icon, 
  title, 
  description, 
  action,
  secondaryAction,
  className,
  illustration = "motivational"
}: EnhancedEmptyStateProps) {
  const { t } = useTranslation('common')
  const displayIcon = icon || defaultIcons[variant]
  const gradientClass = variantColors[variant]
  const iconColorClass = iconColors[variant]

  return (
    <Card className={cn("border-dashed border-2 animate-fade-in", className)}>
      <CardContent className="flex flex-col items-center justify-center text-center py-16 px-6">
        {/* Animated Icon */}
        <div className={cn(
          "mb-6 p-6 rounded-full bg-gradient-to-br transition-all duration-500 hover:scale-110 hover:rotate-6",
          gradientClass
        )}>
          <div className={cn(iconColorClass, "animate-pulse")}>
            {displayIcon}
          </div>
        </div>

        {/* Decorative Background Elements */}
        {illustration === "motivational" && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 space-y-3 mb-8">
          <h3 className="text-2xl font-bold text-foreground">{title}</h3>
          <p className="text-muted-foreground max-w-md text-base leading-relaxed">
            {description}
          </p>
        </div>

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            {action && (
              <Button 
                onClick={action.onClick} 
                className="bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-105 hover:shadow-glow flex-1"
                size="lg"
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button 
                onClick={secondaryAction.onClick}
                variant="outline"
                className="transition-all duration-300 hover:scale-105 flex-1"
                size="lg"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}

        {/* Motivational Quote/Tip */}
        {illustration === "motivational" && (
          <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/20 max-w-md">
            <p className="text-sm text-primary/80 italic">
              💪 "{t('emptyStates.motivationalQuote')}"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Специализированные empty states
export function NoGoalsEmptyState({ onCreateGoal }: { onCreateGoal: () => void }) {
  const { t } = useTranslation('common')
  return (
    <EnhancedEmptyState
      variant="goals"
      title={t('emptyStates.noGoals.title')}
      description={t('emptyStates.noGoals.description')}
      action={{
        label: t('emptyStates.noGoals.action'),
        onClick: onCreateGoal
      }}
      illustration="motivational"
    />
  )
}

export function NoChallengesEmptyState({ onCreateChallenge, onExplore }: { 
  onCreateChallenge?: () => void
  onExplore?: () => void 
}) {
  const { t } = useTranslation('common')
  return (
    <EnhancedEmptyState
      variant="challenges"
      title={t('emptyStates.noChallenges.title')}
      description={t('emptyStates.noChallenges.description')}
      action={onCreateChallenge ? {
        label: t('emptyStates.noChallenges.createAction'),
        onClick: onCreateChallenge
      } : undefined}
      secondaryAction={onExplore ? {
        label: t('emptyStates.noChallenges.exploreAction'),
        onClick: onExplore
      } : undefined}
      illustration="community"
    />
  )
}

export function NoActivityEmptyState({ onAddActivity }: { onAddActivity: () => void }) {
  const { t } = useTranslation('common')
  return (
    <EnhancedEmptyState
      variant="activity"
      title={t('emptyStates.noActivity.title')}
      description={t('emptyStates.noActivity.description')}
      action={{
        label: t('emptyStates.noActivity.action'),
        onClick: onAddActivity
      }}
      illustration="motivational"
    />
  )
}

export function NoDataEmptyState({ 
  title,
  description,
  onAction
}: { 
  title?: string
  description?: string
  onAction?: () => void 
}) {
  const { t } = useTranslation('common')
  return (
    <EnhancedEmptyState
      variant="default"
      icon={<TrendingUp className="h-12 w-12" />}
      title={title || t('emptyStates.noData.title')}
      description={description || t('emptyStates.noData.description')}
      action={onAction ? {
        label: t('emptyStates.noData.action'),
        onClick: onAction
      } : undefined}
      illustration="data"
    />
  )
}

export function NoLeaderboardEmptyState() {
  const { t } = useTranslation('common')
  return (
    <EnhancedEmptyState
      variant="leaderboard"
      title={t('emptyStates.leaderboardComingSoon.title')}
      description={t('emptyStates.leaderboardComingSoon.description')}
      illustration="community"
    />
  )
}
