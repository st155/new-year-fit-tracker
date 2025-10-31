import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Trophy, Zap, Moon, Heart, Activity, Footprints } from "lucide-react";
import { WeeklyStrainChart } from "./WeeklyStrainChart";
import { WeeklySleepChart } from "./WeeklySleepChart";
import { WeeklyRecoveryChart } from "./WeeklyRecoveryChart";
import { WeeklyStepsChart } from "./WeeklyStepsChart";
import { BalanceIndicator } from "./BalanceIndicator";

interface LeaderboardUserCardProps {
  user: {
    userId: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    total_points?: number;
    steps_last_7d?: number;
    avg_strain_last_7d?: number;
    avg_sleep_last_7d?: number;
    avg_recovery_last_7d?: number;
    workouts_last_7d?: number;
    weekly_consistency?: number;
  };
  rank: number;
  onClick?: () => void;
  isUser?: boolean;
}

export function LeaderboardUserCard({ user, rank, onClick, isUser }: LeaderboardUserCardProps) {
  const displayName = user.full_name || user.username || 'Unknown';
  const initials = displayName.slice(0, 2).toUpperCase();

  const getRankColor = () => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-amber-600";
    return "text-muted-foreground";
  };

  const getRankIcon = () => {
    if (rank <= 3) {
      return <Trophy className={cn("h-5 w-5", getRankColor())} />;
    }
    return null;
  };

  return (
    <Card
      className={cn(
        "p-4 space-y-4 cursor-pointer transition-all hover:shadow-lg",
        isUser && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getRankIcon()}
            <span className={cn("text-lg font-bold", getRankColor())}>#{rank}</span>
          </div>
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{displayName}</p>
            <p className="text-sm text-muted-foreground">{user.total_points || 0} pts</p>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="space-y-4">
        {/* Strain Chart */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-chart-5" />
            <p className="text-xs font-medium text-muted-foreground">Strain Trend (7 days)</p>
          </div>
          <WeeklyStrainChart userId={user.userId} height={60} />
        </div>

        {/* Sleep Chart */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-chart-2" />
            <p className="text-xs font-medium text-muted-foreground">Sleep Trend (7 days)</p>
          </div>
          <WeeklySleepChart userId={user.userId} height={60} />
        </div>

        {/* Recovery Chart */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-chart-3" />
            <p className="text-xs font-medium text-muted-foreground">Recovery Trend (7 days)</p>
          </div>
          <WeeklyRecoveryChart userId={user.userId} height={60} />
        </div>

        {/* Steps Chart */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Footprints className="h-4 w-4 text-chart-1" />
            <p className="text-xs font-medium text-muted-foreground">Steps Trend (7 days)</p>
          </div>
          <WeeklyStepsChart userId={user.userId} height={60} />
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="pt-3 border-t space-y-3">
        {/* Balance Indicator */}
        <BalanceIndicator 
          strain={user.avg_strain_last_7d || 0}
          recovery={user.avg_recovery_last_7d || 0}
        />
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Footprints className="h-4 w-4" />
              <span>Total Steps</span>
            </div>
            <span className="font-semibold">{(user.steps_last_7d || 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>Workouts</span>
            </div>
            <span className="font-semibold">{user.workouts_last_7d || 0} this week</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy className="h-4 w-4" />
              <span>Consistency</span>
            </div>
            <span className="font-semibold">{Math.round(user.weekly_consistency || 0)}%</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
