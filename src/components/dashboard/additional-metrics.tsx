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

function CompactMetricCard({ icon, title, value, unit, change, subtitle, color, onClick }: MetricCardProps) {
  return (
    <button 
      className={cn(
        "border-2 transition-all duration-300 hover:scale-105 rounded-xl p-3 text-left w-full",
        `border-${color}/20 bg-${color}/5 hover:border-${color}/40`,
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={cn("p-1.5 rounded-lg", `bg-${color}/10`)}>
          {icon}
        </div>
        {change && (
          <Badge 
            variant={change.startsWith('-') ? "destructive" : "default"}
            className="text-[9px] h-4 px-1.5"
          >
            {change}
          </Badge>
        )}
      </div>
      
      <div className="space-y-0.5">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-xl font-bold text-foreground">
            {value}
          </span>
          {unit && (
            <span className="text-[10px] text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
        {subtitle && (
          <div className="text-[9px] text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
    </button>
  );
}

export function AdditionalMetrics() {
  const navigate = useNavigate();
  
  const allMetrics = [
    {
      icon: <Moon className="h-4 w-4 text-purple-500" />,
      title: "SLEEP",
      value: "8.2",
      unit: "hrs",
      change: "+5%",
      subtitle: "Avg per night",
      color: "purple-500",
      route: "/metric/recovery"
    },
    {
      icon: <TrendingUp className="h-4 w-4 text-green-500" />,
      title: "STRAIN",
      value: "14.8",
      unit: "/21",
      change: "+10%",
      subtitle: "Today",
      color: "green-500",
      route: "/metric/steps"
    },
    {
      icon: <Activity className="h-4 w-4 text-primary" />,
      title: "ACTIVE MIN",
      value: "847",
      unit: "min",
      change: "+15%",
      subtitle: "This week",
      color: "primary",
      route: "/metric/steps"
    },
    {
      icon: <Flame className="h-4 w-4 text-orange-500" />,
      title: "CALORIES",
      value: "2,845",
      unit: "kcal",
      change: "+8%",
      subtitle: "Daily avg",
      color: "orange-500",
      route: "/metric/steps"
    },
    {
      icon: <Footprints className="h-4 w-4 text-accent" />,
      title: "AVG STEPS",
      value: "11,234",
      unit: "steps",
      change: "+12%",
      subtitle: "This week",
      color: "accent",
      route: "/metric/steps"
    },
    {
      icon: <Heart className="h-4 w-4 text-red-500" />,
      title: "REST HR",
      value: "58",
      unit: "bpm",
      change: "-3%",
      subtitle: "Morning avg",
      color: "red-500",
      route: "/metric/recovery"
    },
    {
      icon: <Droplets className="h-4 w-4 text-blue-500" />,
      title: "HYDRATION",
      value: "2.4",
      unit: "L",
      change: "-5%",
      subtitle: "Today",
      color: "blue-500",
      route: "/metric/steps"
    },
    {
      icon: <Dumbbell className="h-4 w-4 text-primary" />,
      title: "WORKOUTS",
      value: "5",
      unit: "times",
      change: "+2",
      subtitle: "This week",
      color: "primary",
      route: "/metric/steps"
    }
  ];


  return (
    <div className="space-y-4">
      {/* Compact grid layout - 2 columns on mobile, 3 on tablet, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {/* Team Rank - Compact and clickable */}
        <button 
          className="bg-card border-2 border-primary/20 hover:border-primary/40 rounded-xl p-3 text-center transition-all hover:scale-105 cursor-pointer shadow-sm hover:shadow-md"
          onClick={() => navigate('/leaderboard')}
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">TEAM RANK</div>
          <div className="text-2xl font-bold text-primary mb-0.5">#3</div>
          <div className="text-[10px] text-muted-foreground">2KM ROW</div>
        </button>

        {/* All metrics as compact cards */}
        {allMetrics.map((metric, index) => (
          <CompactMetricCard 
            key={index} 
            {...metric} 
            onClick={metric.route ? () => navigate(metric.route) : undefined}
          />
        ))}
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