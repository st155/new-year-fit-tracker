import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WorkoutExercise {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

interface TrainingPlanWorkout {
  id: string;
  day_of_week: number;
  workout_name: string;
  description?: string | null;
  exercises: WorkoutExercise[];
}

interface AssignedClient {
  id: string;
  client_id: string;
  start_date: string;
  end_date: string | null;
  status: string;
  profiles: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface TrainingPlanDetail {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
  created_at: string;
  trainer_id: string;
  training_plan_workouts: TrainingPlanWorkout[];
  assigned_training_plans: AssignedClient[];
}

export const useTrainingPlanDetail = (planId: string | null) => {
  const [plan, setPlan] = useState<TrainingPlanDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadPlan = async () => {
    if (!planId) {
      console.log('❌ No planId provided');
      return;
    }

    console.log('🔄 Loading training plan:', planId);
    setLoading(true);
    try {
      // Load plan with workouts and assigned clients
      const { data, error } = await supabase
        .from('training_plans')
        .select(`
          *,
          training_plan_workouts (*),
          assigned_training_plans (
            id,
            client_id,
            start_date,
            end_date,
            status,
            profiles (
              user_id,
              username,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('id', planId)
        .maybeSingle();

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      console.log('✅ Plan loaded successfully:', {
        planId,
        planName: data?.name,
        workoutsCount: data?.training_plan_workouts?.length || 0,
        assignedClientsCount: data?.assigned_training_plans?.length || 0
      });
      
      if (!data) {
        console.warn('⚠️ Plan not found');
        throw new Error('План не найден');
      }
      
      setPlan(data as any);
    } catch (error: any) {
      console.error('❌ Error loading plan:', {
        planId,
        error: error?.message || error,
        details: error?.details,
        hint: error?.hint
      });
      
      toast({
        title: 'Ошибка',
        description: error?.message?.includes('не найден') 
          ? 'План не найден или был удален'
          : 'Не удалось загрузить план тренировок',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async () => {
    if (!planId) return false;

    try {
      const { error } = await supabase
        .from('training_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'План удален'
      });
      return true;
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить план',
        variant: 'destructive'
      });
      return false;
    }
  };

  const duplicatePlan = async () => {
    if (!plan) return null;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Create new plan
      const { data: newPlan, error: planError } = await supabase
        .from('training_plans')
        .insert({
          trainer_id: user.user.id,
          name: `${plan.name} (копия)`,
          description: plan.description,
          duration_weeks: plan.duration_weeks
        })
        .select()
        .single();

      if (planError) throw planError;

      // Copy workouts
      const workoutsToInsert = plan.training_plan_workouts.map(w => ({
        plan_id: newPlan.id,
        day_of_week: w.day_of_week,
        workout_name: w.workout_name,
        description: w.description || null,
        exercises: w.exercises as any
      }));

      const { error: workoutsError } = await supabase
        .from('training_plan_workouts')
        .insert(workoutsToInsert);

      if (workoutsError) throw workoutsError;

      toast({
        title: 'Успешно',
        description: 'План скопирован'
      });

      return newPlan.id;
    } catch (error) {
      console.error('Error duplicating plan:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось скопировать план',
        variant: 'destructive'
      });
      return null;
    }
  };

  useEffect(() => {
    loadPlan();
  }, [planId]);

  return {
    plan,
    loading,
    refetch: loadPlan,
    deletePlan,
    duplicatePlan
  };
};
