import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Trophy, TrendingUp, Calendar } from "lucide-react";

interface HabitStatsProps {
  userId?: string;
}

export function HabitStats({ userId }: HabitStatsProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalHabits: 0,
    activeStreaks: 0,
    totalCompletions: 0,
    averageCompletionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get total habits
      const { count: habitsCount } = await supabase
        .from("habits")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      // Get stats
      const { data: statsData } = await supabase
        .from("habit_stats")
        .select("*")
        .eq("user_id", user.id);

      const activeStreaks = statsData?.filter(s => s.current_streak > 0).length || 0;
      const totalCompletions = statsData?.reduce((sum, s) => sum + s.total_completions, 0) || 0;
      const avgRate = statsData?.length
        ? statsData.reduce((sum, s) => sum + s.completion_rate, 0) / statsData.length
        : 0;

      setStats({
        totalHabits: habitsCount || 0,
        activeStreaks,
        totalCompletions,
        averageCompletionRate: avgRate,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Всего привычек",
      value: stats.totalHabits,
      icon: TrendingUp,
      gradient: "from-primary/20 to-primary-end/20",
      iconColor: "text-primary",
      glowColor: "shadow-glow",
    },
    {
      title: "Активные серии",
      value: stats.activeStreaks,
      icon: Flame,
      gradient: "from-habit-negative/20 to-secondary/20",
      iconColor: "text-habit-negative",
      glowColor: "shadow-glow-negative",
    },
    {
      title: "Всего выполнений",
      value: stats.totalCompletions,
      icon: Trophy,
      gradient: "from-gold/20 to-bronze/20",
      iconColor: "text-gold",
      glowColor: "shadow-glow-gold",
    },
    {
      title: "Средний процент",
      value: `${Math.round(stats.averageCompletionRate)}%`,
      icon: TrendingUp,
      gradient: "from-habit-positive/20 to-success/20",
      iconColor: "text-habit-positive",
      glowColor: "shadow-glow-positive",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-fade-in">
      {statCards.map((stat, index) => (
        <div 
          key={index}
          className={`stat-glass-card p-4 border-t-${stat.iconColor.replace('text-', '')} group`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {stat.title}
            </div>
            <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient} group-hover:scale-110 transition-transform`}>
              <stat.icon className={`h-4 w-4 ${stat.iconColor} group-hover:animate-pulse-glow`} />
            </div>
          </div>
          <div className={`text-3xl font-bold text-glow ${stat.iconColor}`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
