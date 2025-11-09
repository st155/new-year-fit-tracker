/**
 * AI-powered habit recommendations engine
 */

import { findOptimalHabitTime, analyzeCompletionPatterns } from './analyzers/habit-analyzer';
import { findHabitSynergies, detectTriggerHabits } from './analyzers/habit-correlation';
import { getHabitsNeedingAttention } from './habit-quality';
import type { HabitQualityScore } from './habit-quality';

interface Habit {
  id: string;
  title: string;
  category?: string;
  preferred_time?: string;
  difficulty?: string;
  current_streak: number;
}

interface HabitCompletion {
  id: string;
  habit_id: string;
  completed_at: string;
  user_id: string;
}

export interface HabitRecommendation {
  type: 'new_habit' | 'optimize_time' | 'difficulty_adjust' | 'synergy' | 'fill_gap';
  priority: number; // 0-100
  title: string;
  description: string;
  actionable: boolean;
  data?: any;
}

/**
 * Generate comprehensive habit recommendations
 */
export function generateHabitRecommendations(
  habits: Habit[],
  completions: HabitCompletion[],
  qualityScores: HabitQualityScore[]
): HabitRecommendation[] {
  const recommendations: HabitRecommendation[] = [];

  // 1. Time optimization recommendations
  recommendations.push(...suggestOptimalHabitTimes(habits, completions));

  // 2. Fill gaps in habit coverage
  recommendations.push(...suggestGapFillers(habits, completions));

  // 3. Difficulty adjustments
  recommendations.push(...suggestDifficultyAdjustments(habits, qualityScores));

  // 4. Synergy-based recommendations
  recommendations.push(...suggestSynergies(habits, completions));

  // 5. Based on successful habits
  recommendations.push(...suggestBasedOnSuccess(habits, qualityScores));

  return recommendations
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10); // Top 10 recommendations
}

/**
 * Suggest optimal times for habits
 */
function suggestOptimalHabitTimes(
  habits: Habit[],
  completions: HabitCompletion[]
): HabitRecommendation[] {
  const recommendations: HabitRecommendation[] = [];

  habits.forEach(habit => {
    const optimalTime = findOptimalHabitTime(habit.id, completions);
    
    if (optimalTime && optimalTime.confidence > 60 && optimalTime.successRate > 70) {
      const currentTime = habit.preferred_time || 'anytime';
      
      if (currentTime !== optimalTime.time) {
        recommendations.push({
          type: 'optimize_time',
          priority: Math.round(optimalTime.confidence),
          title: `Оптимизируйте время для "${habit.title}"`,
          description: `Привычка выполняется на ${Math.round(optimalTime.successRate)}% успешнее ${getTimeLabel(optimalTime.time)}`,
          actionable: true,
          data: {
            habitId: habit.id,
            suggestedTime: optimalTime.time,
            currentTime,
            improvementPercent: optimalTime.successRate,
          },
        });
      }
    }
  });

  return recommendations;
}

/**
 * Suggest filling gaps in habit coverage
 */
function suggestGapFillers(
  habits: Habit[],
  completions: HabitCompletion[]
): HabitRecommendation[] {
  const recommendations: HabitRecommendation[] = [];
  
  // Check time coverage
  const timeSlots = ['morning', 'afternoon', 'evening', 'night'];
  const coveredSlots = new Set(habits.map(h => h.preferred_time).filter(Boolean));
  
  const missingSlots = timeSlots.filter(slot => !coveredSlots.has(slot));
  
  missingSlots.forEach(slot => {
    if (slot === 'evening' || slot === 'morning') {
      recommendations.push({
        type: 'fill_gap',
        priority: 70,
        title: `Добавьте ${getTimeLabel(slot)} привычку`,
        description: `У вас нет привычек ${getTimeLabel(slot)}. Это отличное время для новых привычек!`,
        actionable: true,
        data: { suggestedTime: slot },
      });
    }
  });

  // Check category coverage
  const categories = ['health', 'productivity', 'learning', 'mindfulness', 'fitness'];
  const coveredCategories = new Set(habits.map(h => h.category).filter(Boolean));
  const missingCategories = categories.filter(cat => !coveredCategories.has(cat));

  if (missingCategories.length > 0 && habits.length < 10) {
    const suggestedCategory = missingCategories[0];
    recommendations.push({
      type: 'fill_gap',
      priority: 60,
      title: `Добавьте привычку из категории "${getCategoryLabel(suggestedCategory)}"`,
      description: 'Разнообразие привычек помогает развиваться разносторонне',
      actionable: true,
      data: { suggestedCategory },
    });
  }

  return recommendations;
}

/**
 * Suggest difficulty adjustments
 */
function suggestDifficultyAdjustments(
  habits: Habit[],
  qualityScores: HabitQualityScore[]
): HabitRecommendation[] {
  const recommendations: HabitRecommendation[] = [];
  const strugglingHabits = getHabitsNeedingAttention(qualityScores);

  strugglingHabits.slice(0, 3).forEach(score => {
    const habit = habits.find(h => h.id === score.habitId);
    if (!habit) return;

    if (score.factors.completionRate < 40) {
      recommendations.push({
        type: 'difficulty_adjust',
        priority: 80,
        title: `Упростите "${habit.title}"`,
        description: `Привычка выполняется только в ${score.factors.completionRate}% случаев. Попробуйте уменьшить сложность`,
        actionable: true,
        data: {
          habitId: habit.id,
          currentDifficulty: habit.difficulty,
          suggestion: 'Начните с меньшей продолжительности или частоты',
        },
      });
    }
  });

  return recommendations;
}

/**
 * Suggest synergies
 */
function suggestSynergies(
  habits: Habit[],
  completions: HabitCompletion[]
): HabitRecommendation[] {
  const recommendations: HabitRecommendation[] = [];
  const synergies = findHabitSynergies(habits, completions);

  synergies.slice(0, 2).forEach(synergy => {
    const habit1 = habits.find(h => h.id === synergy.habit1);
    const habit2 = habits.find(h => h.id === synergy.habit2);

    if (habit1 && habit2) {
      recommendations.push({
        type: 'synergy',
        priority: synergy.synergyScore,
        title: 'Объедините привычки в группу',
        description: `"${habit1.title}" и "${habit2.title}" отлично работают вместе (${synergy.synergyScore}% синергия)`,
        actionable: true,
        data: {
          habit1Id: habit1.id,
          habit2Id: habit2.id,
          synergyScore: synergy.synergyScore,
        },
      });
    }
  });

  return recommendations;
}

/**
 * Suggest based on successful habits
 */
function suggestBasedOnSuccess(
  habits: Habit[],
  qualityScores: HabitQualityScore[]
): HabitRecommendation[] {
  const recommendations: HabitRecommendation[] = [];
  const topHabits = qualityScores
    .filter(score => score.overallScore >= 80)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 3);

  if (topHabits.length > 0) {
    const bestHabit = habits.find(h => h.id === topHabits[0].habitId);
    
    if (bestHabit) {
      const timeSlot = bestHabit.preferred_time;
      
      if (timeSlot && timeSlot !== 'anytime') {
        recommendations.push({
          type: 'new_habit',
          priority: 65,
          title: `Добавьте привычку ${getTimeLabel(timeSlot)}`,
          description: `Вы отлично справляетесь с "${bestHabit.title}" ${getTimeLabel(timeSlot)} - это ваше лучшее время!`,
          actionable: true,
          data: {
            suggestedTime: timeSlot,
            basedOnHabit: bestHabit.id,
          },
        });
      }
    }
  }

  return recommendations;
}

// Helper functions
function getTimeLabel(time: string): string {
  const labels: Record<string, string> = {
    morning: 'утром',
    afternoon: 'днём',
    evening: 'вечером',
    night: 'ночью',
    anytime: 'в любое время',
  };
  return labels[time] || time;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    health: 'Здоровье',
    productivity: 'Продуктивность',
    learning: 'Обучение',
    mindfulness: 'Осознанность',
    fitness: 'Фитнес',
  };
  return labels[category] || category;
}
