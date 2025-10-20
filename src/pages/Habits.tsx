import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHabits } from "@/hooks/useHabits";
import { HabitMigrationButton } from "@/components/habits/HabitMigrationButton";
import { HabitCard } from "@/components/habits/HabitCard";
import { HabitStats } from "@/components/habits/HabitStats";
import { HabitCreateDialog } from "@/components/habits/HabitCreateDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Target, LayoutGrid, List } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Habits() {
  const { user } = useAuth();
  const { habits, isLoading, refetch } = useHabits(user?.id);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Group habits by category
  const habitsByCategory = {
    all: habits || [],
    health: habits?.filter(h => h.category === 'health') || [],
    fitness: habits?.filter(h => h.category === 'fitness') || [],
    nutrition: habits?.filter(h => h.category === 'nutrition') || [],
    custom: habits?.filter(h => h.category === 'custom' || !h.category) || [],
  };

  const displayHabits = habitsByCategory[selectedCategory as keyof typeof habitsByCategory] || [];

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
        <div className="space-y-6">
          {/* Category Tabs + View Toggle */}
          <div className="flex items-center justify-between gap-4">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1">
              <TabsList className="glass-card border-white/10">
                <TabsTrigger value="all">Все ({habits.length})</TabsTrigger>
                <TabsTrigger value="health">Здоровье ({habitsByCategory.health.length})</TabsTrigger>
                <TabsTrigger value="fitness">Фитнес ({habitsByCategory.fitness.length})</TabsTrigger>
                <TabsTrigger value="nutrition">Питание ({habitsByCategory.nutrition.length})</TabsTrigger>
                <TabsTrigger value="custom">Прочее ({habitsByCategory.custom.length})</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* View Mode Toggle */}
            <div className="flex gap-2 glass-card border-white/10 p-1 rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-primary/20' : ''}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-primary/20' : ''}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Habits Grid/List */}
          <div className={
            viewMode === 'grid' 
              ? "grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 stagger-fade-in"
              : "space-y-4 stagger-fade-in"
          }>
            {displayHabits.map((habit, index) => (
              <div key={habit.id} style={{ animationDelay: `${index * 50}ms` }}>
                <HabitCard 
                  habit={habit} 
                  onCompleted={refetch}
                />
              </div>
            ))}
          </div>

          {displayHabits.length === 0 && selectedCategory !== 'all' && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Нет привычек в категории "{selectedCategory}"
              </p>
            </div>
          )}
        </div>
      )}

      <HabitCreateDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
