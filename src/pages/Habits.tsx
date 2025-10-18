import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHabits } from "@/hooks/useHabits";
import { HabitMigrationButton } from "@/components/habits/HabitMigrationButton";
import { HabitCard } from "@/components/habits/HabitCard";
import { HabitStats } from "@/components/habits/HabitStats";
import { HabitCreateDialog } from "@/components/habits/HabitCreateDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Habits() {
  const { user } = useAuth();
  const { habits, isLoading, refetch } = useHabits(user?.id);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-glow bg-gradient-to-r from-primary to-primary-end bg-clip-text text-transparent">
            Привычки
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            Отслеживайте и развивайте свои привычки
          </p>
        </div>
        <div className="flex gap-2">
          <HabitMigrationButton onComplete={refetch} />
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="relative overflow-hidden group glass-strong border border-habit-neutral/50 hover:shadow-glow-neutral"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-habit-neutral/20 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Plus className="h-4 w-4 mr-2 relative z-10" />
            <span className="relative z-10">Новая привычка</span>
          </Button>
        </div>
      </div>

      <HabitStats userId={user?.id} />

      {!habits || habits.length === 0 ? (
        <EmptyState
          icon={<Target className="h-12 w-12 text-habit-neutral" />}
          title="No habits yet"
          description="Create your first habit to start building a better routine"
          action={{
            label: "Create Habit",
            onClick: () => setCreateDialogOpen(true)
          }}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 stagger-fade-in">
          {habits.map((habit, index) => (
            <div key={habit.id} style={{ animationDelay: `${index * 50}ms` }}>
              <HabitCard 
                habit={habit} 
                onCompleted={refetch}
              />
            </div>
          ))}
        </div>
      )}

      <HabitCreateDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
