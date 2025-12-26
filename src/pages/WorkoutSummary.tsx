import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { BackgroundWaves } from "@/components/workout/BackgroundWaves";
import { WorkoutSummaryHeader } from "@/components/workout/summary/WorkoutSummaryHeader";
import { WorkoutStatsCard } from "@/components/workout/summary/WorkoutStatsCard";
import { FeelingSlider } from "@/components/workout/summary/FeelingSlider";
import { AIInsightCard } from "@/components/workout/summary/AIInsightCard";
import { CompletionButton } from "@/components/workout/summary/CompletionButton";
import { PageLoader } from "@/components/ui/page-loader";
import { syncTodayToEcho11, mapDurationToIntensity } from "@/utils/elite10Connector";

interface WorkoutStats {
  duration: number;
  totalVolume: number;
  totalExercises: number;
  totalSets: number;
  estimatedCalories: number;
}

export default function WorkoutSummary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [overallFeeling, setOverallFeeling] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchWorkoutStats();
  }, [user]);

  const fetchWorkoutStats = async () => {
    try {
      const summaryData = sessionStorage.getItem('workoutSummary');
      const startTime = sessionStorage.getItem('workoutStartTime');

      if (!summaryData || !startTime) {
        toast.error('Данные тренировки не найдены');
        navigate('/workouts');
        return;
      }

      const { planId } = JSON.parse(summaryData);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Fetch all workout logs for today's session
      const { data: workoutLogs, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user!.id)
        .gte('performed_at', startOfToday.toISOString())
        .order('performed_at', { ascending: true });

      if (error) throw error;

      if (!workoutLogs || workoutLogs.length === 0) {
        setStats({
          duration: 0,
          totalVolume: 0,
          totalExercises: 0,
          totalSets: 0,
          estimatedCalories: 0,
        });
        setIsLoading(false);
        return;
      }

      // Calculate stats
      const totalVolume = workoutLogs.reduce(
        (sum, log) => sum + ((log.actual_weight || 0) * (log.actual_reps || 0)),
        0
      );

      const uniqueExercises = new Set(workoutLogs.map(log => log.exercise_name)).size;
      const totalSets = workoutLogs.length;

      const endTime = new Date();
      const duration = Math.round(
        (endTime.getTime() - new Date(startTime).getTime()) / 60000
      );

      const estimatedCalories = Math.round(totalVolume * 0.005);

      setStats({
        duration,
        totalVolume: Math.round(totalVolume),
        totalExercises: uniqueExercises,
        totalSets,
        estimatedCalories,
      });
    } catch (error) {
      console.error('Error fetching workout stats:', error);
      toast.error('Ошибка загрузки статистики');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Save overall workout feedback
      const summaryData = JSON.parse(sessionStorage.getItem('workoutSummary') || '{}');
      const startTime = sessionStorage.getItem('workoutStartTime');

      // Note: workout_sessions table will be created later
      // For now, we just clear session storage and navigate
      if (stats && startTime) {
        console.log('Workout session completed:', {
          duration: stats.duration,
          volume: stats.totalVolume,
          feeling: overallFeeling,
        });
      }

      // 🔗 Sync to Echo11 after successful save
      if (stats && user) {
        const syncSecret = import.meta.env.VITE_ELITE10_SYNC_SECRET;
        if (syncSecret && syncSecret !== 'your-elite10-sync-secret-here') {
          const result = await syncTodayToEcho11(
            user.id,
            {
              sleep_quality: 70, // TODO: get from health data
              recovery_score: overallFeeling * 20, // 1-5 → 20-100
              workout_type: summaryData.planName || 'Workout',
              workout_intensity: mapDurationToIntensity(stats.duration),
              nutrition_status: 'Maintenance', // TODO: get from nutrition data
            },
            syncSecret
          );
          
          if (result.success) {
            console.log('✅ Synced to Echo11:', result.ai_strategy);
          } else {
            console.warn('⚠️ Echo11 sync failed:', result.error);
          }
        }
      }

      // Clear session storage
      sessionStorage.removeItem('workoutStartTime');
      sessionStorage.removeItem('workoutSummary');
      sessionStorage.removeItem('currentWorkoutData');

      toast.success('Тренировка сохранена!');
      navigate('/workouts');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Ошибка сохранения');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PageLoader message="Загрузка статистики..." />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <BackgroundWaves />
      
      <div className="relative z-10 container max-w-2xl mx-auto px-4 py-8 space-y-6">
        <WorkoutSummaryHeader />
        
        {stats && <WorkoutStatsCard stats={stats} />}
        
        <FeelingSlider value={overallFeeling} onChange={setOverallFeeling} />
        
        {stats && <AIInsightCard stats={stats} feeling={overallFeeling} />}
        
        <CompletionButton onClick={handleSubmit} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
}
