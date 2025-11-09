/**
 * Achievement Checker
 * Checks and awards achievements based on user actions
 */

import { supabase } from '@/integrations/supabase/client';
import { ACHIEVEMENT_DEFINITIONS, type AchievementDefinition } from './achievement-definitions';

export interface AchievementCheckParams {
  userId: string;
  streak?: number;
  totalCompletions?: number;
  dailyCompletions?: number;
  activeHabits?: number;
  completionTime?: string;
  perfectDay?: boolean;
  perfectDayStreak?: number;
  streakRecovery?: boolean;
}

export interface NewAchievement {
  achievement: AchievementDefinition;
  xpAwarded: number;
}

/**
 * Check and award achievements for a user
 */
export async function checkAndAwardAchievements(
  params: AchievementCheckParams
): Promise<NewAchievement[]> {
  const { userId } = params;
  
  // Get user's current achievements
  const { data: userAchievements } = await supabase
    .from('user_achievements' as any)
    .select('achievement_id')
    .eq('user_id', userId);
  
  const unlockedIds = new Set((userAchievements || []).map((a: any) => a.achievement_id));
  const newAchievements: NewAchievement[] = [];
  
  // Check each achievement definition
  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    // Skip if already unlocked
    if (unlockedIds.has(achievement.id)) continue;
    
    // Check if requirement is met
    const isMet = checkRequirement(achievement, params);
    
    if (isMet) {
      // Award achievement
      const success = await awardAchievement(userId, achievement);
      
      if (success) {
        newAchievements.push({
          achievement,
          xpAwarded: achievement.xp_reward,
        });
      }
    }
  }
  
  return newAchievements;
}

/**
 * Check if achievement requirement is met
 */
function checkRequirement(
  achievement: AchievementDefinition,
  params: AchievementCheckParams
): boolean {
  const { requirement } = achievement;
  
  switch (requirement.type) {
    case 'streak':
      return (params.streak || 0) >= (requirement.value || 0);
      
    case 'total_completions':
      return (params.totalCompletions || 0) >= (requirement.value || 0);
      
    case 'daily_completions':
      return (params.dailyCompletions || 0) >= (requirement.value || 0);
      
    case 'active_habits':
      return (params.activeHabits || 0) >= (requirement.value || 0);
      
    case 'perfect_days':
      return (params.perfectDayStreak || 0) >= (requirement.value || 0);
      
    case 'completion_before_time':
      if (!params.completionTime || !requirement.time) return false;
      return params.completionTime < requirement.time;
      
    case 'completion_after_time':
      if (!params.completionTime || !requirement.time) return false;
      return params.completionTime > requirement.time;
      
    case 'streak_recovery':
      return params.streakRecovery === true;
      
    default:
      return false;
  }
}

/**
 * Award achievement to user
 */
async function awardAchievement(
  userId: string,
  achievement: AchievementDefinition
): Promise<boolean> {
  try {
    // Insert into user_achievements
    const { error: achievementError } = await supabase
      .from('user_achievements' as any)
      .insert({
        user_id: userId,
        achievement_id: achievement.id,
        unlocked_at: new Date().toISOString(),
      });
    
    if (achievementError) {
      console.error('Error awarding achievement:', achievementError);
      return false;
    }
    
    // Award XP
    const { error: xpError } = await supabase
      .from('xp_history' as any)
      .insert({
        user_id: userId,
        amount: achievement.xp_reward,
        source: 'achievement',
        source_id: achievement.id,
        metadata: {
          achievement_name: achievement.name,
          rarity: achievement.rarity,
        },
      });
    
    if (xpError) {
      console.error('Error awarding XP:', xpError);
    }
    
    return true;
  } catch (error) {
    console.error('Error in awardAchievement:', error);
    return false;
  }
}

/**
 * Get user's unlocked achievements
 */
export async function getUserAchievements(userId: string) {
  const { data, error } = await supabase
    .from('user_achievements' as any)
    .select(`
      achievement_id,
      unlocked_at,
      progress
    `)
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }
  
  return (data || []).map((ua: any) => {
    const definition = ACHIEVEMENT_DEFINITIONS.find(a => a.id === ua.achievement_id);
    return {
      ...definition,
      unlockedAt: ua.unlocked_at,
      progress: ua.progress,
    };
  });
}

/**
 * Get achievement progress for locked achievements
 */
export async function getAchievementProgress(
  params: AchievementCheckParams
): Promise<Record<string, number>> {
  const progress: Record<string, number> = {};
  
  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    const { requirement } = achievement;
    
    switch (requirement.type) {
      case 'streak':
        progress[achievement.id] = Math.min(100, ((params.streak || 0) / (requirement.value || 1)) * 100);
        break;
        
      case 'total_completions':
        progress[achievement.id] = Math.min(100, ((params.totalCompletions || 0) / (requirement.value || 1)) * 100);
        break;
        
      case 'daily_completions':
        progress[achievement.id] = Math.min(100, ((params.dailyCompletions || 0) / (requirement.value || 1)) * 100);
        break;
        
      case 'active_habits':
        progress[achievement.id] = Math.min(100, ((params.activeHabits || 0) / (requirement.value || 1)) * 100);
        break;
        
      case 'perfect_days':
        progress[achievement.id] = Math.min(100, ((params.perfectDayStreak || 0) / (requirement.value || 1)) * 100);
        break;
    }
  }
  
  return progress;
}
