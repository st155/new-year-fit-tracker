import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

export interface MuscleAnalysis {
  name: string;
  icon: string;
  lastTrained: string | null;
  daysSince: number | null;
  status: 'recent' | 'due_soon' | 'neglected' | 'never';
  trainedCount: number;
  exercises: string[];
}

export interface WellnessAnalysis {
  name: string;
  icon: string;
  lastDone: string | null;
  daysSince: number | null;
  status: 'recent' | 'due_soon' | 'overdue' | 'never';
  recommendedFrequency: number;
  completedCount: number;
}

export interface Recommendation {
  type: 'warning' | 'info' | 'success';
  category: 'muscle' | 'wellness';
  target: string;
  message: string;
  priority: number;
}

export interface GapAnalysisResult {
  muscleAnalysis: Record<string, MuscleAnalysis>;
  wellnessAnalysis: Record<string, WellnessAnalysis>;
  recommendations: Recommendation[];
  suggestedWeekFocus: string[];
  stats: {
    totalWorkouts: number;
    totalWellnessActivities: number;
    periodDays: number;
    avgWorkoutsPerWeek: number;
  };
  analyzedAt: string;
}

export interface GeneratedWorkout {
  workout_name: string;
  duration_minutes: number;
  target_muscles: string[];
  warmup: Array<{ name: string; duration: string; notes?: string }>;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    weight?: string;
    rest?: string;
    notes?: string;
    based_on?: string;
  }>;
  cooldown: Array<{ name: string; duration: string }>;
  rationale: string;
  generated_at: string;
  equipment: string;
  requested_duration: number;
}

export function useTrainingGaps(lookbackDays = 21) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  return useQuery({
    queryKey: ['training-gaps', userId, lookbackDays],
    queryFn: async (): Promise<GapAnalysisResult> => {
      const { data, error } = await supabase.functions.invoke('analyze-training-gaps', {
        body: { lookbackDays }
      });

      if (error) {
        console.error('Error analyzing training gaps:', error);
        throw error;
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 30 * 60 * 1000 // 30 минут
  });
}

export function useGenerateTravelWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      durationMinutes?: number;
      equipment?: string;
      focusMuscles?: string[];
      gapAnalysis?: GapAnalysisResult | null;
    }): Promise<GeneratedWorkout> => {
      const { data, error } = await supabase.functions.invoke('generate-travel-workout', {
        body: params
      });

      if (error) {
        console.error('Error generating workout:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
    },
    onError: (error: Error) => {
      if (error.message.includes('429')) {
        toast.error('Слишком много запросов. Попробуйте через минуту.');
      } else if (error.message.includes('402')) {
        toast.error('Требуется пополнение баланса AI.');
      } else {
        toast.error('Не удалось сгенерировать тренировку');
      }
    }
  });
}

export function useSaveGeneratedWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workout: GeneratedWorkout) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Преобразуем упражнения в формат для сохранения
      const exercises = workout.exercises.map((ex, idx) => ({
        exercise_name: ex.name,
        sets: ex.sets,
        actual_reps: parseInt(ex.reps) || 10,
        actual_weight: ex.weight ? parseFloat(ex.weight) : 0,
        actual_rpe: 7
      }));

      const { data, error } = await supabase
        .from('workout_logs')
        .insert(exercises.map(ex => ({
          ...ex,
          user_id: user.id,
          workout_date: new Date().toISOString().split('T')[0],
          workout_type: 'Travel',
          duration_minutes: workout.duration_minutes,
          notes: `🏋️ ${workout.workout_name}`
        })))
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-logs'] });
      toast.success('Тренировка сохранена!');
    },
    onError: () => {
      toast.error('Не удалось сохранить тренировку');
    }
  });
}
