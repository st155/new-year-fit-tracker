/**
 * Level System for Gamification
 * Calculates user level, progress, and XP requirements
 */

export interface UserLevel {
  level: number;
  totalXP: number;
  currentLevelXP: number; // XP needed to reach current level
  nextLevelXP: number; // XP needed to reach next level
  progressPercent: number; // Progress to next level (0-100)
  xpToNext: number; // Remaining XP to next level
}

/**
 * Calculate level from total XP
 * Formula: Level = floor(sqrt(XP / 100))
 * Levels: 1=0XP, 2=100XP, 3=400XP, 4=900XP, 5=1600XP, 10=10000XP
 */
export function calculateLevel(totalXP: number): number {
  if (totalXP <= 0) return 1;
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

/**
 * Calculate XP required to reach a specific level
 * Formula: XP = 100 * (level - 1)^2
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return 100 * Math.pow(level - 1, 2);
}

/**
 * Get XP required for the next level
 */
export function getXPForNextLevel(currentLevel: number): number {
  return getXPForLevel(currentLevel + 1);
}

/**
 * Calculate progress to next level (0-100)
 */
export function getLevelProgress(totalXP: number): number {
  const currentLevel = calculateLevel(totalXP);
  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  
  const xpInCurrentLevel = totalXP - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
  
  if (xpNeededForNextLevel === 0) return 100;
  
  return Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100));
}

/**
 * Get detailed user level information
 */
export function getUserLevelInfo(totalXP: number): UserLevel {
  const level = calculateLevel(totalXP);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const progressPercent = getLevelProgress(totalXP);
  const xpToNext = nextLevelXP - totalXP;
  
  return {
    level,
    totalXP,
    currentLevelXP,
    nextLevelXP,
    progressPercent,
    xpToNext,
  };
}

/**
 * Calculate XP multiplier based on streak
 * Bonus: +1 XP per day of streak (max +50)
 */
export function calculateStreakXPMultiplier(streakDays: number): number {
  return Math.min(50, streakDays);
}

/**
 * Calculate base XP for habit completion
 */
export interface HabitXPParams {
  baseXP?: number; // Default: 10
  streakBonus?: number; // From calculateStreakXPMultiplier
  difficultyBonus?: number; // +5 for hard habits
  firstCompletionBonus?: number; // +5 for first habit of the day
  perfectDayBonus?: number; // +20 if all habits completed
}

export function calculateHabitXP(params: HabitXPParams): number {
  const {
    baseXP = 10,
    streakBonus = 0,
    difficultyBonus = 0,
    firstCompletionBonus = 0,
    perfectDayBonus = 0,
  } = params;
  
  return baseXP + streakBonus + difficultyBonus + firstCompletionBonus + perfectDayBonus;
}

/**
 * Get level rewards/perks for a specific level
 */
export function getLevelRewards(level: number): string[] {
  const rewards: string[] = [];
  
  if (level >= 5) rewards.push('🎨 Цветные темы разблокированы');
  if (level >= 10) rewards.push('⭐ Особые значки');
  if (level >= 15) rewards.push('🔥 Премиум аналитика');
  if (level >= 20) rewards.push('👑 Легендарный статус');
  if (level >= 25) rewards.push('💎 Эксклюзивные награды');
  if (level >= 30) rewards.push('🏆 Мастер привычек');
  
  return rewards;
}

/**
 * Get level title based on level
 */
export function getLevelTitle(level: number): string {
  if (level < 5) return 'Новичок';
  if (level < 10) return 'Практик';
  if (level < 15) return 'Энтузиаст';
  if (level < 20) return 'Эксперт';
  if (level < 25) return 'Мастер';
  if (level < 30) return 'Легенда';
  return 'Гуру';
}

/**
 * Get level color based on level
 */
export function getLevelColor(level: number): string {
  if (level < 5) return 'from-slate-500 to-slate-600';
  if (level < 10) return 'from-green-500 to-green-600';
  if (level < 15) return 'from-blue-500 to-blue-600';
  if (level < 20) return 'from-purple-500 to-purple-600';
  if (level < 25) return 'from-pink-500 to-pink-600';
  if (level < 30) return 'from-yellow-500 to-amber-600';
  return 'from-orange-500 to-red-600';
}
