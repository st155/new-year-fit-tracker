import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Footprints, Moon, Zap, Heart, LucideIcon } from "lucide-react";
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

export type CategoryMetric = 
  | 'steps_last_7d'
  | 'avg_sleep_last_7d'
  | 'avg_strain_last_7d'
  | 'avg_recovery_last_7d'
  | 'weekly_consistency';

export interface CategoryInfo {
  title: string;
  icon: LucideIcon;
  color: string;
  metricKey: CategoryMetric;
  formatValue: (value: number) => string;
  description?: string;
}

interface LeaderboardCategoryLeadersProps {
  leaderboard: LeaderboardEntry[];
  onCategoryClick?: (category: CategoryInfo) => void;
}

interface CategoryLeader extends CategoryInfo {
  value: string;
  user: LeaderboardEntry | null;
}

export function LeaderboardCategoryLeaders({ leaderboard, onCategoryClick }: LeaderboardCategoryLeadersProps) {
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
        color: "text-chart-1",
        metricKey: 'steps_last_7d' as CategoryMetric,
        formatValue: (val: number) => `${Math.round(val).toLocaleString()}`,
        description: "Total steps in the last 7 days"
      },
      {
        icon: Moon,
        title: "Best Sleep",
        value: `${(sleepLeader?.avg_sleep_last_7d || 0).toFixed(1)}h`,
        user: sleepLeader,
        color: "text-chart-2",
        metricKey: 'avg_sleep_last_7d' as CategoryMetric,
        formatValue: (val: number) => `${val.toFixed(1)}h`,
        description: "Average sleep hours in the last 7 days"
      },
      {
        icon: Zap,
        title: "Highest Strain",
        value: `${(strainLeader?.avg_strain_last_7d || 0).toFixed(1)}`,
        user: strainLeader,
        color: "text-chart-5",
        metricKey: 'avg_strain_last_7d' as CategoryMetric,
        formatValue: (val: number) => `${val.toFixed(1)}`,
        description: "Average daily strain in the last 7 days"
      },
      {
        icon: Heart,
        title: "Best Recovery",
        value: `${Math.round(recoveryLeader?.avg_recovery_last_7d || 0)}%`,
        user: recoveryLeader,
        color: "text-chart-3",
        metricKey: 'avg_recovery_last_7d' as CategoryMetric,
        formatValue: (val: number) => `${Math.round(val)}%`,
        description: "Average recovery score in the last 7 days"
      },
      {
        icon: Trophy,
        title: "Most Consistent",
        value: `${Math.round(consistencyLeader?.weekly_consistency || 0)}%`,
        user: consistencyLeader,
        color: "text-chart-4",
        metricKey: 'weekly_consistency' as CategoryMetric,
        formatValue: (val: number) => `${Math.round(val)}%`,
        description: "Weekly activity consistency"
      }
    ];
  };

  const categories = getCategoryLeaders();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {categories.map((category) => {
        const Icon = category.icon;
        const displayName = category.user?.fullName || category.user?.username || 'Unknown';
        
        return (
          <Card 
            key={category.title} 
            className="p-4 space-y-3 cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-200 hover:border-primary/50"
            onClick={() => onCategoryClick?.(category)}
          >
            {/* Icon at top - centered */}
            <div className="flex justify-center">
              <div className={cn("p-3 rounded-full bg-primary/10", category.color)}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
            
            {/* Large value - centered */}
            <div className="text-center">
              <p className={cn("text-2xl font-bold", category.color)}>{category.value}</p>
            </div>
            
            {/* Avatar + Name - centered */}
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={category.user?.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center space-y-0.5">
                <p className="text-sm font-medium truncate max-w-[120px]">{displayName}</p>
                <p className="text-xs text-muted-foreground">{category.title}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
