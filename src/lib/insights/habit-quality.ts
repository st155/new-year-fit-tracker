/**
 * Habit Quality Score Calculator
 * Calculates overall "quality" of a habit (0-100)
 */

import { parseISO, differenceInDays, subDays } from 'date-fns';
import { calculateConsistencyScore, calculateHabitMomentum } from './analyzers/habit-analyzer';

interface Habit {
  id: string;
  title: string;
  current_streak: number;
  best_streak: number;
  created_at?: string;
}

interface HabitCompletion {
  id: string;
  habit_id: string;
  completed_at: string;
  user_id: string;
}

export interface HabitQualityScore {
  habitId: string;
  overallScore: number;
  factors: {
    consistency: number; // 0-100
    streakStability: number; // 0-100
    trend: number; // 0-100
    completionRate: number; // 0-100
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation: string;
}

/**
 * Calculate comprehensive quality score for a habit
 */
export function calculateHabitQuality(
  habit: Habit,
  completions: HabitCompletion[],
  days: number = 30
): HabitQualityScore {
  const habitCompletions = completions.filter(c => c.habit_id === habit.id);
  
  // Factor 1: Consistency (40%) - regularity of completion
  const consistency = calculateConsistencyScore(habit, completions, days);
  const consistencyScore = consistency * 0.4;

  // Factor 2: Streak Stability (20%) - current streak vs best streak
  const streakRatio = habit.best_streak > 0 
    ? (habit.current_streak / habit.best_streak) * 100 
    : Math.min(habit.current_streak * 20, 100);
  const streakScore = Math.min(streakRatio, 100) * 0.2;

  // Factor 3: Trend (20%) - improving or declining
  const momentum = calculateHabitMomentum(habit.id, completions);
  const trendScore = Math.max(0, 50 + momentum / 2) * 0.2; // Normalize momentum to 0-100

  // Factor 4: Completion Rate (20%) - percentage of days completed
  const now = new Date();
  const startDate = subDays(now, days);
  const recentCompletions = habitCompletions.filter(c => 
    parseISO(c.completed_at) >= startDate
  ).length;
  const completionRate = (recentCompletions / days) * 100;
  const completionScore = Math.min(completionRate, 100) * 0.2;

  // Calculate overall score
  const overallScore = Math.round(consistencyScore + streakScore + trendScore + completionScore);

  // Determine grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 80) grade = 'B';
  else if (overallScore >= 70) grade = 'C';
  else if (overallScore >= 60) grade = 'D';
  else grade = 'F';

  // Generate recommendation
  let recommendation = '';
  if (overallScore >= 90) {
    recommendation = 'Отлично! Продолжайте в том же духе';
  } else if (consistency < 50) {
    recommendation = 'Улучшите регулярность выполнения привычки';
  } else if (streakRatio < 50) {
    recommendation = 'Сосредоточьтесь на поддержании стрейка';
  } else if (momentum < -20) {
    recommendation = 'Восстановите momentum - начните с малого';
  } else if (completionRate < 50) {
    recommendation = 'Увеличьте частоту выполнения привычки';
  } else {
    recommendation = 'Хорошая работа! Продолжайте улучшать';
  }

  return {
    habitId: habit.id,
    overallScore,
    factors: {
      consistency: Math.round(consistency),
      streakStability: Math.round(streakRatio),
      trend: Math.round(50 + momentum / 2),
      completionRate: Math.round(completionRate),
    },
    grade,
    recommendation,
  };
}

/**
 * Calculate quality scores for multiple habits
 */
export function calculateHabitsQuality(
  habits: Habit[],
  completions: HabitCompletion[],
  days: number = 30
): HabitQualityScore[] {
  return habits.map(habit => calculateHabitQuality(habit, completions, days));
}

/**
 * Get habits that need attention (quality score < 60)
 */
export function getHabitsNeedingAttention(
  qualityScores: HabitQualityScore[]
): HabitQualityScore[] {
  return qualityScores
    .filter(score => score.overallScore < 60)
    .sort((a, b) => a.overallScore - b.overallScore);
}

/**
 * Get top performing habits (quality score >= 80)
 */
export function getTopPerformingHabits(
  qualityScores: HabitQualityScore[]
): HabitQualityScore[] {
  return qualityScores
    .filter(score => score.overallScore >= 80)
    .sort((a, b) => b.overallScore - a.overallScore);
}
