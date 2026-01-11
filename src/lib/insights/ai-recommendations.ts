/**
 * AI-powered habit recommendations engine
 */

import i18n from '@/i18n';
import { findOptimalHabitTime, analyzeCompletionPatterns } from './analyzers/habit-analyzer';
import { findHabitSynergies, detectTriggerHabits } from './analyzers/habit-correlation';
import { getHabitsNeedingAttention } from './habit-quality';
import type { HabitQualityScore } from './habit-quality';

interface Habit {
  id: string;
  name?: string;
  title?: string; // legacy
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

export interface RecommendationTextOptions {
  defaultName: string;
  timeLabels: Record<string, string>;
  categoryLabels: Record<string, string>;
  texts: {
    optimizeTime: (name: string) => string;
    successRate: (rate: number, time: string) => string;
    addTimeSlot: (time: string) => string;
    noHabitsAtTime: (time: string) => string;
    addCategory: (category: string) => string;
    diversityHelps: string;
    simplify: (name: string) => string;
    lowCompletion: (rate: number) => string;
    startSmaller: string;
    combineHabits: string;
    workTogether: (name1: string, name2: string, score: number) => string;
    addHabitAtTime: (time: string) => string;
    doingGreat: (name: string, time: string) => string;
  };
}

function getHabitName(habit: Habit, defaultName: string): string {
  return habit.name || habit.title || defaultName;
}

/**
 * Generate comprehensive habit recommendations
 */
export function generateHabitRecommendations(
  habits: Habit[],
  completions: HabitCompletion[],
  qualityScores: HabitQualityScore[],
  textOptions?: RecommendationTextOptions
): HabitRecommendation[] {
  const recommendations: HabitRecommendation[] = [];
  const texts = textOptions || getDefaultTextOptions();

  // 1. Time optimization recommendations
  recommendations.push(...suggestOptimalHabitTimes(habits, completions, texts));

  // 2. Fill gaps in habit coverage
  recommendations.push(...suggestGapFillers(habits, completions, texts));

  // 3. Difficulty adjustments
  recommendations.push(...suggestDifficultyAdjustments(habits, qualityScores, texts));

  // 4. Synergy-based recommendations
  recommendations.push(...suggestSynergies(habits, completions, texts));

  // 5. Based on successful habits
  recommendations.push(...suggestBasedOnSuccess(habits, qualityScores, texts));

  return recommendations
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10); // Top 10 recommendations
}

// Default text options using i18n
function getDefaultTextOptions(): RecommendationTextOptions {
  return {
    defaultName: i18n.t('habits:defaultName'),
    timeLabels: {
      morning: i18n.t('common:time.morning'),
      afternoon: i18n.t('common:time.afternoon'),
      evening: i18n.t('common:time.evening'),
      night: i18n.t('common:time.night'),
      anytime: i18n.t('common:time.anytime'),
    },
    categoryLabels: {
      health: i18n.t('habits:categories.health'),
      productivity: i18n.t('habits:categories.productivity'),
      learning: i18n.t('habits:categories.learning'),
      mindfulness: i18n.t('habits:categories.mindfulness'),
      fitness: i18n.t('habits:categories.fitness'),
    },
    texts: {
      optimizeTime: (name) => i18n.t('recommendations:optimizeTime', { name }),
      successRate: (rate, time) => i18n.t('recommendations:successRate', { rate, time }),
      addTimeSlot: (time) => i18n.t('recommendations:addTimeSlot', { time }),
      noHabitsAtTime: (time) => i18n.t('recommendations:noHabitsAtTime', { time }),
      addCategory: (category) => i18n.t('recommendations:addCategory', { category }),
      diversityHelps: i18n.t('recommendations:diversityHelps'),
      simplify: (name) => i18n.t('recommendations:simplify', { name }),
      lowCompletion: (rate) => i18n.t('recommendations:lowCompletion', { rate }),
      startSmaller: i18n.t('recommendations:startSmaller'),
      combineHabits: i18n.t('recommendations:combineHabits'),
      workTogether: (name1, name2, score) => i18n.t('recommendations:workTogether', { name1, name2, score }),
      addHabitAtTime: (time) => i18n.t('recommendations:addHabitAtTime', { time }),
      doingGreat: (name, time) => i18n.t('recommendations:doingGreat', { name, time }),
    },
  };
}

/**
 * Suggest optimal times for habits
 */
function suggestOptimalHabitTimes(
  habits: Habit[],
  completions: HabitCompletion[],
  texts: RecommendationTextOptions
): HabitRecommendation[] {
  const recommendations: HabitRecommendation[] = [];

  habits.forEach(habit => {
    const optimalTime = findOptimalHabitTime(habit.id, completions);
    
    if (optimalTime && optimalTime.confidence > 60 && optimalTime.successRate > 70) {
      const currentTime = habit.preferred_time || 'anytime';
      
      if (currentTime !== optimalTime.time) {
        const timeLabel = texts.timeLabels[optimalTime.time] || optimalTime.time;
        recommendations.push({
          type: 'optimize_time',
          priority: Math.round(optimalTime.confidence),
          title: texts.texts.optimizeTime(getHabitName(habit, texts.defaultName)),
          description: texts.texts.successRate(Math.round(optimalTime.successRate), timeLabel),
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
  completions: HabitCompletion[],
  texts: RecommendationTextOptions
): HabitRecommendation[] {
  const recommendations: HabitRecommendation[] = [];
  
  // Check time coverage
  const timeSlots = ['morning', 'afternoon', 'evening', 'night'];
  const coveredSlots = new Set(habits.map(h => h.preferred_time).filter(Boolean));
  
  const missingSlots = timeSlots.filter(slot => !coveredSlots.has(slot));
  
  missingSlots.forEach(slot => {
    if (slot === 'evening' || slot === 'morning') {
      const timeLabel = texts.timeLabels[slot] || slot;
      recommendations.push({
        type: 'fill_gap',
        priority: 70,
        title: texts.texts.addTimeSlot(timeLabel),
        description: texts.texts.noHabitsAtTime(timeLabel),
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
    const categoryLabel = texts.categoryLabels[suggestedCategory] || suggestedCategory;
    recommendations.push({
      type: 'fill_gap',
      priority: 60,
      title: texts.texts.addCategory(categoryLabel),
      description: texts.texts.diversityHelps,
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
  qualityScores: HabitQualityScore[],
  texts: RecommendationTextOptions
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
        title: texts.texts.simplify(getHabitName(habit, texts.defaultName)),
        description: texts.texts.lowCompletion(score.factors.completionRate),
        actionable: true,
        data: {
          habitId: habit.id,
          currentDifficulty: habit.difficulty,
          suggestion: texts.texts.startSmaller,
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
  completions: HabitCompletion[],
  texts: RecommendationTextOptions
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
        title: texts.texts.combineHabits,
        description: texts.texts.workTogether(
          getHabitName(habit1, texts.defaultName),
          getHabitName(habit2, texts.defaultName),
          synergy.synergyScore
        ),
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
  qualityScores: HabitQualityScore[],
  texts: RecommendationTextOptions
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
        const timeLabel = texts.timeLabels[timeSlot] || timeSlot;
        recommendations.push({
          type: 'new_habit',
          priority: 65,
          title: texts.texts.addHabitAtTime(timeLabel),
          description: texts.texts.doingGreat(getHabitName(bestHabit, texts.defaultName), timeLabel),
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
