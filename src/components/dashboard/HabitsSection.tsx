import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useHabits } from "@/hooks/useHabits";
import { HabitCompactCard } from "@/components/habits/HabitCompactCard";
import { Target, Plus, ArrowRight, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function HabitsSection() {
  const { user } = useAuth();
  const { habits, isLoading } = useHabits(user?.id);

  console.log('🏋️ [HabitsSection] Render:', {
    userId: user?.id,
    habitsCount: habits?.length,
    isLoading,
    habits: habits
  });

  // Show top 3 active habits
  const displayHabits = habits?.slice(0, 3) || [];

  // Show loading skeleton while user exists but habits are loading
  if (isLoading || (user?.id && !habits)) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!habits || habits.length === 0) {
    return (
      <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Начните отслеживать привычки</h3>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          Создайте свою первую привычку и начните путь к лучшей версии себя
        </p>
        <Link to="/habits">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Создать первую привычку
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate quick stats
  const completedToday = habits?.filter(h => h.completed_today).length || 0;
  const activeStreaks = habits?.filter(h => 
    h.habit_type === "duration_counter" || h.habit_type === "daily"
  ).length || 0;

  return (
    <div className="space-y-4">
      {/* Header with Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
            Привычки
          </h2>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Всего: {habits?.length || 0}
            </span>
            {completedToday > 0 && (
              <span className="flex items-center gap-1 text-green-500">
                ✓ Сегодня: {completedToday}
              </span>
            )}
            {activeStreaks > 0 && (
              <span className="flex items-center gap-1 text-orange-500">
                <Flame className="h-3 w-3" />
                Серии: {activeStreaks}
              </span>
            )}
          </div>
        </div>
        <Link to="/habits">
          <Button variant="outline" size="sm" className="gap-2 hover:bg-primary/10">
            Все привычки
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Compact Grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {displayHabits.map((habit, index) => (
          <Link
            key={habit.id}
            to={`/habits/${habit.id}`}
            className="animate-fade-in block"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <HabitCompactCard habit={habit} userId={user?.id} />
          </Link>
        ))}
      </div>
    </div>
  );
}
