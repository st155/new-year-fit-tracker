import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDailyWorkout } from "@/hooks/useDailyWorkout";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { useProgressMetrics } from "@/hooks/useProgressMetrics";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import WorkoutDayNavigator from "@/components/workout/WorkoutDayNavigator";
import { WorkoutV31Skeleton } from "@/components/workout-v31/WorkoutV31Skeleton";

import { AIInsightCard } from "@/components/workout-v31/widgets/AIInsightCard";
import { CTAButtons } from "@/components/workout-v31/widgets/CTAButtons";
import { TodaysPlanCard } from "@/components/workout-v31/widgets/TodaysPlanCard";
import { ProgressChartCard } from "@/components/workout-v31/widgets/ProgressChartCard";
import { MicroTrackerCard } from "@/components/workout-v31/widgets/MicroTrackerCard";
import { WeeklySplitCard } from "@/components/workout-v31/widgets/WeeklySplitCard";
import { LogbookSnippetCard } from "@/components/workout-v31/widgets/LogbookSnippetCard";

export default function WorkoutV31() {
  const [activeTab, setActiveTab] = useState("today");
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Calculate date for selected day
  const getDateForDay = (dayOfWeek: number): Date => {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = dayOfWeek - currentDay;
    return addDays(today, diff);
  };

  const targetDate = getDateForDay(selectedDay);

  // Fetch data
  const { data: dailyWorkout, isLoading: isDailyLoading } = useDailyWorkout(
    user?.id, 
    format(targetDate, 'yyyy-MM-dd')
  );
  const { workouts, isLoading: isHistoryLoading } = useWorkoutHistory("all");
  const { 
    selectedMetric, 
    setSelectedMetric, 
    availableMetrics, 
    chartData, 
    metrics 
  } = useProgressMetrics(user?.id);

  // Button handlers
  const handleStartWorkout = () => {
    if (!dailyWorkout?.success || dailyWorkout.is_rest_day) {
      toast.error("Невозможно начать тренировку", {
        description: dailyWorkout?.is_rest_day ? "Сегодня день отдыха" : "Нет активного плана тренировок"
      });
      return;
    }
    
    const workoutData = {
      planId: dailyWorkout.assigned_plan_id || '',
      weekNumber: dailyWorkout.week_number || 1,
      dayOfWeek: dailyWorkout.day_of_week || 0,
      workoutName: dailyWorkout.workout_name || '',
      exercises: dailyWorkout.adjusted_exercises || []
    };
    
    sessionStorage.setItem('activeWorkout', JSON.stringify(workoutData));
    navigate('/workouts/live-logger');
  };

  const handleSkipWorkout = () => {
    toast.info("Тренировка пропущена", {
      description: "Старайтесь быть последовательным в тренировках!"
    });
  };

  const handlePreviewWorkout = () => {
    toast.success("Режим просмотра", {
      description: "Ознакомьтесь со всеми упражнениями перед началом"
    });
  };

  // Prepare data for widgets
  const todayData = useMemo(() => {
    if (!dailyWorkout) return { exercises: [], recoveryScore: 0, message: "" };
    
    return {
      exercises: dailyWorkout.adjusted_exercises || [],
      recoveryScore: dailyWorkout.readiness?.total_score || 0,
      message: dailyWorkout.ai_rationale || "AI анализирует ваше восстановление"
    };
  }, [dailyWorkout]);

  const weeklyDays = useMemo(() => {
    const today = new Date().getDay();
    const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    
    return daysOfWeek.map((day, index) => ({
      name: `${day}: ${index === 0 || index === 3 || index === 6 ? 'Отдых' : 'Тренировка'}`,
      completed: index < today,
      isToday: index === today
    }));
  }, []);

  const vitalData = useMemo(() => [
    { date: "Пн", value: 85 },
    { date: "Вт", value: 78 },
    { date: "Ср", value: 92 },
    { date: "Чт", value: 88 },
    { date: "Пт", value: 75 },
    { date: "Сб", value: 90 },
    { date: "Вс", value: 87 }
  ], []);

  const logbookEntries = useMemo(() => {
    return workouts.slice(0, 5).map(w => {
      const hasPR = w.volume ? w.volume > 5000 : false;
      
      return {
        date: format(new Date(w.date), 'dd MMM', { locale: ru }),
        workout: w.name || "Тренировка",
        hasPR,
        prDetails: hasPR ? `Объём ${w.volume?.toFixed(0)} кг` : undefined
      };
    });
  }, [workouts]);

  // Show skeleton during initial load
  if (isDailyLoading && isHistoryLoading) {
    return <WorkoutV31Skeleton />;
  }

  // Determine plan and rest day status
  const hasPlan = !!dailyWorkout?.assigned_plan_id || !!dailyWorkout?.success;
  const isRestDay = !!dailyWorkout?.is_rest_day;

  // Dynamic CTA button props
  const startLabel = !hasPlan ? "Создать план" : isRestDay ? "День отдыха" : "Начать тренировку";
  const startDisabled = !hasPlan || isRestDay;
  const handleStartClick = () => {
    if (!hasPlan) {
      navigate('/workouts/manage');
    } else if (isRestDay) {
      toast.info("Сегодня день отдыха", {
        description: "Используйте это время для восстановления"
      });
    } else {
      handleStartWorkout();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="max-w-[1800px] mx-auto mb-6">
        <WorkoutDayNavigator
          planName={dailyWorkout.plan_name || "План тренировок"}
          weekNumber={dailyWorkout.week_number || 1}
          dayOfWeek={selectedDay}
          onDayChange={setSelectedDay}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-[1800px] mx-auto">
        <TabsList className="bg-neutral-900 border border-neutral-800 mb-6">
          <TabsTrigger 
            value="today"
            className="data-[state=active]:bg-neutral-800 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_12px_rgba(6,182,212,0.5)]"
          >
            Сегодня
          </TabsTrigger>
          <TabsTrigger 
            value="progress"
            className="data-[state=active]:bg-neutral-800 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_12px_rgba(6,182,212,0.5)]"
          >
            Прогресс
          </TabsTrigger>
          <TabsTrigger 
            value="logbook"
            className="data-[state=active]:bg-neutral-800 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_0_12px_rgba(6,182,212,0.5)]"
          >
            Журнал
          </TabsTrigger>
        </TabsList>

        {isDesktop ? (
          // Desktop: 3-column grid inside "today" tab
          <TabsContent value="today" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column 1: Today */}
              <div className="space-y-6">
                {isRestDay && (
                  <Card className="bg-neutral-900 border border-blue-500/30">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        🧘 День отдыха
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Сегодня день восстановления. Используйте это время для отдыха и восстановления мышц.
                      </p>
                    </CardContent>
                  </Card>
                )}
                <AIInsightCard 
                  recoveryScore={todayData.recoveryScore} 
                  message={todayData.message}
                />
                <CTAButtons 
                  onStart={handleStartClick}
                  onSkip={handleSkipWorkout}
                  onPreview={handlePreviewWorkout}
                  startLabel={startLabel}
                  startDisabled={startDisabled}
                />
                {!hasPlan && (
                  <Card className="bg-gradient-to-br from-green-900/20 to-cyan-900/20 border border-green-500/30">
                    <CardContent className="pt-6">
                      <h3 className="text-lg font-semibold mb-2">Нет активного плана</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Создайте тренировочный план для начала работы
                      </p>
                      <Button 
                        className="w-full bg-gradient-to-r from-green-400 to-cyan-500 hover:from-green-500 hover:to-cyan-600 text-neutral-950 font-semibold"
                        onClick={() => navigate('/workouts/manage')}
                      >
                        Создать план
                      </Button>
                    </CardContent>
                  </Card>
                )}
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
                  workouts={workouts}
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
                <LogbookSnippetCard workouts={workouts} />
              </div>
            </div>
          </TabsContent>
        ) : (
          // Mobile: Tab-based content switching
          <>
            <TabsContent value="today" className="space-y-6 mt-0">
              {isRestDay && (
                <Card className="bg-neutral-900 border border-blue-500/30">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      🧘 День отдыха
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Сегодня день восстановления. Используйте это время для отдыха и восстановления мышц.
                    </p>
                  </CardContent>
                </Card>
              )}
              <AIInsightCard 
                recoveryScore={todayData.recoveryScore} 
                message={todayData.message}
              />
              <CTAButtons 
                onStart={handleStartClick}
                onSkip={handleSkipWorkout}
                onPreview={handlePreviewWorkout}
                startLabel={startLabel}
                startDisabled={startDisabled}
              />
              {!hasPlan && (
                <Card className="bg-gradient-to-br from-green-900/20 to-cyan-900/20 border border-green-500/30">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-2">Нет активного плана</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Создайте тренировочный план для начала работы
                    </p>
                    <Button 
                      className="w-full bg-gradient-to-r from-green-400 to-cyan-500 hover:from-green-500 hover:to-cyan-600 text-neutral-950 font-semibold"
                      onClick={() => navigate('/workouts/manage')}
                    >
                      Создать план
                    </Button>
                  </CardContent>
                </Card>
              )}
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
                workouts={workouts}
              />
              <MicroTrackerCard
                title="Показатели за 7 дней"
                data={vitalData}
                color="purple"
                valueFormatter={(v) => `${v}%`}
              />
            </TabsContent>

            <TabsContent value="logbook" className="space-y-6 mt-0">
              <LogbookSnippetCard workouts={workouts} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
