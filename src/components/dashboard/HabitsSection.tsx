import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useHabits } from "@/hooks/useHabits";
import { HabitDashboardCard } from "@/components/habits/HabitDashboardCard";
import { Target, Plus, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function HabitsSection() {
  const { user } = useAuth();
  const { habits, isLoading } = useHabits(user?.id);

  // Show top 3 active habits
  const displayHabits = habits?.slice(0, 3) || [];

  if (isLoading) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
            Привычки
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Отслеживайте свой прогресс каждый день
          </p>
        </div>
        <Link to="/habits">
          <Button variant="outline" className="gap-2 hover:bg-primary/10">
            Все привычки
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {displayHabits.map((habit, index) => (
          <div
            key={habit.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <HabitDashboardCard habit={habit} userId={user?.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
