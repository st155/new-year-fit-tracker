import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CompletionResult {
  success: boolean;
  xpEarned: number;
  newLevel?: number;
  celebrationType: 'completion' | 'streak' | 'milestone';
  streakCount: number;
}

export function useHabitCompletion() {
  const [isCompleting, setIsCompleting] = useState(false);
  const { toast } = useToast();

  const calculateXP = (habit: any, streak: number): number => {
    let baseXP = habit.xp_reward || 10;
    let multiplier = 1.0;

    // Streak bonus
    if (streak > 90) multiplier += 0.30;
    else if (streak > 30) multiplier += 0.15;
    else if (streak > 7) multiplier += 0.05;

    // Difficulty bonus
    if (habit.difficulty_level === 'hard') multiplier *= 1.5;
    else if (habit.difficulty_level === 'medium') multiplier *= 1.2;

    // Consistency bonus (if completion_rate > 90%)
    if (habit.completion_rate && habit.completion_rate > 90) {
      multiplier *= 1.2;
    }

    return Math.round(baseXP * multiplier);
  };

  const completeHabit = async (habitId: string, habit: any): Promise<CompletionResult | null> => {
    try {
      setIsCompleting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Create completion record
      const { data: completion, error: completionError } = await supabase
        .from('habit_completions')
        .insert({
          habit_id: habitId,
          user_id: user.id,
          completed_at: new Date().toISOString(),
          notes: null
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

      let newStreak = 1;
      if (recentCompletions && recentCompletions.length > 0) {
        let checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 1);
        
        for (const comp of recentCompletions) {
          const compDate = new Date(comp.completed_at).toDateString();
          const expectedDate = checkDate.toDateString();
          
          if (compDate === expectedDate) {
            newStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      // 3. Calculate and award XP
      const xpEarned = calculateXP(habit, newStreak);

      // 4. Update user profile with XP
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('total_xp, current_level')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      const oldLevel = profile?.current_level || 1;
      const newTotalXP = (profile?.total_xp || 0) + xpEarned;

      const { error: xpError } = await supabase
        .from('profiles')
        .update({ total_xp: newTotalXP })
        .eq('user_id', user.id);

      if (xpError) throw xpError;

      const newLevel = Math.floor(newTotalXP / 1000) + 1;

      // 5. Save streak history (only if starting/ending a streak)
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('habit_streak_history')
        .upsert({
          habit_id: habitId,
          user_id: user.id,
          start_date: today,
          streak_length: newStreak
        }, {
          onConflict: 'habit_id,user_id,start_date'
        });

      // Determine celebration type
      let celebrationType: 'completion' | 'streak' | 'milestone' = 'completion';
      if (newLevel > oldLevel) {
        celebrationType = 'milestone';
      } else if (newStreak % 7 === 0 || newStreak % 30 === 0) {
        celebrationType = 'streak';
      }

      toast({
        title: "Привычка выполнена!",
        description: `+${xpEarned} XP ${newStreak > 1 ? `• ${newStreak} дней подряд` : ''}`,
      });

      return {
        success: true,
        xpEarned,
        newLevel: newLevel > oldLevel ? newLevel : undefined,
        celebrationType,
        streakCount: newStreak
      };

    } catch (error) {
      console.error('Error completing habit:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отметить привычку",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsCompleting(false);
    }
  };

  const undoCompletion = async (habitId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the latest completion
      const { data: lastCompletion, error: fetchError } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('habit_id', habitId)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !lastCompletion) return false;

      // Delete the completion
      const { error: deleteError } = await supabase
        .from('habit_completions')
        .delete()
        .eq('id', lastCompletion.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Отменено",
        description: "Выполнение привычки отменено",
      });

      return true;
    } catch (error) {
      console.error('Error undoing completion:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отменить выполнение",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    completeHabit,
    undoCompletion,
    isCompleting
  };
}
