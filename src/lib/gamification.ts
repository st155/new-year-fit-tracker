// Gamification System - Levels and Titles

export interface UserLevel {
  level: number;
  title: string;
  minPoints: number;
  icon: string;
  color: string;
  gradient: string;
}

export const LEVELS: UserLevel[] = [
  { 
    level: 1, 
    title: 'Beginner', 
    minPoints: 0, 
    icon: '🌱', 
    color: 'hsl(142, 76%, 36%)',
    gradient: 'from-green-400 to-green-600'
  },
  { 
    level: 2, 
    title: 'Novice', 
    minPoints: 500, 
    icon: '🔰', 
    color: 'hsl(221, 83%, 53%)',
    gradient: 'from-blue-400 to-blue-600'
  },
  { 
    level: 3, 
    title: 'Athlete', 
    minPoints: 1500, 
    icon: '🏃', 
    color: 'hsl(280, 87%, 65%)',
    gradient: 'from-purple-400 to-purple-600'
  },
  { 
    level: 4, 
    title: 'Warrior', 
    minPoints: 3000, 
    icon: '⚔️', 
    color: 'hsl(25, 95%, 53%)',
    gradient: 'from-orange-400 to-orange-600'
  },
  { 
    level: 5, 
    title: 'Champion', 
    minPoints: 5000, 
    icon: '🏆', 
    color: 'hsl(0, 84%, 60%)',
    gradient: 'from-red-400 to-red-600'
  },
  { 
    level: 6, 
    title: 'Master', 
    minPoints: 8000, 
    icon: '💎', 
    color: 'hsl(200, 98%, 39%)',
    gradient: 'from-cyan-400 to-cyan-600'
  },
  { 
    level: 7, 
    title: 'Legend', 
    minPoints: 12000, 
    icon: '👑', 
    color: 'hsl(280, 87%, 65%)',
    gradient: 'from-purple-500 to-pink-600'
  },
  { 
    level: 8, 
    title: 'Elite', 
    minPoints: 20000, 
    icon: '⚡', 
    color: 'hsl(45, 93%, 47%)',
    gradient: 'from-yellow-400 to-amber-600'
  },
];

export function getUserLevel(totalPoints: number): UserLevel {
  const level = [...LEVELS].reverse().find(l => totalPoints >= l.minPoints);
  return level || LEVELS[0];
}

export function getNextLevel(totalPoints: number): UserLevel | null {
  return LEVELS.find(l => totalPoints < l.minPoints) || null;
}

export function getLevelProgress(totalPoints: number): number {
  const currentLevel = getUserLevel(totalPoints);
  const nextLevel = getNextLevel(totalPoints);
  
  if (!nextLevel) return 100; // Max level reached
  
  const pointsIntoCurrentLevel = totalPoints - currentLevel.minPoints;
  const pointsNeededForNextLevel = nextLevel.minPoints - currentLevel.minPoints;
  
  return Math.min(100, Math.round((pointsIntoCurrentLevel / pointsNeededForNextLevel) * 100));
}

// Special Titles based on performance
export interface SpecialTitle {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  checkCriteria: (stats: any) => boolean;
}

export const SPECIAL_TITLES: SpecialTitle[] = [
  {
    id: 'fire_keeper',
    name: 'Fire Keeper',
    icon: '🔥',
    description: 'Longest current streak in team',
    color: 'text-orange-500',
    checkCriteria: (stats) => stats.hasLongestStreak
  },
  {
    id: 'iron_giant',
    name: 'Iron Giant',
    icon: '💪',
    description: 'Most strength workouts',
    color: 'text-red-500',
    checkCriteria: (stats) => stats.mostStrengthWorkouts
  },
  {
    id: 'marathon_runner',
    name: 'Marathon Runner',
    icon: '🏃',
    description: 'Most distance covered',
    color: 'text-blue-500',
    checkCriteria: (stats) => stats.mostDistance
  },
  {
    id: 'sleep_master',
    name: 'Sleep Master',
    icon: '😴',
    description: 'Best sleep quality',
    color: 'text-purple-500',
    checkCriteria: (stats) => stats.bestSleepQuality
  },
  {
    id: 'recovery_king',
    name: 'Recovery King',
    icon: '⚡',
    description: 'Highest avg recovery',
    color: 'text-green-500',
    checkCriteria: (stats) => stats.highestRecovery
  }
];
