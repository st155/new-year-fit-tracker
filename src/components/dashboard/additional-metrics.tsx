import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity, Heart, Flame, Footprints, Moon, TrendingUp, Droplets, Dumbbell } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  onClick?: () => void;
}

function MetricCard({ icon, title, value, unit, change, subtitle, color, onClick }: MetricCardProps) {
  return (
    <Card 
      className={cn(
        "border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        `border-${color} bg-${color}/5`,
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
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
  const navigate = useNavigate();
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
    <div className="space-y-4">
      {/* Compact grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Team Rank - Compact and clickable */}
        <button 
          className="bg-card border-2 border-primary/20 hover:border-primary/40 rounded-xl p-3 text-center transition-all hover:scale-105 cursor-pointer shadow-sm hover:shadow-md"
          onClick={() => navigate('/leaderboard')}
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">TEAM RANK</div>
          <div className="text-2xl font-bold text-primary mb-0.5">#3</div>
          <div className="text-[10px] text-muted-foreground">2KM ROW</div>
        </button>

        {/* First Health Metric - Sleep */}
        <MetricCard {...healthMetrics[0]} onClick={() => navigate('/metric/recovery')} />
        
        {/* Second Health Metric - Strain */}
        <MetricCard {...healthMetrics[1]} onClick={() => navigate('/metric/steps')} />
      </div>

      {/* Weekly Goals - Full width compact */}
      <div className="bg-card/30 rounded-xl p-3 border border-border/20">
        <WeeklyGoals />
      </div>

      {/* Leaderboard - Full width */}
      <Leaderboard />
    </div>
  );
}