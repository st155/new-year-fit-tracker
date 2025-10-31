import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Footprints, Moon, Zap, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  userId: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  steps_last_7d?: number;
  avg_sleep_last_7d?: number | null;
  avg_strain_last_7d?: number | null;
  avg_recovery_last_7d?: number | null;
  weekly_consistency?: number;
}

interface LeaderboardCategoryLeadersProps {
  leaderboard: LeaderboardEntry[];
}

interface CategoryLeader {
  icon: typeof Trophy;
  title: string;
  value: string;
  user: LeaderboardEntry | null;
  color: string;
}

export function LeaderboardCategoryLeaders({ leaderboard }: LeaderboardCategoryLeadersProps) {
  const getCategoryLeaders = (): CategoryLeader[] => {
    const stepsLeader = leaderboard.reduce((max, user) => 
      (user.steps_last_7d || 0) > (max.steps_last_7d || 0) ? user : max
    , leaderboard[0]);

    const sleepLeader = leaderboard.reduce((max, user) => 
      (user.avg_sleep_last_7d || 0) > (max.avg_sleep_last_7d || 0) ? user : max
    , leaderboard[0]);

    const strainLeader = leaderboard.reduce((max, user) => 
      (user.avg_strain_last_7d || 0) > (max.avg_strain_last_7d || 0) ? user : max
    , leaderboard[0]);

    const recoveryLeader = leaderboard.reduce((max, user) => 
      (user.avg_recovery_last_7d || 0) > (max.avg_recovery_last_7d || 0) ? user : max
    , leaderboard[0]);

    const consistencyLeader = leaderboard.reduce((max, user) => 
      (user.weekly_consistency || 0) > (max.weekly_consistency || 0) ? user : max
    , leaderboard[0]);

    return [
      {
        icon: Footprints,
        title: "Most Steps",
        value: `${Math.round(stepsLeader?.steps_last_7d || 0).toLocaleString()}`,
        user: stepsLeader,
        color: "text-chart-1"
      },
      {
        icon: Moon,
        title: "Best Sleep",
        value: `${(sleepLeader?.avg_sleep_last_7d || 0).toFixed(1)}h`,
        user: sleepLeader,
        color: "text-chart-2"
      },
      {
        icon: Zap,
        title: "Highest Strain",
        value: `${(strainLeader?.avg_strain_last_7d || 0).toFixed(1)}`,
        user: strainLeader,
        color: "text-chart-5"
      },
      {
        icon: Heart,
        title: "Best Recovery",
        value: `${Math.round(recoveryLeader?.avg_recovery_last_7d || 0)}%`,
        user: recoveryLeader,
        color: "text-chart-3"
      },
      {
        icon: Trophy,
        title: "Most Consistent",
        value: `${Math.round(consistencyLeader?.weekly_consistency || 0)}%`,
        user: consistencyLeader,
        color: "text-chart-4"
      }
    ];
  };

  const categories = getCategoryLeaders();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {categories.map((category) => {
        const Icon = category.icon;
        const displayName = category.user?.fullName || category.user?.username || 'Unknown';
        
        return (
          <Card key={category.title} className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg bg-primary/10", category.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{category.title}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={category.user?.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className={cn("text-lg font-bold", category.color)}>{category.value}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
