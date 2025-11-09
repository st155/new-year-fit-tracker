/**
 * Habit correlation analyzer - find relationships between habits
 */

import { parseISO } from 'date-fns';

interface HabitCompletion {
  id: string;
  habit_id: string;
  completed_at: string;
  user_id: string;
}

interface Habit {
  id: string;
  title: string;
  category?: string;
}

export interface HabitDependency {
  sourceHabit: string;
  dependentHabit: string;
  strength: number; // 0-100
  direction: 'leads_to' | 'blocks' | 'neutral';
}

export interface HabitSynergy {
  habit1: string;
  habit2: string;
  synergyScore: number; // 0-100
  reason: string;
}

/**
 * Find dependencies between habits
 */
export function findHabitDependencies(
  completions: HabitCompletion[]
): HabitDependency[] {
  const dependencies: HabitDependency[] = [];
  const habitsByDay = new Map<string, Set<string>>();

  // Group by day
  completions.forEach(completion => {
    const day = completion.completed_at.split('T')[0];
    if (!habitsByDay.has(day)) {
      habitsByDay.set(day, new Set());
    }
    habitsByDay.get(day)!.add(completion.habit_id);
  });

  // Calculate conditional probabilities
  const habitPairs = new Map<string, { together: number; habit1Only: number; habit2Only: number }>();
  const habitCounts = new Map<string, number>();

  habitsByDay.forEach((habits) => {
    const habitArray = Array.from(habits);
    
    habitArray.forEach(habit => {
      habitCounts.set(habit, (habitCounts.get(habit) || 0) + 1);
    });

    for (let i = 0; i < habitArray.length; i++) {
      for (let j = 0; j < habitArray.length; j++) {
        if (i === j) continue;
        
        const key = `${habitArray[i]}->${habitArray[j]}`;
        if (!habitPairs.has(key)) {
          habitPairs.set(key, { together: 0, habit1Only: 0, habit2Only: 0 });
        }
        habitPairs.get(key)!.together++;
      }
    }
  });

  // Calculate dependency strength
  habitPairs.forEach((counts, key) => {
    const [habit1, habit2] = key.split('->');
    const habit1Count = habitCounts.get(habit1) || 0;
    const habit2Count = habitCounts.get(habit2) || 0;

    if (habit1Count < 3) return; // Need minimum data

    // P(habit2 | habit1) = P(habit2 and habit1) / P(habit1)
    const conditionalProb = (counts.together / habit1Count) * 100;
    
    // P(habit2) overall
    const habit2Prob = (habit2Count / habitsByDay.size) * 100;

    // If conditional probability is significantly higher than base rate, there's a dependency
    if (conditionalProb > habit2Prob * 1.3 && conditionalProb > 50) {
      dependencies.push({
        sourceHabit: habit1,
        dependentHabit: habit2,
        strength: Math.round(conditionalProb),
        direction: conditionalProb > habit2Prob * 1.5 ? 'leads_to' : 'neutral',
      });
    }
  });

  return dependencies.sort((a, b) => b.strength - a.strength);
}

/**
 * Detect trigger habits - completing one often leads to completing another
 */
export function detectTriggerHabits(
  completions: HabitCompletion[]
): Array<{ trigger: string; triggered: string; probability: number }> {
  const dependencies = findHabitDependencies(completions);
  
  return dependencies
    .filter(d => d.direction === 'leads_to' && d.strength >= 70)
    .map(d => ({
      trigger: d.sourceHabit,
      triggered: d.dependentHabit,
      probability: d.strength,
    }));
}

/**
 * Find synergies between habits (habits that work well together)
 */
export function findHabitSynergies(
  habits: Habit[],
  completions: HabitCompletion[]
): HabitSynergy[] {
  const synergies: HabitSynergy[] = [];
  const dependencies = findHabitDependencies(completions);

  // Bidirectional strong dependencies = synergy
  dependencies.forEach(dep => {
    const reverse = dependencies.find(
      d => d.sourceHabit === dep.dependentHabit && d.dependentHabit === dep.sourceHabit
    );

    if (reverse && dep.strength > 60 && reverse.strength > 60) {
      const habit1 = habits.find(h => h.id === dep.sourceHabit);
      const habit2 = habits.find(h => h.id === dep.dependentHabit);

      if (habit1 && habit2) {
        const avgStrength = (dep.strength + reverse.strength) / 2;
        synergies.push({
          habit1: dep.sourceHabit,
          habit2: dep.dependentHabit,
          synergyScore: Math.round(avgStrength),
          reason: `${habit1.title} и ${habit2.title} отлично работают вместе`,
        });
      }
    }
  });

  // Same category habits completed together = synergy
  const habitsByDay = new Map<string, Set<string>>();
  completions.forEach(c => {
    const day = c.completed_at.split('T')[0];
    if (!habitsByDay.has(day)) habitsByDay.set(day, new Set());
    habitsByDay.get(day)!.add(c.habit_id);
  });

  const categoryPairs = new Map<string, number>();
  habitsByDay.forEach(dayHabits => {
    const habitArray = Array.from(dayHabits);
    for (let i = 0; i < habitArray.length; i++) {
      for (let j = i + 1; j < habitArray.length; j++) {
        const habit1 = habits.find(h => h.id === habitArray[i]);
        const habit2 = habits.find(h => h.id === habitArray[j]);
        
        if (habit1?.category && habit2?.category && habit1.category === habit2.category) {
          const key = [habitArray[i], habitArray[j]].sort().join('-');
          categoryPairs.set(key, (categoryPairs.get(key) || 0) + 1);
        }
      }
    }
  });

  categoryPairs.forEach((count, key) => {
    if (count >= 5) {
      const [habit1Id, habit2Id] = key.split('-');
      const habit1 = habits.find(h => h.id === habit1Id);
      const habit2 = habits.find(h => h.id === habit2Id);

      if (habit1 && habit2 && !synergies.find(s => 
        (s.habit1 === habit1Id && s.habit2 === habit2Id) ||
        (s.habit1 === habit2Id && s.habit2 === habit1Id)
      )) {
        synergies.push({
          habit1: habit1Id,
          habit2: habit2Id,
          synergyScore: Math.min(count * 10, 100),
          reason: `Обе привычки из категории "${habit1.category}"`,
        });
      }
    }
  });

  return synergies.sort((a, b) => b.synergyScore - a.synergyScore);
}
