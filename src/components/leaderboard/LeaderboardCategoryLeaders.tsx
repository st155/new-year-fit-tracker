import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Flame, Footprints, Moon, Zap, Heart, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  userId: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  steps_last_7d?: number;
  avg_sleep_last_7d?: number | null;
  avgSleepEfficiency?: number;
  avg_strain_last_7d?: number | null;
  avg_recovery_last_7d?: number | null;
  streakDays?: number;
}

export type CategoryMetric = 
  | 'steps_last_7d'
  | 'avg_sleep_last_7d'
  | 'avgSleepEfficiency'
  | 'avg_strain_last_7d'
  | 'avg_recovery_last_7d'
  | 'streakDays';

export interface CategoryInfo {
  title: string;
  icon: LucideIcon;
  color: string;
  metricKey: CategoryMetric;
  formatValue: (value: number) => string;
  description?: string;
  secondaryMetricKey?: CategoryMetric;
  secondaryFormatValue?: (value: number) => string;
  secondaryLabel?: string;
}

interface LeaderboardCategoryLeadersProps {
  leaderboard: LeaderboardEntry[];
  onCategoryClick?: (category: CategoryInfo) => void;
}

interface CategoryLeader extends CategoryInfo {
  value: string;
  secondaryValue?: string;
  user: LeaderboardEntry | null;
  hasData: boolean;
}

export function LeaderboardCategoryLeaders({ leaderboard, onCategoryClick }: LeaderboardCategoryLeadersProps) {
  // Early return for empty/invalid leaderboard
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Недостаточно данных для отображения лидеров</p>
      </Card>
    );
  }

  const getCategoryLeaders = (): CategoryLeader[] => {
    // Filter users with valid data for each category
    const usersWithSteps = leaderboard.filter(u => (u.steps_last_7d || 0) > 0);
    const usersWithSleep = leaderboard.filter(u => (u.avgSleepEfficiency || 0) > 0);
    const usersWithStrain = leaderboard.filter(u => (u.avg_strain_last_7d || 0) > 0);
    const usersWithRecovery = leaderboard.filter(u => (u.avg_recovery_last_7d || 0) > 0);
    const usersWithStreak = leaderboard.filter(u => (u.streakDays || 0) > 0);

    // Find leaders only from users with valid data, fallback to first user
    const stepsLeader = usersWithSteps.length > 0
      ? usersWithSteps.reduce((max, user) => 
          (user.steps_last_7d || 0) > (max.steps_last_7d || 0) ? user : max
        )
      : leaderboard[0];

    const sleepLeader = usersWithSleep.length > 0
      ? usersWithSleep.reduce((max, user) => 
          (user.avgSleepEfficiency || 0) > (max.avgSleepEfficiency || 0) ? user : max
        )
      : leaderboard[0];

    const strainLeader = usersWithStrain.length > 0
      ? usersWithStrain.reduce((max, user) => 
          (user.avg_strain_last_7d || 0) > (max.avg_strain_last_7d || 0) ? user : max
        )
      : leaderboard[0];

    const recoveryLeader = usersWithRecovery.length > 0
      ? usersWithRecovery.reduce((max, user) => 
          (user.avg_recovery_last_7d || 0) > (max.avg_recovery_last_7d || 0) ? user : max
        )
      : leaderboard[0];

    const streakLeader = usersWithStreak.length > 0
      ? usersWithStreak.reduce((max, user) => 
          (user.streakDays || 0) > (max.streakDays || 0) ? user : max
        )
      : leaderboard[0];

    return [
      {
        icon: Footprints,
        title: "Most Steps",
        value: usersWithSteps.length > 0 
          ? `${Math.round(stepsLeader?.steps_last_7d || 0).toLocaleString()}`
          : "No data",
        user: stepsLeader,
        hasData: usersWithSteps.length > 0,
        color: "text-chart-1",
        metricKey: 'steps_last_7d' as CategoryMetric,
        formatValue: (val: number) => `${Math.round(val).toLocaleString()}`,
        description: "Total steps in the last 7 days"
      },
      {
        icon: Moon,
        title: "Best Sleep",
        value: usersWithSleep.length > 0
          ? `${Math.round(sleepLeader?.avgSleepEfficiency || 0)}%`
          : "No data",
        secondaryValue: usersWithSleep.length > 0
          ? `${(sleepLeader?.avg_sleep_last_7d || 0).toFixed(1)}h`
          : undefined,
        user: sleepLeader,
        hasData: usersWithSleep.length > 0,
        color: "text-chart-2",
        metricKey: 'avgSleepEfficiency' as CategoryMetric,
        formatValue: (val: number) => `${Math.round(val)}%`,
        secondaryMetricKey: 'avg_sleep_last_7d' as CategoryMetric,
        secondaryFormatValue: (val: number) => `${val.toFixed(1)}h`,
        secondaryLabel: "sleep",
        description: "Sleep quality and duration"
      },
      {
        icon: Zap,
        title: "Highest Strain",
        value: usersWithStrain.length > 0
          ? `${(strainLeader?.avg_strain_last_7d || 0).toFixed(1)}`
          : "No data",
        user: strainLeader,
        hasData: usersWithStrain.length > 0,
        color: "text-chart-5",
        metricKey: 'avg_strain_last_7d' as CategoryMetric,
        formatValue: (val: number) => `${val.toFixed(1)}`,
        description: "Average daily strain in the last 7 days"
      },
      {
        icon: Heart,
        title: "Best Recovery",
        value: usersWithRecovery.length > 0
          ? `${Math.round(recoveryLeader?.avg_recovery_last_7d || 0)}%`
          : "No data",
        user: recoveryLeader,
        hasData: usersWithRecovery.length > 0,
        color: "text-chart-3",
        metricKey: 'avg_recovery_last_7d' as CategoryMetric,
        formatValue: (val: number) => `${Math.round(val)}%`,
        description: "Average recovery score in the last 7 days"
      },
      {
        icon: Flame,
        title: "Longest Streak",
        value: usersWithStreak.length > 0
          ? `${Math.round(streakLeader?.streakDays || 0)} 🔥`
          : "No data",
        user: streakLeader,
        hasData: usersWithStreak.length > 0,
        color: "text-chart-4",
        metricKey: 'streakDays' as CategoryMetric,
        formatValue: (val: number) => `${Math.round(val)} 🔥`,
        description: "Current activity streak in days"
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
            className={cn(
              "p-4 space-y-3 transition-all duration-200",
              category.hasData 
                ? "cursor-pointer hover:scale-105 hover:shadow-lg hover:border-primary/50" 
                : "opacity-50 cursor-default"
            )}
            onClick={() => category.hasData && onCategoryClick?.(category)}
          >
            {/* Icon at top - centered */}
            <div className="flex justify-center">
              <div className={cn("p-3 rounded-full bg-primary/10", category.color)}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
            
            {/* Large value - centered */}
            <div className="text-center space-y-1">
              <p className={cn(
                "text-2xl font-bold", 
                category.hasData ? category.color : "text-muted-foreground"
              )}>
                {category.value}
              </p>
              {category.secondaryValue && (
                <p className="text-xs text-muted-foreground">
                  {category.secondaryValue} {category.secondaryLabel}
                </p>
              )}
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
