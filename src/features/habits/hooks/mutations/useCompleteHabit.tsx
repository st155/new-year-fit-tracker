/**
 * Hook for completing habits with XP, streaks, and achievements
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import {
  calculateHabitXP,
  calculateStreakXPMultiplier,
  calculateLevel,
} from '@/lib/gamification/level-system';
import {
  checkAndAwardAchievements,
  type AchievementCheckParams,
} from '@/lib/gamification/achievement-checker';
import { AchievementUnlockedToast } from '@/features/habits/components/gamification/AchievementUnlockedToast';
import { isNewMilestone } from '@/lib/gamification/streak-rewards';
import { habitKeys } from '../keys';

export interface HabitCompletionResult {
  success: boolean;
  xpEarned: number;
  newLevel?: number;
  oldLevel?: number;
  celebrationType: 'completion' | 'streak' | 'milestone' | 'level_up';
  streakCount: number;
  newAchievements?: any[];
}

interface HabitForCompletion {
  id: string;
  name: string;
  icon?: string | null;
  xp_reward?: number | null;
  difficulty_level?: string | null;
}

// Calculate XP using gamification system
function calculateHabitCompletionXP(
  habit: HabitForCompletion,
  streak: number,
  isFirstToday: boolean,
  isPerfectDay: boolean
): number {
  const streakBonus = calculateStreakXPMultiplier(streak);
  const difficultyBonus = habit.difficulty_level === 'hard' ? 5 : 0;
  const firstCompletionBonus = isFirstToday ? 5 : 0;
  const perfectDayBonus = isPerfectDay ? 20 : 0;

  return calculateHabitXP({
    baseXP: habit.xp_reward || 10,
    streakBonus,
    difficultyBonus,
    firstCompletionBonus,
    perfectDayBonus,
  });
}

// Calculate streak from recent completions
function calculateStreak(completions: { completed_at: string }[]): number {
  if (!completions || completions.length === 0) return 1;

  let streak = 1;
  const checkDate = new Date();
  checkDate.setDate(checkDate.getDate() - 1);

  for (const comp of completions) {
    const compDate = new Date(comp.completed_at).toDateString();
    const expectedDate = checkDate.toDateString();

    if (compDate === expectedDate) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function useCompleteHabit() {
  const [isCompleting, setIsCompleting] = useState(false);
  const { t } = useTranslation('habits');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const completeHabitMutation = useMutation<
    HabitCompletionResult | null,
    Error,
    { habitId: string; habit: HabitForCompletion }
  >({
    mutationFn: async ({ habitId, habit }) => {
      setIsCompleting(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // 1. Create completion record
        const { error: completionError } = await supabase
          .from('habit_completions')
          .insert({
            habit_id: habitId,
            user_id: user.id,
            completed_at: new Date().toISOString(),
            notes: null,
          })
          .select()
          .single();

        if (completionError) throw completionError;

        // 2. Calculate current streak
        const { data: recentCompletions } = await supabase
          .from('habit_completions')
          .select('completed_at')
          .eq('habit_id', habitId)
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(100);

        const newStreak = calculateStreak(recentCompletions || []);

        // 3. Check first completion today and perfect day
        const today = new Date().toISOString().split('T')[0];
        const { data: todayCompletions } = await supabase
          .from('habit_completions')
          .select('id')
          .eq('user_id', user.id)
          .gte('completed_at', `${today}T00:00:00`)
          .lt('completed_at', `${today}T23:59:59`);

        const isFirstToday = !todayCompletions || todayCompletions.length === 1;

        const { data: userHabits } = await supabase
          .from('habits' as any)
          .select('id')
          .eq('user_id', user.id)
          .eq('archived', false);

        const isPerfectDay =
          userHabits &&
          todayCompletions &&
          todayCompletions.length >= userHabits.length;

        // 4. Calculate and award XP
        const xpEarned = calculateHabitCompletionXP(
          habit,
          newStreak,
          isFirstToday,
          isPerfectDay
        );

        const { data: xpData } = await supabase
          .from('xp_history' as any)
          .select('amount')
          .eq('user_id', user.id);

        const oldTotalXP = (xpData || []).reduce(
          (sum: number, record: any) => sum + (record.amount || 0),
          0
        );
        const oldLevel = calculateLevel(oldTotalXP);

        await supabase.from('xp_history' as any).insert({
          user_id: user.id,
          amount: xpEarned,
          source: 'habit_completion',
          source_id: habitId,
          metadata: {
            habit_name: habit.name,
            streak: newStreak,
            is_first_today: isFirstToday,
            is_perfect_day: isPerfectDay,
          },
        });

        const newTotalXP = oldTotalXP + xpEarned;
        const newLevel = calculateLevel(newTotalXP);

        // 5. Create feed event
        try {
          const { data: existingEvent } = await supabase
            .from('habit_feed_events' as any)
            .select('id')
            .eq('user_id', user.id)
            .eq('habit_id', habitId)
            .gte('created_at', `${today}T00:00:00`)
            .lt('created_at', `${today}T23:59:59`)
            .single();

          if (!existingEvent) {
            await supabase.from('habit_feed_events' as any).insert({
              user_id: user.id,
              habit_id: habitId,
              event_type:
                newStreak >= 7 ? 'streak_milestone' : 'habit_completion',
              event_data: {
                habit_name: habit.name,
                habit_icon: habit.icon,
                streak: newStreak,
                xp_earned: xpEarned,
              },
              visibility: 'public',
            });
          }
        } catch (feedError) {
          console.error('[useCompleteHabit] Feed event error:', feedError);
        }

        // 6. Check achievements
        const checkParams: AchievementCheckParams = {
          userId: user.id,
          streak: newStreak,
          totalCompletions: oldTotalXP / 10,
          dailyCompletions: todayCompletions?.length || 1,
          perfectDay: isPerfectDay,
          completionTime: new Date().toTimeString().split(' ')[0],
        };

        const newAchievements = await checkAndAwardAchievements(checkParams);

        // 7. Save streak history
        await supabase.from('habit_streak_history').upsert(
          {
            habit_id: habitId,
            user_id: user.id,
            start_date: today,
            streak_length: newStreak,
          },
          { onConflict: 'habit_id,user_id,start_date' }
        );

        // Determine celebration type
        let celebrationType: 'completion' | 'streak' | 'milestone' | 'level_up' =
          'completion';
        if (newLevel > oldLevel) {
          celebrationType = 'level_up';
        } else {
          const streakMilestone = isNewMilestone(newStreak - 1, newStreak);
          if (streakMilestone) {
            celebrationType = 'milestone';
          } else if (newStreak % 7 === 0) {
            celebrationType = 'streak';
          }
        }

        return {
          success: true,
          xpEarned,
          oldLevel,
          newLevel: newLevel > oldLevel ? newLevel : undefined,
          celebrationType,
          streakCount: newStreak,
          newAchievements,
        };
      } finally {
        setIsCompleting(false);
      }
    },
    onSuccess: (result, { habit }) => {
      if (result) {
        // Show achievement toasts
        if (result.newAchievements && result.newAchievements.length > 0) {
          result.newAchievements.forEach(({ achievement }) => {
            sonnerToast.custom(
              () => (
                <div className="bg-card border border-border rounded-lg shadow-lg p-4">
                  <AchievementUnlockedToast achievement={achievement} />
                </div>
              ),
              { duration: 5000 }
            );
          });
        }

        // Show completion toast
        let description = `+${result.xpEarned} XP`;
        if (result.streakCount > 1)
          description += ` • ${t('completion.streak', { count: result.streakCount })}`;

        toast({
          title: t('completion.success'),
          description,
        });

        queryClient.invalidateQueries({ queryKey: habitKeys.all });
      }
    },
    onError: (error) => {
      console.error('[useCompleteHabit] Error:', error);
      toast({
        title: t('common:errors.generic'),
        description: t('error.title'),
        variant: 'destructive',
      });
    },
  });

  const completeHabit = (habitId: string, habit: HabitForCompletion) => {
    return completeHabitMutation.mutateAsync({ habitId, habit });
  };

  return {
    completeHabit,
    isCompleting,
  };
}
