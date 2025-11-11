import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useDailyWorkout } from "@/hooks/useDailyWorkout";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { useProgressMetrics } from "@/hooks/useProgressMetrics";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays } from "date-fns";
import { ru } from "date-fns/locale";

// Widgets
import { AIInsightCard } from "@/components/workout-v31/widgets/AIInsightCard";
import { CTAButtons } from "@/components/workout-v31/widgets/CTAButtons";
import { TodaysPlanCard } from "@/components/workout-v31/widgets/TodaysPlanCard";
import { WeeklySplitCard } from "@/components/workout-v31/widgets/WeeklySplitCard";
import { ProgressChartCard } from "@/components/workout-v31/widgets/ProgressChartCard";
import { MicroTrackerCard } from "@/components/workout-v31/widgets/MicroTrackerCard";
import { LogbookSnippetCard } from "@/components/workout-v31/widgets/LogbookSnippetCard";

export default function WorkoutV31() {
  const [activeTab, setActiveTab] = useState<"today" | "progress" | "logbook">("today");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { user } = useAuth();
  
  const { data: dailyWorkout, isLoading: isDailyLoading } = useDailyWorkout(user?.id);
  const { workouts } = useWorkoutHistory();
  const { selectedMetric, setSelectedMetric, availableMetrics, chartData, metrics } = useProgressMetrics();

  // Column 1: Today's Data
  const todayData = useMemo(() => {
    const recoveryScore = dailyWorkout?.readiness?.recovery_score || 85;
    const aiMessage = dailyWorkout?.ai_rationale || "Отличное восстановление! Можно увеличить интенсивность.";
    const exercises = dailyWorkout?.adjusted_exercises || [];
    
    return { recoveryScore, aiMessage, exercises };
  }, [dailyWorkout]);

  // Weekly split mock data
  const weeklyDays = useMemo(() => [
    { name: "Пн: Грудь/Спина", completed: true, isToday: false },
    { name: "Вт: Ноги", completed: true, isToday: false },
    { name: "Ср: Отдых", completed: true, isToday: false },
    { name: "Чт: Плечи/Руки", completed: false, isToday: true },
    { name: "Пт: Кардио", completed: false, isToday: false },
    { name: "Сб: Ноги", completed: false, isToday: false },
    { name: "Вс: Отдых", completed: false, isToday: false },
  ], []);

  // Column 2: Micro Tracker (7-day vitals)
  const vitalData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      date: format(subDays(new Date(), 6 - i), 'EEE', { locale: ru }),
      value: Math.floor(60 + Math.random() * 40)
    }));
  }, []);

  // Column 3: Logbook entries
  const logbookEntries = useMemo(() => {
    return workouts.slice(0, 5).map(w => ({
      date: format(new Date(w.date), 'dd MMM', { locale: ru }),
      workout: w.name || "Тренировка",
      hasPR: Math.random() > 0.7,
      prDetails: "Жим лёжа 105 кг → 107.5 кг"
    }));
  }, [workouts]);

  const handleStartWorkout = () => {
    console.log("Starting workout...");
  };

  const handleSkipWorkout = () => {
    console.log("Skipping workout...");
  };

  const handlePreviewWorkout = () => {
    console.log("Previewing workout...");
  };

  if (isDailyLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="w-12 h-12 text-cyan-400 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Dumbbell className="w-8 h-8 text-cyan-400" />
        <h1 className="text-3xl font-bold">Тренировки</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="bg-neutral-900 border border-neutral-800 mb-6">
          <TabsTrigger 
            value="today"
            className="data-[state=active]:bg-neutral-800 data-[state=active]:shadow-[0_2px_8px_rgba(6,182,212,0.4)]"
          >
            Сегодня
          </TabsTrigger>
          <TabsTrigger 
            value="progress"
            className="data-[state=active]:bg-neutral-800 data-[state=active]:shadow-[0_2px_8px_rgba(6,182,212,0.4)]"
          >
            Прогресс
          </TabsTrigger>
          <TabsTrigger 
            value="logbook"
            className="data-[state=active]:bg-neutral-800 data-[state=active]:shadow-[0_2px_8px_rgba(6,182,212,0.4)]"
          >
            Журнал
          </TabsTrigger>
        </TabsList>

        {isDesktop ? (
          // Desktop: 3-column grid layout
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Today */}
            <div className="space-y-6">
              <AIInsightCard 
                recoveryScore={todayData.recoveryScore} 
                message={todayData.aiMessage}
              />
              <CTAButtons
                onStart={handleStartWorkout}
                onSkip={handleSkipWorkout}
                onPreview={handlePreviewWorkout}
              />
              <TodaysPlanCard 
                exercises={todayData.exercises}
                workoutName={dailyWorkout?.workout_name}
              />
            </div>

            {/* Column 2: Progress */}
            <div className="space-y-6">
              <ProgressChartCard
                selectedMetric={selectedMetric}
                onMetricChange={setSelectedMetric}
                chartData={chartData}
                metrics={metrics}
                availableMetrics={availableMetrics}
              />
              <MicroTrackerCard
                title="Показатели за 7 дней"
                data={vitalData}
                color="purple"
                valueFormatter={(v) => `${v}%`}
              />
            </div>

            {/* Column 3: Logbook */}
            <div className="space-y-6">
              <WeeklySplitCard days={weeklyDays} />
              <LogbookSnippetCard entries={logbookEntries} />
            </div>
          </div>
        ) : (
          // Mobile: Tab-based content switching
          <>
            <TabsContent value="today" className="space-y-6 mt-0">
              <AIInsightCard 
                recoveryScore={todayData.recoveryScore} 
                message={todayData.aiMessage}
              />
              <CTAButtons
                onStart={handleStartWorkout}
                onSkip={handleSkipWorkout}
                onPreview={handlePreviewWorkout}
              />
              <TodaysPlanCard 
                exercises={todayData.exercises}
                workoutName={dailyWorkout?.workout_name}
              />
              <WeeklySplitCard days={weeklyDays} />
            </TabsContent>

            <TabsContent value="progress" className="space-y-6 mt-0">
              <ProgressChartCard
                selectedMetric={selectedMetric}
                onMetricChange={setSelectedMetric}
                chartData={chartData}
                metrics={metrics}
                availableMetrics={availableMetrics}
              />
              <MicroTrackerCard
                title="Показатели за 7 дней"
                data={vitalData}
                color="purple"
                valueFormatter={(v) => `${v}%`}
              />
            </TabsContent>

            <TabsContent value="logbook" className="space-y-6 mt-0">
              <LogbookSnippetCard entries={logbookEntries} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
