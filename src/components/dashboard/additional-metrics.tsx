import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity, Heart, Flame, Footprints, Moon, TrendingUp, Droplets, Dumbbell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Leaderboard } from "./leaderboard";
import { WeeklyGoals } from "./weekly-goals";
import { useTranslation } from "react-i18next";

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
  const getColorClasses = () => {
    const colorMap: Record<string, string> = {
      'purple-500': 'border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40',
      'green-500': 'border-green-500/20 bg-green-500/5 hover:border-green-500/40',
      'primary': 'border-primary/20 bg-primary/5 hover:border-primary/40',
      'orange-500': 'border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40',
      'accent': 'border-accent/20 bg-accent/5 hover:border-accent/40',
      'red-500': 'border-red-500/20 bg-red-500/5 hover:border-red-500/40',
      'blue-500': 'border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40',
    };
    return colorMap[color] || 'border-border/20 bg-card/5 hover:border-border/40';
  };

  return (
    <button 
      className={cn(
        "border-2 transition-all duration-500 rounded-xl p-3 text-left w-full",
        "hover:scale-105 hover:shadow-lg active:scale-95",
        "animate-fade-in group",
        getColorClasses(),
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="p-1.5 rounded-lg bg-background/50 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
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
  
  const { t } = useTranslation();
  const allMetrics = [
    {
      icon: <Moon className="h-4 w-4 text-purple-500" />,
      title: t('extraMetrics.sleep'),
      value: "8.2",
      unit: t('extraMetrics.units.hours'),
      change: "+5%",
      subtitle: t('extraMetrics.subtitles.avgPerNight'),
      color: "purple-500",
      route: "/metric/recovery"
    },
    {
      icon: <TrendingUp className="h-4 w-4 text-green-500" />,
      title: t('extraMetrics.strain'),
      value: "14.8",
      unit: "/21",
      change: "+10%",
      subtitle: t('extraMetrics.subtitles.today'),
      color: "green-500",
      route: "/metric/steps"
    },
    {
      icon: <Activity className="h-4 w-4 text-primary" />,
      title: t('extraMetrics.activeMin'),
      value: "847",
      unit: t('extraMetrics.units.min'),
      change: "+15%",
      subtitle: t('extraMetrics.subtitles.thisWeek'),
      color: "primary",
      route: "/metric/steps"
    },
    {
      icon: <Flame className="h-4 w-4 text-orange-500" />,
      title: t('extraMetrics.calories'),
      value: "2,845",
      unit: t('extraMetrics.units.kcal'),
      change: "+8%",
      subtitle: t('extraMetrics.subtitles.dailyAvg'),
      color: "orange-500",
      route: "/metric/steps"
    },
    {
      icon: <Footprints className="h-4 w-4 text-accent" />,
      title: t('extraMetrics.avgSteps'),
      value: "11,234",
      unit: t('metrics.units.steps'),
      change: "+12%",
      subtitle: t('extraMetrics.subtitles.thisWeek'),
      color: "accent",
      route: "/metric/steps"
    },
    {
      icon: <Heart className="h-4 w-4 text-red-500" />,
      title: t('extraMetrics.restHr'),
      value: "58",
      unit: t('extraMetrics.units.bpm'),
      change: "-3%",
      subtitle: t('extraMetrics.subtitles.morningAvg'),
      color: "red-500",
      route: "/metric/recovery"
    },
    {
      icon: <Droplets className="h-4 w-4 text-blue-500" />,
      title: t('extraMetrics.hydration'),
      value: "2.4",
      unit: t('extraMetrics.units.liters'),
      change: "-5%",
      subtitle: t('extraMetrics.subtitles.today'),
      color: "blue-500",
      route: "/metric/steps"
    },
    {
      icon: <Dumbbell className="h-4 w-4 text-primary" />,
      title: t('extraMetrics.workouts'),
      value: "5",
      unit: t('extraMetrics.units.times'),
      change: "+2",
      subtitle: t('extraMetrics.subtitles.thisWeek'),
      color: "primary",
      route: "/metric/steps"
    }
  ];


  return (
    <div className="space-y-4">
      {/* Compact grid layout - 2 columns on mobile, 3 on tablet, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 stagger-fade-in">
        {/* Team Rank - Compact and clickable */}
        <button 
          className="bg-card border-2 border-primary/20 hover:border-primary/40 rounded-xl p-3 text-center transition-all duration-500 hover:scale-105 active:scale-95 cursor-pointer shadow-sm hover:shadow-glow group"
          onClick={() => navigate('/leaderboard')}
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{t('leaderboard.title')} {t('leaderboard.rank')}</div>
          <div className="text-2xl font-bold text-primary mb-0.5 transition-all duration-300 group-hover:scale-110">#3</div>
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
      <div className="bg-card/30 rounded-xl p-3 border border-border/20 animate-fade-in">
        <WeeklyGoals />
      </div>

      {/* Leaderboard - Full width */}
      <div className="animate-fade-in">
        <Leaderboard />
      </div>
    </div>
  );
}