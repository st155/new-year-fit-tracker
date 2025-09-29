import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity, Heart, Flame, Footprints, Moon, TrendingUp, Droplets, Dumbbell } from "lucide-react";
import { Leaderboard } from "./leaderboard";
import { WeeklyGoals } from "./weekly-goals";

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  unit?: string;
  change?: string;
  subtitle?: string;
  color: string;
}

function MetricCard({ icon, title, value, unit, change, subtitle, color }: MetricCardProps) {
  return (
    <Card className={cn(
      "border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
      `border-${color} bg-${color}/5`
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("p-2 rounded-xl", `bg-${color}/10`)}>
            {icon}
          </div>
          {change && (
            <Badge 
              variant={change.startsWith('-') ? "destructive" : "default"}
              className="text-xs"
            >
              {change}
            </Badge>
          )}
        </div>
        
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">
              {value}
            </span>
            {unit && (
              <span className="text-sm text-muted-foreground">
                {unit}
              </span>
            )}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground">
              {subtitle}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdditionalMetrics() {
  const weeklyMetrics = [
    {
      icon: <Activity className="h-4 w-4 text-primary" />,
      title: "ACTIVE MINUTES",
      value: "847",
      unit: "min",
      change: "+15%",
      subtitle: "This week",
      color: "primary"
    },
    {
      icon: <Flame className="h-4 w-4 text-orange-500" />,
      title: "CALORIES BURNED",
      value: "2,845",
      unit: "kcal",
      change: "+8%",
      subtitle: "Daily average",
      color: "orange-500"
    },
    {
      icon: <Footprints className="h-4 w-4 text-accent" />,
      title: "AVG STEPS",
      value: "11,234",
      unit: "steps",
      change: "+12%",
      subtitle: "This week",
      color: "accent"
    },
    {
      icon: <Heart className="h-4 w-4 text-red-500" />,
      title: "RESTING HR",
      value: "58",
      unit: "bpm",
      change: "-3%",
      subtitle: "Morning average",
      color: "red-500"
    }
  ];

  const healthMetrics = [
    {
      icon: <Moon className="h-4 w-4 text-purple-500" />,
      title: "SLEEP QUALITY",
      value: "8.2",
      unit: "hrs",
      change: "+5%",
      subtitle: "Avg per night",
      color: "purple-500"
    },
    {
      icon: <TrendingUp className="h-4 w-4 text-green-500" />,
      title: "STRAIN",
      value: "14.8",
      unit: "/21",
      change: "+10%",
      subtitle: "Today",
      color: "green-500"
    },
    {
      icon: <Droplets className="h-4 w-4 text-blue-500" />,
      title: "HYDRATION",
      value: "2.4",
      unit: "L",
      change: "-5%",
      subtitle: "Today",
      color: "blue-500"
    },
    {
      icon: <Dumbbell className="h-4 w-4 text-primary" />,
      title: "WORKOUTS",
      value: "5",
      unit: "times",
      change: "+2",
      subtitle: "This week",
      color: "primary"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Team Rank - Desktop only */}
      <div className="hidden lg:block">
        <div className="bg-card border-2 border-primary rounded-xl p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">TEAM RANK</div>
          <div className="text-3xl font-bold text-primary mb-1">#3</div>
          <div className="text-xs text-muted-foreground">2KM ROW</div>
        </div>
      </div>

      {/* Weekly Goals */}
      <WeeklyGoals />

      {/* Leaderboard */}
      <Leaderboard />

      {/* Quick Health Metrics */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Today's Health
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {healthMetrics.slice(0, 2).map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>
      </div>
    </div>
  );
}