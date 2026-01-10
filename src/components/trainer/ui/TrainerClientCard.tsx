import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TrainerProgressRing } from "./TrainerProgressRing";
import { 
  Sparkles, 
  Eye, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  Trophy, 
  Clock,
  Target,
  Activity,
  Moon,
  Dumbbell,
  Watch
} from "lucide-react";
import { CardHoverEffect } from "@/components/aceternity";

interface ClientMetric {
  name: string;
  value: number | string;
  unit?: string;
  subtitle?: string;
  icon: ReactNode;
  color?: "orange" | "green" | "blue" | "purple";
  trend?: 'up' | 'down' | 'stable' | 'improving' | 'declining';
  alert?: boolean;
}

interface TrainerClientCardProps {
  client: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    goals_count?: number;
  };
  healthScore: number;
  metrics?: ClientMetric[];
  isActive?: boolean;
  lastActivity?: string;
  goalsOnTrack?: number;
  goalsAtRisk?: number;
  activeChallenges?: number;
  hasAlerts?: boolean;
  hasOverdueTasks?: boolean;
  topGoals?: Array<{ id: string; name: string; progress: number }>;
  connectedSources?: string[];
  onViewDetails?: () => void;
  onAskAI?: () => void;
  className?: string;
}

export function TrainerClientCard({
  client,
  healthScore,
  metrics = [],
  isActive = false,
  lastActivity,
  goalsOnTrack = 0,
  goalsAtRisk = 0,
  activeChallenges = 0,
  hasAlerts = false,
  hasOverdueTasks = false,
  topGoals = [],
  connectedSources = [],
  onViewDetails,
  onAskAI,
  className
}: TrainerClientCardProps) {
  const { t } = useTranslation('trainer');
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getHealthScoreColor = (score: number): "orange" | "green" | "blue" | "purple" => {
    if (score >= 80) return "green";
    if (score >= 60) return "blue";
    if (score >= 40) return "orange";
    return "purple";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
      case 'improving':
        return <TrendingUp className="h-3 w-3 text-trainer-green" />;
      case 'down':
      case 'declining':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const goalsCount = client.goals_count || 0;

  const getSourceIcon = (source: string) => {
    const lowerSource = source.toLowerCase();
    if (lowerSource === 'whoop') return Activity;
    if (lowerSource === 'oura') return Moon;
    if (lowerSource === 'garmin') return Dumbbell;
    if (lowerSource === 'withings') return Watch;
    return Activity;
  };

  const getSourceLabel = (source: string) => {
    const lowerSource = source.toLowerCase();
    if (lowerSource === 'whoop') return 'Whoop';
    if (lowerSource === 'oura') return 'Oura';
    if (lowerSource === 'garmin') return 'Garmin';
    if (lowerSource === 'withings') return 'Withings';
    return source;
  };

  return (
    <CardHoverEffect
      className={cn(
        "glass-medium p-6",
        className
      )}
      onClick={onViewDetails}
    >
      {/* Activity & Alert Indicators */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        {isActive && (
          <div className="relative">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <div className="absolute inset-0 h-2 w-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
          </div>
        )}
        {hasAlerts && (
          <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
        )}
      </div>

      <div className="flex items-start gap-4">
        {/* Avatar + Health Score */}
        <div className="relative">
          <Avatar className="h-16 w-16 border-2 border-trainer-orange/20">
            <AvatarImage src={client.avatar_url} />
            <AvatarFallback className="bg-trainer-orange/10 text-trainer-orange font-bold text-lg">
              {getInitials(client.full_name || client.username)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-2 -right-2">
            <TrainerProgressRing 
              value={healthScore} 
              size={40} 
              strokeWidth={4}
              color={getHealthScoreColor(healthScore)}
              showValue={false}
            />
          </div>
        </div>

        {/* Client Info */}
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg truncate">
                {client.full_name || client.username}
              </h3>
              {hasOverdueTasks && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <Clock className="h-3 w-3" />
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{client.username}</p>
          </div>
          
          {/* Enhanced Metrics with Trends */}
          {metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {metrics.slice(0, 4).map((metric, idx) => (
                <div key={idx} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className={cn(
                      "h-3.5 w-3.5 flex-shrink-0",
                      metric.color ? `text-trainer-${metric.color}` : "text-muted-foreground",
                      metric.alert && "text-red-500"
                    )}>
                      {metric.icon}
                    </div>
                    <div className="min-w-0 flex items-center gap-1">
                      <span className={cn(
                        "truncate",
                        metric.alert ? "text-red-500 font-medium" : "text-muted-foreground"
                      )}>
                        {metric.name}:
                      </span>
                      <span className={cn(
                        "font-medium",
                        metric.alert ? "text-red-500" : ""
                      )}>
                        {metric.value}
                        {metric.unit && ` ${metric.unit}`}
                      </span>
                      {metric.trend && getTrendIcon(metric.trend)}
                    </div>
                  </div>
                  {metric.subtitle && (
                    <p className="text-[10px] text-muted-foreground ml-5">
                      {metric.subtitle}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Goals Progress */}
          {goalsCount > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-trainer-green" />
                <span className="text-muted-foreground">{t('clientCard.onTrack')}</span>
                <span className="font-medium">{goalsOnTrack}/{goalsCount}</span>
              </div>
              {goalsAtRisk > 0 && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-trainer-orange" />
                  <span className="text-muted-foreground">{t('clientCard.atRisk')}</span>
                  <span className="font-medium text-trainer-orange">{goalsAtRisk}</span>
                </div>
              )}
            </div>
          )}

          {/* Top Goals Progress Bars */}
          {topGoals.length > 0 && (
            <div className="space-y-1.5">
              {topGoals.slice(0, 2).map((goal) => (
                <div key={goal.id} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate">{goal.name}</span>
                    <span className="font-medium ml-2">{goal.progress}%</span>
                  </div>
                  <Progress 
                    value={goal.progress} 
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Badges Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeChallenges > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Trophy className="h-3 w-3" />
                {activeChallenges} challenge{activeChallenges > 1 ? 's' : ''}
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                healthScore >= 80 ? "border-green-500/50 text-green-600" :
                healthScore >= 60 ? "border-blue-500/50 text-blue-600" :
                healthScore >= 40 ? "border-orange-500/50 text-orange-600" :
                "border-purple-500/50 text-purple-600"
              )}
            >
              Health: {healthScore}%
            </Badge>
            
            {/* Integration Badges */}
            {connectedSources.length > 0 && (
              <div className="flex items-center gap-1">
                {connectedSources.map((source) => {
                  const SourceIcon = getSourceIcon(source);
                  return (
                    <Badge 
                      key={source}
                      variant="outline" 
                      className="text-xs gap-1 px-2 py-0"
                      title={`Connected to ${getSourceLabel(source)}`}
                    >
                      <SourceIcon className="h-3 w-3" />
                      {getSourceLabel(source)}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {lastActivity && (
            <p className="text-xs text-muted-foreground">
              {lastActivity}
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions - показываются при hover */}
      <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Button 
          size="sm" 
          variant="outline"
          className="flex-1 gap-2"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.();
          }}
        >
          <Eye className="h-3 w-3" />
          {t('clientCard.details')}
        </Button>
        <Button 
          size="sm"
          className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700"
          onClick={(e) => {
            e.stopPropagation();
            onAskAI?.();
          }}
        >
          <Sparkles className="h-3 w-3" />
          {t('clientCard.askAI')}
        </Button>
      </div>
    </CardHoverEffect>
  );
}
