import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FastingSession {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  fasting_type: string;
  target_hours: number | null;
  completed: boolean;
  interrupted_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const fastingKeys = {
  all: ['fasting_sessions'] as const,
  user: (userId: string) => [...fastingKeys.all, userId] as const,
  active: (userId: string) => [...fastingKeys.user(userId), 'active'] as const,
  history: (userId: string) => [...fastingKeys.user(userId), 'history'] as const,
};

/**
 * Get active fasting session (where end_time is null)
 */
export function useActiveFastingSession(userId: string | undefined) {
  return useQuery({
    queryKey: fastingKeys.active(userId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fasting_sessions')
        .select('*')
        .eq('user_id', userId!)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as FastingSession | null;
    },
    enabled: !!userId,
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Get fasting sessions history
 */
export function useFastingHistory(userId: string | undefined, limit = 30) {
  return useQuery({
    queryKey: [...fastingKeys.history(userId!), limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fasting_sessions')
        .select('*')
        .eq('user_id', userId!)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as FastingSession[];
    },
    enabled: !!userId,
  });
}

/**
 * Start a new fasting session
 */
export function useStartFasting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      fastingType,
      targetHours,
    }: {
      userId: string;
      fastingType: string;
      targetHours?: number;
    }) => {
      const { data, error } = await supabase
        .from('fasting_sessions')
        .insert({
          user_id: userId,
          start_time: new Date().toISOString(),
          fasting_type: fastingType,
          target_hours: targetHours || null,
          completed: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FastingSession;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fastingKeys.active(variables.userId) });
      queryClient.invalidateQueries({ queryKey: fastingKeys.history(variables.userId) });
      toast.success('Голодание начато! 🔥');
    },
    onError: (error) => {
      console.error('Error starting fasting:', error);
      toast.error('Ошибка при начале голодания');
    },
  });
}

/**
 * End active fasting session
 */
export function useEndFasting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      userId,
      completed = true,
      interruptedReason,
    }: {
      sessionId: string;
      userId: string;
      completed?: boolean;
      interruptedReason?: string;
    }) => {
      const { data, error } = await supabase
        .from('fasting_sessions')
        .update({
          end_time: new Date().toISOString(),
          completed,
          interrupted_reason: interruptedReason || null,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as FastingSession;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: fastingKeys.active(variables.userId) });
      queryClient.invalidateQueries({ queryKey: fastingKeys.history(variables.userId) });
      
      if (data.completed) {
        const duration = Math.round(
          (new Date(data.end_time!).getTime() - new Date(data.start_time).getTime()) / (1000 * 60 * 60)
        );
        toast.success(`Голодание завершено! ${duration}ч ${duration >= 24 ? '🏆' : '✅'}`);
      } else {
        toast.info('Голодание прервано');
      }
    },
    onError: (error) => {
      console.error('Error ending fasting:', error);
      toast.error('Ошибка при завершении голодания');
    },
  });
}

/**
 * Calculate fasting statistics
 */
export function useFastingStats(userId: string | undefined) {
  const { data: history } = useFastingHistory(userId);

  if (!history || history.length === 0) {
    return {
      totalSessions: 0,
      completedSessions: 0,
      averageDuration: 0,
      longestFast: 0,
      currentStreak: 0,
      totalHoursFasted: 0,
    };
  }

  const completed = history.filter(s => s.completed);
  const durations = completed.map(s => {
    const start = new Date(s.start_time).getTime();
    const end = new Date(s.end_time!).getTime();
    return (end - start) / (1000 * 60 * 60); // hours
  });

  // Calculate current streak
  let currentStreak = 0;
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );
  
  for (const session of sortedHistory) {
    if (session.completed) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    totalSessions: history.length,
    completedSessions: completed.length,
    averageDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    longestFast: durations.length > 0 ? Math.round(Math.max(...durations)) : 0,
    currentStreak,
    totalHoursFasted: Math.round(durations.reduce((a, b) => a + b, 0)),
  };
}
