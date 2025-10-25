// Daily Challenges System

export interface DailyChallenge {
  id: string;
  type: 'steps' | 'workout' | 'sleep' | 'strain' | 'recovery';
  title: string;
  description: string;
  icon: string;
  targetValue: number;
  currentValue: number;
  pointsReward: number;
  completed: boolean;
  unit: string;
}

export const DAILY_CHALLENGE_TYPES = [
  {
    type: 'steps' as const,
    title: 'Step Master',
    description: 'Hit 10,000 steps today',
    icon: '👟',
    targetValue: 10000,
    pointsReward: 50,
    unit: 'steps'
  },
  {
    type: 'workout' as const,
    title: 'Daily Grind',
    description: 'Log a workout today',
    icon: '💪',
    targetValue: 1,
    pointsReward: 75,
    unit: 'workout'
  },
  {
    type: 'sleep' as const,
    title: 'Sleep Champion',
    description: 'Get 8+ hours of sleep',
    icon: '😴',
    targetValue: 8,
    pointsReward: 60,
    unit: 'hours'
  },
  {
    type: 'strain' as const,
    title: 'Beat Your Average',
    description: 'Exceed your average strain',
    icon: '🔥',
    targetValue: 0, // Will be calculated based on user average
    pointsReward: 100,
    unit: 'strain'
  },
  {
    type: 'recovery' as const,
    title: 'Recovery King',
    description: 'Hit 85% recovery today',
    icon: '⚡',
    targetValue: 85,
    pointsReward: 80,
    unit: '%'
  }
];

export function generateDailyChallenges(userAverages?: {
  avgStrain?: number;
  avgRecovery?: number;
  avgSleep?: number;
  avgSteps?: number;
}): DailyChallenge[] {
  const today = new Date().toDateString();
  const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Use seed to deterministically select 3 challenges
  const selectedTypes = [...DAILY_CHALLENGE_TYPES]
    .sort(() => 0.5 - ((seed * 9301 + 49297) % 233280 / 233280))
    .slice(0, 3);

  return selectedTypes.map((template, index) => {
    let targetValue = template.targetValue;
    
    // Adjust strain challenge based on user average
    if (template.type === 'strain' && userAverages?.avgStrain) {
      targetValue = Math.round(userAverages.avgStrain * 1.1); // 10% above average
    }
    
    return {
      id: `${today}-${template.type}-${index}`,
      type: template.type,
      title: template.title,
      description: template.description,
      icon: template.icon,
      targetValue,
      currentValue: 0,
      pointsReward: template.pointsReward,
      completed: false,
      unit: template.unit
    };
  });
}

export function updateChallengeProgress(
  challenge: DailyChallenge,
  currentValue: number
): DailyChallenge {
  return {
    ...challenge,
    currentValue,
    completed: currentValue >= challenge.targetValue
  };
}
