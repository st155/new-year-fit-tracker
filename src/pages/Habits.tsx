import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { AnimatedPage } from "@/components/layout/AnimatedPage";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useHabits } from "@/hooks/useHabits";
import { useGoalHabitSync } from "@/hooks/useGoalHabitSync";
import { HabitMigrationButton } from "@/components/habits/HabitMigrationButton";
import { HabitCard } from "@/components/habits/HabitCard";
import { EnhancedHabitCard } from "@/components/habits/EnhancedHabitCard";
import { HabitStats } from "@/components/habits/HabitStats";
import { HabitCreateDialog } from "@/components/habits/HabitCreateDialog";
import { HabitsOverviewChart } from "@/components/habits/HabitsOverviewChart";
import { HabitProgressChart } from "@/components/habits/HabitProgressChart";
import { HabitCalendarHeatmap } from "@/components/habits/HabitCalendarHeatmap";
import { IntermittentFastingWidget } from "@/components/habits/IntermittentFastingWidget";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Target, LayoutGrid, List, Clock, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useHabitProgress } from "@/hooks/useHabitProgress";
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type TimeFilter = 'today' | 'week' | 'month';
type ViewMode = 'cards' | 'charts';

export default function Habits() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { habits, isLoading, refetch } = useHabits(user?.id);
  
  // Enable auto-logging for goal-habit integration
  useGoalHabitSync(user?.id);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [dateOffset, setDateOffset] = useState(0);
  const [detailView, setDetailView] = useState<ViewMode>('cards');
  const [showMigrationBanner, setShowMigrationBanner] = useState(true);

  // Load banner preference from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('habits_legacy_banner_dismissed');
    if (dismissed === 'true') {
      setShowMigrationBanner(false);
    }
  }, []);

  const handleDismissBanner = () => {
    localStorage.setItem('habits_legacy_banner_dismissed', 'true');
    setShowMigrationBanner(false);
  };

  // Group habits by category
  const habitsByCategory = {
    all: habits || [],
    health: habits?.filter(h => h.category === 'health') || [],
    fitness: habits?.filter(h => h.category === 'fitness') || [],
    nutrition: habits?.filter(h => h.category === 'nutrition') || [],
    custom: habits?.filter(h => h.category === 'custom' || !h.category) || [],
  };

  const displayHabits = habitsByCategory[selectedCategory as keyof typeof habitsByCategory] || [];

  // Calculate date range for progress tracking
  const calculateDateRange = useMemo(() => {
    const today = new Date();
    let start: Date, end: Date;

    switch (timeFilter) {
      case 'today':
        start = startOfDay(subDays(today, dateOffset));
        end = endOfDay(subDays(today, dateOffset));
        break;
      case 'week':
        start = startOfDay(subDays(today, 7 + dateOffset * 7));
        end = endOfDay(subDays(today, dateOffset * 7));
        break;
      case 'month':
        start = startOfDay(subDays(today, 30 + dateOffset * 30));
        end = endOfDay(subDays(today, dateOffset * 30));
        break;
    }

    return { start, end };
  }, [timeFilter, dateOffset]);

  // Fetch completion data for overview chart
  const { data: completionData } = useQuery({
    queryKey: ['habits-completion-overview', user?.id, calculateDateRange],
    queryFn: async () => {
      if (!user || !habits || habits.length === 0) return { rate: 0, history: [] };

      const { data: completions } = await supabase
        .from('habit_completions')
        .select('completed_at, habit_id')
        .eq('user_id', user.id)
        .gte('completed_at', calculateDateRange.start.toISOString())
        .lte('completed_at', calculateDateRange.end.toISOString());

      // Calculate daily completion rate
      const dailyRates: Record<string, number> = {};
      const currentDate = new Date(calculateDateRange.start);
      const endDate = new Date(calculateDateRange.end);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayCompletions = completions?.filter(c => c.completed_at.startsWith(dateStr)).length || 0;
        dailyRates[dateStr] = habits.length > 0 ? (dayCompletions / habits.length) * 100 : 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const history = Object.entries(dailyRates).map(([date, rate]) => ({
        date: format(new Date(date), 'dd MMM', { locale: ru }),
        rate,
      }));

      const avgRate = Object.values(dailyRates).reduce((a, b) => a + b, 0) / Object.values(dailyRates).length || 0;

      return { rate: avgRate, history };
    },
    enabled: !!user && !!habits && habits.length > 0,
  });

  const getDateLabel = () => {
    const { start, end } = calculateDateRange;
    
    if (timeFilter === 'today') {
      return format(start, 'd MMMM yyyy', { locale: ru });
    }
    
    return `${format(start, 'd MMM', { locale: ru })} - ${format(end, 'd MMM yyyy', { locale: ru })}`;
  };

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
    <AnimatedPage className="container py-6 space-y-8">
      {/* Enhanced Migration Banner */}
      {showMigrationBanner && (
        <Alert className="border-primary/30 bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
          <AlertTitle className="text-xl font-bold">Доступна новая версия Habits 3.0! 🎉</AlertTitle>
          <AlertDescription>
            <p className="mb-3 text-foreground">
              Улучшенная система отслеживания с новыми возможностями:
            </p>
            <ul className="list-disc list-inside space-y-1 mb-4 text-sm text-muted-foreground">
              <li>🎯 Умная организация по времени суток</li>
              <li>⚡ Быстрые свайп-жесты для отметки</li>
              <li>✨ Система уровней и XP за выполнение</li>
              <li>👥 Социальные функции и командные челленджи</li>
              <li>📊 Улучшенная аналитика и инсайты</li>
            </ul>
            <div className="flex gap-3 flex-wrap">
              <Button onClick={() => navigate('/habits-v3')} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Попробовать Habits 3.0
              </Button>
              <Button variant="ghost" onClick={handleDismissBanner}>
                Напомнить позже
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

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

      {/* Time filters + Date Navigator */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Time filters */}
          <div className="flex items-center gap-2">
            <Button
              variant={timeFilter === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setTimeFilter('today'); setDateOffset(0); }}
            >
              Сегодня
            </Button>
            <Button
              variant={timeFilter === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setTimeFilter('week'); setDateOffset(0); }}
            >
              Неделя
            </Button>
            <Button
              variant={timeFilter === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setTimeFilter('month'); setDateOffset(0); }}
            >
              Месяц
            </Button>
          </div>
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setDateOffset(prev => prev + 1)}
          >
            ← Назад
          </Button>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{getDateLabel()}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setDateOffset(prev => Math.max(0, prev - 1))}
            disabled={dateOffset === 0}
          >
            Вперед →
          </Button>
        </div>
      </div>

      {/* Overview Chart */}
      {habits && habits.length > 0 && completionData && (
        <HabitsOverviewChart
          completionRate={completionData.rate}
          history={completionData.history}
        />
      )}

      <HabitStats userId={user?.id} />

      {/* Special Widgets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Специальные виджеты</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <IntermittentFastingWidget />
          {/* Future widgets: WaterIntakeWidget, SleepQualityWidget, etc. */}
        </div>
      </div>

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
        <Tabs value={detailView} onValueChange={(v) => setDetailView(v as ViewMode)} className="space-y-6">
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

            {/* Cards/Charts/Calendar Toggle */}
            <TabsList className="glass-card border-white/10">
              <TabsTrigger value="cards">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Карточки
              </TabsTrigger>
              <TabsTrigger value="charts">
                <List className="h-4 w-4 mr-2" />
                Графики
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Календарь
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Cards View */}
          <TabsContent value="cards" className="mt-0">
            <motion.div
              className={
                viewMode === 'grid' 
                  ? "grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
                  : "space-y-4"
              }
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {displayHabits.map((habit) => (
                <motion.div key={habit.id} variants={staggerItem}>
                  {habit.habit_type === 'daily_check' || !habit.habit_type ? (
                    <EnhancedHabitCard 
                      habit={habit} 
                      onCompleted={refetch}
                    />
                  ) : (
                    <HabitCard 
                      habit={habit} 
                      onCompleted={refetch}
                    />
                  )}
                </motion.div>
              ))}
            </motion.div>

            {displayHabits.length === 0 && selectedCategory !== 'all' && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Нет привычек в категории "{selectedCategory}"
                </p>
              </div>
            )}
          </TabsContent>

          {/* Charts View */}
          <TabsContent value="charts" className="mt-0 space-y-6">
            {displayHabits.map((habit) => (
              <HabitProgressChartWrapper
                key={habit.id}
                habit={habit}
                dateRange={calculateDateRange}
              />
            ))}
            
            {displayHabits.length === 0 && selectedCategory !== 'all' && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Нет привычек в категории "{selectedCategory}"
                </p>
              </div>
            )}
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar" className="mt-0">
            <div className="glass-card border-white/10 p-6">
              <HabitCalendarHeatmap 
                userId={user?.id}
                habitIds={selectedCategory === 'all' ? undefined : displayHabits.map(h => h.id)}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}

      <HabitCreateDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </AnimatedPage>
  );
}

// Wrapper component to handle habit progress data fetching
function HabitProgressChartWrapper({ 
  habit, 
  dateRange 
}: { 
  habit: any; 
  dateRange: { start: Date; end: Date } 
}) {
  const { data: progressData, isLoading } = useHabitProgress(habit.id, dateRange);

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  if (!progressData || progressData.length === 0) {
    return null;
  }

  return (
    <HabitProgressChart
      habitId={habit.id}
      habitName={habit.name}
      habitType={habit.habit_type || 'daily_check'}
      data={progressData}
    />
  );
}
