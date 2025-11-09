import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { calculateHabitXP, calculateStreakXPMultiplier, calculateLevel } from '@/lib/gamification/level-system';
import { checkAndAwardAchievements, type AchievementCheckParams } from '@/lib/gamification/achievement-checker';
import { AchievementUnlockedToast } from '@/components/habits-v3/gamification/AchievementUnlockedToast';
import { isNewMilestone } from '@/lib/gamification/streak-rewards';

interface CompletionResult {
  success: boolean;
  xpEarned: number;
  newLevel?: number;
  oldLevel?: number;
  celebrationType: 'completion' | 'streak' | 'milestone' | 'level_up';
  streakCount: number;
  newAchievements?: any[];
}

export function useHabitCompletion() {
  const [isCompleting, setIsCompleting] = useState(false);
  const { toast } = useToast();

  // Calculate XP using new gamification system
  const calculateHabitCompletionXP = (habit: any, streak: number, isFirstToday: boolean, isPerfectDay: boolean): number => {
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

      // 3. Check if this is first completion today and if perfect day
      const today = new Date().toISOString().split('T')[0];
      const { data: todayCompletions } = await supabase
        .from('habit_completions')
        .select('id')
        .eq('user_id', user.id)
        .gte('completed_at', `${today}T00:00:00`)
        .lt('completed_at', `${today}T23:59:59`);

      const isFirstToday = !todayCompletions || todayCompletions.length === 1;
      
      // Check if all habits are now completed today (perfect day)
      const { data: userHabits } = await supabase
        .from('habits' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('archived', false);
      
      const isPerfectDay = userHabits && todayCompletions && 
        todayCompletions.length >= userHabits.length;

      // 4. Calculate and award XP using new system
      const xpEarned = calculateHabitCompletionXP(habit, newStreak, isFirstToday, isPerfectDay);

      // Get current total XP
      const { data: xpData } = await supabase
        .from('xp_history' as any)
        .select('amount')
        .eq('user_id', user.id);
      
      const oldTotalXP = (xpData || []).reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
      const oldLevel = calculateLevel(oldTotalXP);

      // Award XP
      const { error: xpError } = await supabase
        .from('xp_history' as any)
        .insert({
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

      if (xpError) throw xpError;

      const newTotalXP = oldTotalXP + xpEarned;
      const newLevel = calculateLevel(newTotalXP);

      // Create feed event for habit completion (with duplicate prevention)
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Check if event already exists for this habit today
        const { data: existingEvent } = await supabase
          .from('habit_feed_events' as any)
          .select('id')
          .eq('user_id', user.id)
          .eq('habit_id', habitId)
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`)
          .single();

        if (!existingEvent) {
          // Create event only if it doesn't exist
          const { error: feedError } = await supabase
            .from('habit_feed_events' as any)
            .insert({
              user_id: user.id,
              habit_id: habitId,
              event_type: newStreak >= 7 ? 'streak_milestone' : 'habit_completion',
              event_data: {
                habit_name: habit.name,
                habit_icon: habit.icon,
                streak: newStreak,
                xp_earned: xpEarned,
              },
              visibility: 'public',
            });

          if (feedError) {
            console.error('[HabitCompletion] Failed to create feed event:', {
              habitId,
              habitName: habit.name,
              error: feedError,
            });
          } else {
            console.log('[HabitCompletion] Feed event created:', {
              habitId,
              eventType: newStreak >= 7 ? 'streak_milestone' : 'habit_completion',
              streak: newStreak,
            });
          }
        } else {
          console.log('[HabitCompletion] Feed event already exists for today');
        }
      } catch (feedError) {
        console.error('[HabitCompletion] Error handling feed event:', feedError);
        // Don't interrupt habit completion due to feed error
      }

      // 5. Check for new achievements
      const checkParams: AchievementCheckParams = {
        userId: user.id,
        streak: newStreak,
        totalCompletions: oldTotalXP / 10, // Rough estimate
        dailyCompletions: todayCompletions?.length || 1,
        perfectDay: isPerfectDay,
        completionTime: new Date().toTimeString().split(' ')[0],
      };

      const newAchievements = await checkAndAwardAchievements(checkParams);

      // 6. Save streak history
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
      let celebrationType: 'completion' | 'streak' | 'milestone' | 'level_up' = 'completion';
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

      // Show achievement toasts
      if (newAchievements.length > 0) {
        newAchievements.forEach(({ achievement, xpAwarded }) => {
          sonnerToast.custom((t) => (
            <div className="bg-card border border-border rounded-lg shadow-lg p-4">
              <AchievementUnlockedToast achievement={achievement} />
            </div>
          ), { duration: 5000 });
        });
      }

      // Show completion toast
      let description = `+${xpEarned} XP`;
      if (newStreak > 1) description += ` • ${newStreak} дней подряд`;
      if (isPerfectDay) description += ` • 🌟 Идеальный день!`;
      
      toast({
        title: "Привычка выполнена!",
        description,
      });

      return {
        success: true,
        xpEarned,
        oldLevel,
        newLevel: newLevel > oldLevel ? newLevel : undefined,
        celebrationType,
        streakCount: newStreak,
        newAchievements,
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
