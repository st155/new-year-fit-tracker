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
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Привычки</h1>
          <p className="text-muted-foreground">Отслеживайте и развивайте свои привычки</p>
        </div>
        <div className="flex gap-2">
          <HabitMigrationButton onComplete={refetch} />
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Новая привычка
          </Button>
        </div>
      </div>

      <HabitStats userId={user?.id} />

      {!habits || habits.length === 0 ? (
        <EmptyState
          icon={<Target className="h-12 w-12" />}
          title="No habits yet"
          description="Create your first habit to start building a better routine"
          action={{
            label: "Create Habit",
            onClick: () => setCreateDialogOpen(true)
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {habits.map((habit) => (
            <HabitCard 
              key={habit.id} 
              habit={habit} 
              onCompleted={refetch}
            />
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
