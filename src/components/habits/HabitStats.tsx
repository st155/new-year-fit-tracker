import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Trophy, TrendingUp, Calendar } from "lucide-react";

export function HabitStats() {
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
      icon: Calendar,
      color: "text-blue-500",
    },
    {
      title: "Активные серии",
      value: stats.activeStreaks,
      icon: Flame,
      color: "text-orange-500",
    },
    {
      title: "Всего выполнений",
      value: stats.totalCompletions,
      icon: Trophy,
      color: "text-yellow-500",
    },
    {
      title: "Средний процент",
      value: `${Math.round(stats.averageCompletionRate)}%`,
      icon: TrendingUp,
      color: "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
