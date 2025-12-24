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
import { ManualWorkoutDialog } from "@/components/workout/manual/ManualWorkoutDialog";
import { FileText, Calendar, Sparkles, Plane } from "lucide-react";

import { ProgressChartCard } from "@/components/workout-v31/widgets/ProgressChartCard";
import { MicroTrackerCard } from "@/components/workout-v31/widgets/MicroTrackerCard";
import { LogbookSnippetCard } from "@/components/workout-v31/widgets/LogbookSnippetCard";
import Logbook from "@/components/workout/Logbook";

// Wellness components
import { CreateWellnessPlanDialog } from "@/components/wellness/CreateWellnessPlanDialog";
import { QuickActivityLogger } from "@/components/wellness/QuickActivityLogger";
import { WellnessWeekView } from "@/components/wellness/WellnessWeekView";
import { TodayActivitiesCard } from "@/components/wellness/TodayActivitiesCard";
import { WeeklyGapAnalysis } from "@/components/wellness/WeeklyGapAnalysis";
import { GenerateTravelWorkoutDialog } from "@/components/wellness/GenerateTravelWorkoutDialog";

export default function WorkoutV31() {
  const [activeTab, setActiveTab] = useState("today");
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [manualWorkoutOpen, setManualWorkoutOpen] = useState(false);
  const [wellnessPlanOpen, setWellnessPlanOpen] = useState(false);
  const [travelWorkoutOpen, setTravelWorkoutOpen] = useState(false);
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
    metrics,
    period,
    setPeriod,
    category,
    setCategory,
    isBodyweightExercise
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

  const vitalData = useMemo(() => [
    { date: "Пн", value: 85 },
    { date: "Вт", value: 78 },
    { date: "Ср", value: 92 },
    { date: "Чт", value: 88 },
    { date: "Пт", value: 75 },
    { date: "Сб", value: 90 },
    { date: "Вс", value: 87 }
  ], []);

  // Note: removed blocking skeleton - each widget shows its own loading state

  const handleManualWorkoutSuccess = () => {
    // Cache invalidation happens inside the dialog
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <ManualWorkoutDialog 
        open={manualWorkoutOpen} 
        onOpenChange={setManualWorkoutOpen}
        onSuccess={handleManualWorkoutSuccess}
      />
      
      <CreateWellnessPlanDialog
        open={wellnessPlanOpen}
        onOpenChange={setWellnessPlanOpen}
        onSuccess={() => {}}
      />
      
      <GenerateTravelWorkoutDialog
        open={travelWorkoutOpen}
        onOpenChange={setTravelWorkoutOpen}
      />
      
      <div className="max-w-[1800px] mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <WorkoutDayNavigator
            planName={dailyWorkout?.plan_name || "Тренировки"}
            weekNumber={dailyWorkout?.week_number || 1}
            dayOfWeek={selectedDay}
            onDayChange={setSelectedDay}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWellnessPlanOpen(true)}
              className="hidden sm:flex items-center gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              <Calendar className="w-4 h-4" />
              Wellness-план
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManualWorkoutOpen(true)}
              className="hidden sm:flex items-center gap-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            >
              <FileText className="w-4 h-4" />
              Записать тренировку
            </Button>
          </div>
        </div>
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
          <>
            {/* Desktop: 3-column grid inside "today" tab */}
            <TabsContent value="today" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Today - Actions */}
                <div className="space-y-6">
                  {/* Quick Actions Card */}
                  <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800 border-neutral-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Записать активность</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button
                        onClick={() => setManualWorkoutOpen(true)}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Записать силовую тренировку
                      </Button>
                      <Button
                        onClick={() => setTravelWorkoutOpen(true)}
                        variant="outline"
                        className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                      >
                        <Plane className="w-4 h-4 mr-2" />
                        Тренировка в поездке
                      </Button>
                      <Button
                        onClick={() => setWellnessPlanOpen(true)}
                        variant="outline"
                        className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Создать Wellness-расписание
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Today's scheduled activities */}
                  <TodayActivitiesCard />

                  {/* Quick activity logger */}
                  <QuickActivityLogger />
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
                    period={period}
                    onPeriodChange={setPeriod}
                    category={category}
                    onCategoryChange={setCategory}
                    isBodyweightExercise={isBodyweightExercise}
                  />
                  <WeeklyGapAnalysis 
                    onGenerateWorkout={() => setTravelWorkoutOpen(true)} 
                    compact 
                  />
                </div>

                <div className="space-y-6">
                  <WellnessWeekView compact />
                  <LogbookSnippetCard workouts={workouts} isLoading={isHistoryLoading} />
                </div>
              </div>
            </TabsContent>

            {/* Desktop: Progress tab */}
            <TabsContent value="progress" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ProgressChartCard
                  selectedMetric={selectedMetric}
                  onMetricChange={setSelectedMetric}
                  chartData={chartData}
                  metrics={metrics}
                  availableMetrics={availableMetrics}
                  workouts={workouts}
                  period={period}
                  onPeriodChange={setPeriod}
                  category={category}
                  onCategoryChange={setCategory}
                  isBodyweightExercise={isBodyweightExercise}
                />
                <WeeklyGapAnalysis onGenerateWorkout={() => setTravelWorkoutOpen(true)} />
              </div>
            </TabsContent>

            {/* Desktop: Logbook tab */}
            <TabsContent value="logbook" className="mt-0">
              <Logbook />
            </TabsContent>
          </>
        ) : (
          // Mobile: Tab-based content switching
          <>
            <TabsContent value="today" className="space-y-6 mt-0">
              {/* Mobile quick actions */}
              <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800 border-neutral-700">
                <CardContent className="pt-6 space-y-3">
                  <Button
                    onClick={() => setManualWorkoutOpen(true)}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Записать силовую
                  </Button>
                  <Button
                    onClick={() => setTravelWorkoutOpen(true)}
                    variant="outline"
                    className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  >
                    <Plane className="w-4 h-4 mr-2" />
                    Тренировка в поездке
                  </Button>
                  <Button
                    onClick={() => setWellnessPlanOpen(true)}
                    variant="outline"
                    className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Wellness-расписание
                  </Button>
                </CardContent>
              </Card>

              <TodayActivitiesCard />
              <QuickActivityLogger />
              <WellnessWeekView compact />
            </TabsContent>

            <TabsContent value="progress" className="space-y-6 mt-0">
              <ProgressChartCard
                selectedMetric={selectedMetric}
                onMetricChange={setSelectedMetric}
                chartData={chartData}
                metrics={metrics}
                availableMetrics={availableMetrics}
                workouts={workouts}
                period={period}
                onPeriodChange={setPeriod}
                category={category}
                onCategoryChange={setCategory}
                isBodyweightExercise={isBodyweightExercise}
              />
              <WeeklyGapAnalysis onGenerateWorkout={() => setTravelWorkoutOpen(true)} />
            </TabsContent>

            <TabsContent value="logbook" className="mt-0">
              <Logbook />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
