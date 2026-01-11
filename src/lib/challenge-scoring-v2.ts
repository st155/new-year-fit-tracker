// New challenge scoring system v2
// Calculates points based on individual goal progress from baseline to target

export interface GoalTypeConfig {
  difficultyMultiplier: number;
  basePoints: number;
  overachievementMultiplier: number;
}

export const GOAL_CONFIGS: Record<string, GoalTypeConfig> = {
  body_composition: {
    difficultyMultiplier: 2.0,
    basePoints: 100,
    overachievementMultiplier: 3.0,
  },
  strength: {
    difficultyMultiplier: 1.5,
    basePoints: 100,
    overachievementMultiplier: 2.0,
  },
  cardio: {
    difficultyMultiplier: 1.3,
    basePoints: 100,
    overachievementMultiplier: 2.0,
  },
  endurance: {
    difficultyMultiplier: 1.3,
    basePoints: 100,
    overachievementMultiplier: 2.0,
  },
  health: {
    difficultyMultiplier: 1.0,
    basePoints: 100,
    overachievementMultiplier: 1.5,
  },
};

export interface GoalProgress {
  goalId: string;
  goalName: string;
  goalType: string;
  baseline: number;
  current: number;
  target: number;
  progressPercent: number;
  points: number;
  isCompleted: boolean;
  isOverachieved: boolean;
}

export interface ParticipantScore {
  userId: string;
  username: string;
  avatarUrl?: string;
  totalPoints: number;
  goalsProgress: GoalProgress[];
  completedGoalsCount: number;
  overachievedGoalsCount: number;
  averageProgress: number;
  badges: string[];
  isUser?: boolean;
}

/**
 * Calculate progress percentage for a goal
 * @param baseline Starting value
 * @param current Current value
 * @param target Target value
 * @param isLowerBetter True if lower values are better (body fat, running time)
 */
export function calculateGoalProgress(
  baseline: number,
  current: number,
  target: number,
  isLowerBetter: boolean = false
): number {
  if (baseline === target) return 100;
  
  if (isLowerBetter) {
    // For body fat, weight, running time (lower is better)
    const progress = ((baseline - current) / (baseline - target)) * 100;
    return Math.max(0, progress);
  } else {
    // For reps, weight lifted, duration (higher is better)
    const progress = ((current - baseline) / (target - baseline)) * 100;
    return Math.max(0, progress);
  }
}

/**
 * Calculate points for a single goal based on progress
 */
export function calculateGoalPoints(progress: GoalProgress): number {
  const config = GOAL_CONFIGS[progress.goalType] || GOAL_CONFIGS['health'];
  
  let points = 0;
  
  // 1. Base points proportional to progress
  if (progress.progressPercent <= 100) {
    points = (progress.progressPercent / 100) * config.basePoints;
  } else {
    // Full base points
    points = config.basePoints;
    
    // 2. Overachievement bonus
    const overachievement = progress.progressPercent - 100;
    points += overachievement * config.overachievementMultiplier;
  }
  
  // 3. Apply difficulty multiplier
  points *= config.difficultyMultiplier;
  
  return Math.round(points);
}

/**
 * Calculate total score and badges for a participant
 */
export function calculateParticipantScore(
  goalsProgress: GoalProgress[],
  userId: string,
  username: string,
  avatarUrl?: string
): ParticipantScore {
  let totalPoints = 0;
  let completedCount = 0;
  let overachievedCount = 0;
  let totalProgress = 0;
  const badges: string[] = [];
  
  // Calculate points for each goal
  const enrichedGoals = goalsProgress.map(goal => {
    const points = calculateGoalPoints(goal);
    totalPoints += points;
    totalProgress += goal.progressPercent;
    
    if (goal.progressPercent >= 100) {
      completedCount++;
      // Completion bonus: +50 points per completed goal
      totalPoints += 50;
    }
    
    if (goal.progressPercent > 100) {
      overachievedCount++;
    }
    
    return { ...goal, points };
  });
  
  const averageProgress = goalsProgress.length > 0 
    ? totalProgress / goalsProgress.length 
    : 0;
  
  // Award badges based on achievements
  
  // Consistency: All goals have current measurements
  if (goalsProgress.every(g => g.current > 0)) {
    totalPoints += 100;
    badges.push('🎯 Consistency');
  }
  
  // Perfectionist: All goals >= 90%
  if (goalsProgress.length > 0 && goalsProgress.every(g => g.progressPercent >= 90)) {
    totalPoints += 200;
    badges.push('⭐ Perfectionist');
  }
  
  // Beast Mode: 5+ goals overachieved
  if (overachievedCount >= 5) {
    totalPoints += 300;
    badges.push('💪 Beast Mode');
  }
  
  // Champion: 3+ goals completed
  if (completedCount >= 3) {
    badges.push('🏆 Champion');
  }
  
  // Rising Star: Average progress > 50%
  if (averageProgress > 50) {
    badges.push('⭐ Rising Star');
  }
  
  return {
    userId,
    username,
    avatarUrl,
    totalPoints: Math.round(totalPoints),
    goalsProgress: enrichedGoals,
    completedGoalsCount: completedCount,
    overachievedGoalsCount: overachievedCount,
    averageProgress: Math.round(averageProgress),
    badges,
  };
}

// Re-export from goal-detection for backwards compatibility
export { isLowerBetterGoal } from '@/lib/goal-detection';
