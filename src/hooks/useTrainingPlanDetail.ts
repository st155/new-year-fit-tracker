import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import i18n from '@/i18n';

interface WorkoutExercise {
  exercise_id: string;
  exercise_name: string;
  exercise_type?: 'strength' | 'cardio' | 'bodyweight';
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
  weight?: number;
  weight_unit?: 'kg' | 'lbs';
  tempo?: string;
  distance?: number;
  duration?: number;
  pace?: string;
  intensity?: 'low' | 'moderate' | 'high' | 'intervals';
  target_metric?: string;
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
  } | null;
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
      // 1️⃣ Load base plan data
      const { data: planData, error: planError } = await supabase
        .from('training_plans')
        .select('*')
        .eq('id', planId)
        .single();
      
      if (planError) throw planError;
      if (!planData) throw new Error(i18n.t('trainingPlan:toast.planNotFound'));
      
      console.log('✅ Plan base data loaded:', planData.name);
      
      // 2️⃣ Load workouts
      const { data: workouts, error: workoutsError } = await supabase
        .from('training_plan_workouts')
        .select('*')
        .eq('plan_id', planId)
        .order('day_of_week');
      
      if (workoutsError) throw workoutsError;
      console.log('✅ Workouts loaded:', workouts?.length || 0);
      
      // 3️⃣ Load assigned plans
      const { data: assignedPlans, error: assignedError } = await supabase
        .from('assigned_training_plans')
        .select('id, client_id, start_date, end_date, status')
        .eq('plan_id', planId);
      
      if (assignedError) throw assignedError;
      console.log('✅ Assigned plans loaded:', assignedPlans?.length || 0);
      
      // 4️⃣ Load profiles for assigned clients (if any)
      let assignedWithProfiles = [];
      if (assignedPlans && assignedPlans.length > 0) {
        const clientIds = assignedPlans.map(a => a.client_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, avatar_url')
          .in('user_id', clientIds);
        
        if (profilesError) {
          console.warn('⚠️ Could not load profiles:', profilesError);
        }
        
        console.log('✅ Profiles loaded:', profiles?.length || 0);
        
        // 5️⃣ Merge data
        assignedWithProfiles = assignedPlans.map(assigned => ({
          ...assigned,
          profiles: profiles?.find(p => p.user_id === assigned.client_id) || null
        }));
      }
      
      // 6️⃣ Compose final object
      const fullPlan = {
        ...planData,
        training_plan_workouts: workouts || [],
        assigned_training_plans: assignedWithProfiles
      };
      
      setPlan(fullPlan as any);
      console.log('✅ Plan fully loaded:', {
        planId,
        planName: fullPlan.name,
        workoutsCount: fullPlan.training_plan_workouts.length,
        assignedClientsCount: fullPlan.assigned_training_plans.length
      });
      
    } catch (error: any) {
      console.error('❌ Error loading plan:', {
        planId,
        error: error?.message || error,
        details: error?.details,
        hint: error?.hint
      });
      
      toast({
        title: i18n.t('trainingPlan:toast.error'),
        description: error?.message?.includes('не найден') || error?.message?.includes('not found')
          ? i18n.t('trainingPlan:toast.planNotFoundOrDeleted')
          : i18n.t('trainingPlan:toast.loadFailed'),
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
        title: i18n.t('trainingPlan:toast.success'),
        description: i18n.t('trainingPlan:toast.deleted')
      });
      return true;
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: i18n.t('trainingPlan:toast.error'),
        description: i18n.t('trainingPlan:toast.deleteFailed'),
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
        title: i18n.t('trainingPlan:toast.success'),
        description: i18n.t('trainingPlan:toast.copied')
      });

      return newPlan.id;
    } catch (error) {
      console.error('Error duplicating plan:', error);
      toast({
        title: i18n.t('trainingPlan:toast.error'),
        description: i18n.t('trainingPlan:toast.copyFailed'),
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
