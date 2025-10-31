import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Trophy, Zap, Moon, Heart, Activity } from "lucide-react";
import { WeeklyStrainChart } from "./WeeklyStrainChart";

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

      {/* Weekly Strain Chart */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Strain Trend (7 days)</p>
        </div>
        <WeeklyStrainChart userId={user.userId} height={50} />
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-chart-5" />
          <div>
            <p className="text-xs text-muted-foreground">Strain</p>
            <p className="font-semibold">{(user.avg_strain_last_7d || 0).toFixed(1)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-chart-2" />
          <div>
            <p className="text-xs text-muted-foreground">Sleep</p>
            <p className="font-semibold">{(user.avg_sleep_last_7d || 0).toFixed(1)}h</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-chart-3" />
          <div>
            <p className="text-xs text-muted-foreground">Recovery</p>
            <p className="font-semibold">{Math.round(user.avg_recovery_last_7d || 0)}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-chart-1" />
          <div>
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="font-semibold">{Math.round(user.weekly_consistency || 0)}%</p>
          </div>
        </div>
      </div>

      {/* Workouts Badge */}
      {(user.workouts_last_7d || 0) > 0 && (
        <div className="pt-2 border-t">
          <Badge variant="secondary" className="text-xs">
            🔥 {user.workouts_last_7d} workouts this week
          </Badge>
        </div>
      )}
    </Card>
  );
}
