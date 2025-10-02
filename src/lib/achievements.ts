// Achievement System

export type AchievementCategory = 'streak' | 'milestone' | 'workout' | 'social' | 'elite';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement: number;
  progress?: number;
  unlocked: boolean;
  unlockedAt?: string;
  color: string;
  glowColor: string;
}

// All achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  // Streak Achievements
  {
    id: 'streak_7',
    title: 'Week of Power',
    description: 'Train 7 days in a row',
    category: 'streak',
    icon: '🔥',
    rarity: 'common',
    requirement: 7,
    unlocked: false,
    color: 'hsl(25, 95%, 53%)',
    glowColor: 'rgba(251, 146, 60, 0.3)'
  },
  {
    id: 'streak_30',
    title: 'Iron Will',
    description: 'Train 30 days in a row',
    category: 'streak',
    icon: '⚡',
    rarity: 'rare',
    requirement: 30,
    unlocked: false,
    color: 'hsl(221, 83%, 53%)',
    glowColor: 'rgba(59, 130, 246, 0.3)'
  },
  {
    id: 'streak_100',
    title: 'Legend',
    description: 'Train 100 days in a row',
    category: 'streak',
    icon: '👑',
    rarity: 'legendary',
    requirement: 100,
    unlocked: false,
    color: 'hsl(280, 87%, 65%)',
    glowColor: 'rgba(168, 85, 247, 0.3)'
  },
  
  // Milestone Achievements
  {
    id: 'weight_lost_5',
    title: 'First Results',
    description: 'Lose 5 kg',
    category: 'milestone',
    icon: '🎯',
    rarity: 'common',
    requirement: 5,
    unlocked: false,
    color: 'hsl(142, 76%, 36%)',
    glowColor: 'rgba(34, 197, 94, 0.3)'
  },
  {
    id: 'weight_lost_10',
    title: 'Transformation',
    description: 'Lose 10 kg',
    category: 'milestone',
    icon: '🏆',
    rarity: 'rare',
    requirement: 10,
    unlocked: false,
    color: 'hsl(45, 93%, 47%)',
    glowColor: 'rgba(234, 179, 8, 0.3)'
  },
  {
    id: 'bodyfat_15',
    title: 'Abs Visible',
    description: 'Reach 15% body fat',
    category: 'milestone',
    icon: '💪',
    rarity: 'epic',
    requirement: 15,
    unlocked: false,
    color: 'hsl(340, 82%, 52%)',
    glowColor: 'rgba(244, 63, 94, 0.3)'
  },
  {
    id: 'bodyfat_10',
    title: 'Shredded',
    description: 'Reach 10% body fat',
    category: 'milestone',
    icon: '🔱',
    rarity: 'legendary',
    requirement: 10,
    unlocked: false,
    color: 'hsl(200, 98%, 39%)',
    glowColor: 'rgba(2, 132, 199, 0.3)'
  },
  
  // Workout Achievements
  {
    id: 'workouts_10',
    title: 'Beginner Athlete',
    description: 'Complete 10 workouts',
    category: 'workout',
    icon: '🏃',
    rarity: 'common',
    requirement: 10,
    unlocked: false,
    color: 'hsl(221, 83%, 53%)',
    glowColor: 'rgba(59, 130, 246, 0.3)'
  },
  {
    id: 'workouts_50',
    title: 'Experienced Fighter',
    description: 'Complete 50 workouts',
    category: 'workout',
    icon: '🥊',
    rarity: 'rare',
    requirement: 50,
    unlocked: false,
    color: 'hsl(25, 95%, 53%)',
    glowColor: 'rgba(251, 146, 60, 0.3)'
  },
  {
    id: 'workouts_100',
    title: 'Sports Master',
    description: 'Complete 100 workouts',
    category: 'workout',
    icon: '🎖️',
    rarity: 'epic',
    requirement: 100,
    unlocked: false,
    color: 'hsl(280, 87%, 65%)',
    glowColor: 'rgba(168, 85, 247, 0.3)'
  },
  {
    id: 'calories_10k',
    title: 'Calorie Burner',
    description: 'Burn 10,000 calories',
    category: 'workout',
    icon: '🔥',
    rarity: 'rare',
    requirement: 10000,
    unlocked: false,
    color: 'hsl(0, 84%, 60%)',
    glowColor: 'rgba(239, 68, 68, 0.3)'
  },
  
  // Elite Achievements
  {
    id: 'pullups_20',
    title: 'Back Strength',
    description: 'Do 20 pull-ups',
    category: 'elite',
    icon: '💎',
    rarity: 'epic',
    requirement: 20,
    unlocked: false,
    color: 'hsl(200, 98%, 39%)',
    glowColor: 'rgba(2, 132, 199, 0.3)'
  },
  {
    id: 'vo2max_50',
    title: 'Aerobic Machine',
    description: 'Reach VO2Max 50+',
    category: 'elite',
    icon: '🌟',
    rarity: 'legendary',
    requirement: 50,
    unlocked: false,
    color: 'hsl(45, 93%, 47%)',
    glowColor: 'rgba(234, 179, 8, 0.3)'
  },
  {
    id: 'recovery_perfect_week',
    title: 'Recovery Master',
    description: 'Week with 90+% recovery',
    category: 'elite',
    icon: '✨',
    rarity: 'legendary',
    requirement: 7,
    unlocked: false,
    color: 'hsl(280, 87%, 65%)',
    glowColor: 'rgba(168, 85, 247, 0.3)'
  }
];

export const getRarityColor = (rarity: Achievement['rarity']): string => {
  switch (rarity) {
    case 'common': return 'text-gray-500';
    case 'rare': return 'text-blue-500';
    case 'epic': return 'text-purple-500';
    case 'legendary': return 'text-yellow-500';
  }
};

export const getRarityBadgeVariant = (rarity: Achievement['rarity']): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (rarity) {
    case 'common': return 'secondary';
    case 'rare': return 'default';
    case 'epic': return 'destructive';
    case 'legendary': return 'outline';
  }
};

export const getCategoryName = (category: AchievementCategory): string => {
  switch (category) {
    case 'streak': return 'Streaks';
    case 'milestone': return 'Milestones';
    case 'workout': return 'Workouts';
    case 'social': return 'Social';
    case 'elite': return 'Elite';
  }
};
