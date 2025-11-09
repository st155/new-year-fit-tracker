/**
 * Habit-specific analyzers for deep pattern analysis
 */

import { parseISO, getHours, getDay, differenceInDays, subDays } from 'date-fns';

interface HabitCompletion {
  id: string;
  habit_id: string;
  completed_at: string;
  user_id: string;
}

interface Habit {
  id: string;
  title: string;
  preferred_time?: string;
  current_streak: number;
  best_streak: number;
  category?: string;
  difficulty?: string;
}

export interface CompletionPattern {
  habitId: string;
  timeOfDay: string;
  dayOfWeek: number;
  avgSuccessRate: number;
  occurrences: number;
}

export interface HabitChain {
  habit1: string;
  habit2: string;
  coOccurrenceRate: number;
  avgTimeDifference: number; // minutes
}

/**
 * Analyze completion patterns by time of day and day of week
 */
export function analyzeCompletionPatterns(
  habitId: string,
  completions: HabitCompletion[]
): CompletionPattern[] {
  const habitCompletions = completions.filter(c => c.habit_id === habitId);
  
  if (habitCompletions.length < 5) return [];

  const patterns = new Map<string, { count: number; days: Set<string> }>();

  habitCompletions.forEach(completion => {
    const date = parseISO(completion.completed_at);
    const hour = getHours(date);
    const dayOfWeek = getDay(date);
    const dateStr = completion.completed_at.split('T')[0];

    const timeSlot = hour < 6 ? 'night' :
                     hour < 12 ? 'morning' :
                     hour < 17 ? 'afternoon' :
                     hour < 22 ? 'evening' : 'night';

    const key = `${timeSlot}-${dayOfWeek}`;
    
    if (!patterns.has(key)) {
      patterns.set(key, { count: 0, days: new Set() });
    }
    
    const pattern = patterns.get(key)!;
    pattern.count++;
    pattern.days.add(dateStr);
  });

  return Array.from(patterns.entries()).map(([key, data]) => {
    const [timeOfDay, dayOfWeek] = key.split('-');
    return {
      habitId,
      timeOfDay,
      dayOfWeek: parseInt(dayOfWeek),
      avgSuccessRate: (data.count / habitCompletions.length) * 100,
      occurrences: data.count,
    };
  }).sort((a, b) => b.avgSuccessRate - a.avgSuccessRate);
}

/**
 * Detect habits that are commonly completed together
 */
export function detectHabitChains(
  completions: HabitCompletion[]
): HabitChain[] {
  const chains: HabitChain[] = [];
  const habitsByDay = new Map<string, HabitCompletion[]>();

  // Group completions by day
  completions.forEach(completion => {
    const day = completion.completed_at.split('T')[0];
    if (!habitsByDay.has(day)) {
      habitsByDay.set(day, []);
    }
    habitsByDay.get(day)!.push(completion);
  });

  // Analyze co-occurrences
  const coOccurrences = new Map<string, { count: number; timeDiffs: number[] }>();
  const habitDays = new Map<string, Set<string>>();

  habitsByDay.forEach((dayCompletions, day) => {
    const sortedCompletions = dayCompletions.sort((a, b) => 
      a.completed_at.localeCompare(b.completed_at)
    );

    for (let i = 0; i < sortedCompletions.length; i++) {
      const habit1 = sortedCompletions[i].habit_id;
      
      if (!habitDays.has(habit1)) habitDays.set(habit1, new Set());
      habitDays.get(habit1)!.add(day);

      for (let j = i + 1; j < sortedCompletions.length; j++) {
        const habit2 = sortedCompletions[j].habit_id;
        if (habit1 === habit2) continue;

        const key = [habit1, habit2].sort().join('-');
        const time1 = parseISO(sortedCompletions[i].completed_at);
        const time2 = parseISO(sortedCompletions[j].completed_at);
        const timeDiff = Math.abs(time2.getTime() - time1.getTime()) / (1000 * 60); // minutes

        if (!coOccurrences.has(key)) {
          coOccurrences.set(key, { count: 0, timeDiffs: [] });
        }
        
        const coOcc = coOccurrences.get(key)!;
        coOcc.count++;
        coOcc.timeDiffs.push(timeDiff);
      }
    }
  });

  // Calculate co-occurrence rates
  coOccurrences.forEach((data, key) => {
    const [habit1, habit2] = key.split('-');
    const habit1Days = habitDays.get(habit1)?.size || 0;
    const habit2Days = habitDays.get(habit2)?.size || 0;
    const minDays = Math.min(habit1Days, habit2Days);

    if (minDays > 0 && data.count >= 3) {
      const avgTimeDiff = data.timeDiffs.reduce((a, b) => a + b, 0) / data.timeDiffs.length;
      chains.push({
        habit1,
        habit2,
        coOccurrenceRate: (data.count / minDays) * 100,
        avgTimeDifference: avgTimeDiff,
      });
    }
  });

  return chains.filter(c => c.coOccurrenceRate > 50).sort((a, b) => b.coOccurrenceRate - a.coOccurrenceRate);
}

/**
 * Calculate consistency score (0-100) for a habit
 */
export function calculateConsistencyScore(
  habit: Habit,
  completions: HabitCompletion[],
  days: number = 30
): number {
  const habitCompletions = completions.filter(c => c.habit_id === habit.id);
  
  if (habitCompletions.length === 0) return 0;

  const now = new Date();
  const startDate = subDays(now, days);
  const recentCompletions = habitCompletions.filter(c => 
    parseISO(c.completed_at) >= startDate
  );

  // Factor 1: Completion rate (40%)
  const completionRate = (recentCompletions.length / days) * 100;
  const completionScore = Math.min(completionRate, 100) * 0.4;

  // Factor 2: Streak stability (30%)
  const streakRatio = habit.best_streak > 0 
    ? (habit.current_streak / habit.best_streak) * 100 
    : habit.current_streak * 10;
  const streakScore = Math.min(streakRatio, 100) * 0.3;

  // Factor 3: Regularity (30%) - lower variance in completion times = higher score
  const dates = recentCompletions.map(c => parseISO(c.completed_at));
  if (dates.length < 2) {
    return completionScore + streakScore;
  }

  const intervals = [];
  for (let i = 1; i < dates.length; i++) {
    intervals.push(differenceInDays(dates[i], dates[i - 1]));
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, interval) => 
    sum + Math.pow(interval - avgInterval, 2), 0
  ) / intervals.length;
  
  const regularityScore = Math.max(0, 100 - variance * 10) * 0.3;

  return Math.round(completionScore + streakScore + regularityScore);
}

/**
 * Find optimal time for habit based on historical success
 */
export function findOptimalHabitTime(
  habitId: string,
  completions: HabitCompletion[]
): { time: string; successRate: number; confidence: number } | null {
  const patterns = analyzeCompletionPatterns(habitId, completions);
  
  if (patterns.length === 0) return null;

  const best = patterns[0];
  const totalCompletions = completions.filter(c => c.habit_id === habitId).length;
  
  return {
    time: best.timeOfDay,
    successRate: best.avgSuccessRate,
    confidence: Math.min((best.occurrences / totalCompletions) * 100, 100),
  };
}

/**
 * Calculate habit momentum - trend of recent performance
 */
export function calculateHabitMomentum(
  habitId: string,
  completions: HabitCompletion[]
): number {
  const habitCompletions = completions.filter(c => c.habit_id === habitId);
  
  if (habitCompletions.length < 7) return 0;

  const now = new Date();
  const recentWeek = habitCompletions.filter(c => 
    differenceInDays(now, parseISO(c.completed_at)) <= 7
  ).length;

  const previousWeek = habitCompletions.filter(c => {
    const days = differenceInDays(now, parseISO(c.completed_at));
    return days > 7 && days <= 14;
  }).length;

  if (previousWeek === 0) return recentWeek > 0 ? 100 : 0;

  return ((recentWeek - previousWeek) / previousWeek) * 100;
}

/**
 * Predict risk of habit streak breaking (0-100, higher = more risk)
 */
export function predictHabitRisk(
  habit: Habit,
  completions: HabitCompletion[]
): number {
  const habitCompletions = completions.filter(c => c.habit_id === habit.id);
  
  if (habitCompletions.length === 0) return 100;

  const now = new Date();
  const lastCompletion = habitCompletions.length > 0 
    ? parseISO(habitCompletions[habitCompletions.length - 1].completed_at)
    : null;

  if (!lastCompletion) return 100;

  const daysSinceCompletion = differenceInDays(now, lastCompletion);
  
  // Risk factors
  let risk = 0;

  // Factor 1: Days since last completion (40%)
  if (daysSinceCompletion === 0) risk += 0;
  else if (daysSinceCompletion === 1) risk += 20;
  else if (daysSinceCompletion === 2) risk += 40;
  else risk += 40;

  // Factor 2: Current streak vs best streak (30%)
  const streakRatio = habit.best_streak > 0 
    ? habit.current_streak / habit.best_streak 
    : 1;
  risk += (1 - streakRatio) * 30;

  // Factor 3: Recent consistency (30%)
  const consistency = calculateConsistencyScore(habit, completions, 14);
  risk += (100 - consistency) * 0.3;

  return Math.round(Math.min(risk, 100));
}

/**
 * Analyze streak quality - stable vs interrupted
 */
export function analyzeStreakQuality(
  habit: Habit,
  completions: HabitCompletion[]
): { quality: 'excellent' | 'good' | 'fair' | 'poor'; stability: number } {
  const consistency = calculateConsistencyScore(habit, completions, 30);
  const momentum = calculateHabitMomentum(habit.id, completions);

  const stability = (consistency + Math.max(0, momentum)) / 2;

  let quality: 'excellent' | 'good' | 'fair' | 'poor';
  if (stability >= 80) quality = 'excellent';
  else if (stability >= 60) quality = 'good';
  else if (stability >= 40) quality = 'fair';
  else quality = 'poor';

  return { quality, stability: Math.round(stability) };
}
