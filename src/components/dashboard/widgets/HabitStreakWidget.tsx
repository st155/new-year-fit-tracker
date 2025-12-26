import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useHabitsQuery } from '@/features/habits';
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function HabitStreakWidget() {
  const { user } = useAuth();
  const { data: habits, isLoading } = useHabitsQuery({ enabled: !!user?.id });
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Calculate streak stats
  const activeStreaks = habits?.filter(h => 
    (h.habitType === "duration_counter" || h.habitType === "daily") && 
    (h as any).current_streak && (h as any).current_streak > 0
  ) || [];

  const longestStreak = activeStreaks.length > 0
    ? Math.max(...activeStreaks.map(h => (h as any).current_streak || 0))
    : 0;

  const totalStreaks = activeStreaks.length;
  const completedToday = habits?.filter(h => h.completedToday).length || 0;
  const totalHabits = habits?.length || 0;

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer border-orange-500/30"
      onClick={() => navigate('/habits')}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Серии привычек</p>
              <p className="text-sm font-semibold">
                {totalStreaks} {totalStreaks === 1 ? 'активная серия' : 'активных серий'}
              </p>
            </div>
          </div>
          {longestStreak > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-500">
                {longestStreak}
              </p>
              <p className="text-xs text-muted-foreground">дней</p>
            </div>
          )}
        </div>

        {longestStreak === 0 ? (
          <div className="text-center py-2 text-sm text-muted-foreground">
            <p>Начните серию - выполняйте привычки каждый день!</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Сегодня</span>
              <span className="font-medium">
                {completedToday}/{totalHabits} выполнено
              </span>
            </div>
            <div className="flex gap-1">
              {habits?.slice(0, 5).map((habit) => (
                <div
                  key={habit.id}
                  className={`h-8 flex-1 rounded ${
                    habit.completedToday
                      ? 'bg-orange-500/30 border border-orange-500/50'
                      : 'bg-muted border border-border'
                  }`}
                  title={habit.name}
                />
              ))}
              {(habits?.length || 0) > 5 && (
                <div className="h-8 w-8 rounded bg-muted border border-border flex items-center justify-center text-xs text-muted-foreground">
                  +{(habits?.length || 0) - 5}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-right">
              Продолжайте в том же духе! 🔥
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
