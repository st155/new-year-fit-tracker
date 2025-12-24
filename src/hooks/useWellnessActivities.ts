import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';

export interface WellnessActivity {
  id: string;
  user_id: string;
  plan_id: string | null;
  activity_type: string;
  name: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface WellnessPlan {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
  activities_config: Record<string, number>;
  status: string;
  start_date: string | null;
  created_at: string;
}

export function useWellnessPlans(userId?: string) {
  return useQuery({
    queryKey: ['wellness-plans', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('wellness_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WellnessPlan[];
    },
    enabled: !!userId,
  });
}

export function useActivePlan(userId?: string) {
  return useQuery({
    queryKey: ['wellness-plan-active', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('wellness_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as WellnessPlan | null;
    },
    enabled: !!userId,
  });
}

export function useWeeklyActivities(userId?: string, date?: Date) {
  const targetDate = date || new Date();
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

  return useQuery({
    queryKey: ['wellness-activities-week', userId, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('wellness_activities')
        .select('*')
        .eq('user_id', userId)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });
      
      if (error) throw error;
      return data as WellnessActivity[];
    },
    enabled: !!userId,
  });
}

export function useTodayActivities(userId?: string) {
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['wellness-activities-today', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('wellness_activities')
        .select('*')
        .eq('user_id', userId)
        .eq('scheduled_date', today)
        .order('scheduled_time', { ascending: true });
      
      if (error) throw error;
      return data as WellnessActivity[];
    },
    enabled: !!userId,
  });
}

export function useCreateWellnessPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: {
      user_id: string;
      name: string;
      description?: string;
      duration_weeks: number;
      activities_config: Record<string, number>;
      start_date: string;
    }) => {
      const { data, error } = await supabase
        .from('wellness_plans')
        .insert(plan)
        .select()
        .single();
      
      if (error) throw error;
      return data as WellnessPlan;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wellness-plans', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['wellness-plan-active', data.user_id] });
    },
  });
}

export function useCreateActivities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activities: Omit<WellnessActivity, 'id' | 'created_at'>[]) => {
      const { data, error } = await supabase
        .from('wellness_activities')
        .insert(activities)
        .select();
      
      if (error) throw error;
      return data as WellnessActivity[];
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['wellness-activities-week', data[0].user_id] });
        queryClient.invalidateQueries({ queryKey: ['wellness-activities-today', data[0].user_id] });
      }
    },
  });
}

export function useToggleActivityCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { data, error } = await supabase
        .from('wellness_activities')
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as WellnessActivity;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wellness-activities-week', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['wellness-activities-today', data.user_id] });
    },
  });
}

export function useQuickLogActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: {
      user_id: string;
      activity_type: string;
      name?: string;
      duration_minutes?: number;
      notes?: string;
    }) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('wellness_activities')
        .insert({
          ...activity,
          scheduled_date: today,
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as WellnessActivity;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wellness-activities-week', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['wellness-activities-today', data.user_id] });
    },
  });
}

// Helper to generate activities from plan config
export function generateActivitiesFromPlan(
  planId: string,
  userId: string,
  config: Record<string, number>,
  startDate: Date,
  durationWeeks: number
): Omit<WellnessActivity, 'id' | 'created_at'>[] {
  const activities: Omit<WellnessActivity, 'id' | 'created_at'>[] = [];
  
  // Simple distribution: spread activities across the week
  const weekDays = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
  
  for (let week = 0; week < durationWeeks; week++) {
    const weekStart = addDays(startDate, week * 7);
    let dayIndex = 0;
    
    for (const [activityType, count] of Object.entries(config)) {
      for (let i = 0; i < count; i++) {
        const dayOfWeek = weekDays[dayIndex % 7];
        const activityDate = addDays(weekStart, dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        
          activities.push({
          user_id: userId,
          plan_id: planId,
          activity_type: activityType,
          name: null,
          scheduled_date: format(activityDate, 'yyyy-MM-dd'),
          scheduled_time: null,
          duration_minutes: null,
          is_completed: false,
          completed_at: null,
          notes: null,
        });
        
        dayIndex++;
      }
    }
  }
  
  return activities;
}
