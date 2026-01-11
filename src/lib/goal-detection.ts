/**
 * Goal detection helpers for localized goal names
 * Supports both Russian and English goal keywords
 */

// Mapping of keywords for both languages
const GOAL_KEYWORDS = {
  bodyFat: ['жир', 'fat', 'body fat', 'bodyfat', 'процент жира', 'body_fat'],
  weight: ['вес', 'weight', 'масса'],
  running: ['бег', 'run', 'running'],
  rowing: ['гребля', 'row', 'rowing'],
  time: ['время', 'time'],
  plank: ['планка', 'plank'],
  pullups: ['подтягивания', 'pull-up', 'pullups', 'pull up'],
  pushups: ['отжимания', 'push-up', 'pushups', 'push up'],
  benchPress: ['жим', 'bench', 'bench press'],
  lunges: ['выпады', 'lunge', 'lunges'],
  steps: ['шаги', 'steps', 'step'],
  vo2max: ['vo2', 'vo2max', 'vo₂max'],
};

const TIME_UNITS = ['мин', 'min', 'сек', 'sec', 'minute', 'second'];

/**
 * Check if a goal is "lower is better" (e.g., body fat, time-based running)
 */
export function isLowerBetterGoal(goalName: string, goalType: string): boolean {
  const nameLower = goalName.toLowerCase();
  
  if (goalType === 'body_composition') return true;
  
  const bodyFatKeywords = GOAL_KEYWORDS.bodyFat;
  const weightKeywords = GOAL_KEYWORDS.weight;
  const runningKeywords = GOAL_KEYWORDS.running;
  const rowingKeywords = GOAL_KEYWORDS.rowing;
  
  if (bodyFatKeywords.some(k => nameLower.includes(k))) return true;
  if (weightKeywords.some(k => nameLower.includes(k)) && goalType === 'body_composition') return true;
  
  // Running/rowing with km distance = lower time is better
  if (runningKeywords.some(k => nameLower.includes(k)) && (nameLower.includes('км') || nameLower.includes('km'))) return true;
  if (rowingKeywords.some(k => nameLower.includes(k)) && (nameLower.includes('км') || nameLower.includes('km'))) return true;
  
  return false;
}

/**
 * Check if a goal is time-based (except plank which is higher = better)
 */
export function isTimeBasedGoal(goalName: string, unit: string): boolean {
  const nameLower = goalName.toLowerCase();
  const unitLower = unit.toLowerCase();
  
  const timeGoals = [...GOAL_KEYWORDS.running, ...GOAL_KEYWORDS.rowing, ...GOAL_KEYWORDS.time];
  const plankKeywords = GOAL_KEYWORDS.plank;
  
  // Plank is an exception (more = better)
  if (plankKeywords.some(k => nameLower.includes(k))) return false;
  
  const hasTimeUnit = TIME_UNITS.some(u => unitLower.includes(u));
  const hasTimeGoal = timeGoals.some(g => nameLower.includes(g));
  
  return hasTimeUnit || hasTimeGoal;
}

/**
 * Map goal name to a route key for navigation
 */
export function goalNameToRouteKey(goalName: string): string | null {
  const nameLower = goalName.toLowerCase();
  
  const routeMap: [string[], string][] = [
    [GOAL_KEYWORDS.weight, 'weight'],
    [GOAL_KEYWORDS.bodyFat, 'body_fat'],
    [GOAL_KEYWORDS.vo2max, 'vo2max'],
    [GOAL_KEYWORDS.steps, 'steps'],
    // Goals without dedicated detail screens go to recovery
    [GOAL_KEYWORDS.pullups, 'recovery'],
    [GOAL_KEYWORDS.pushups, 'recovery'],
    [GOAL_KEYWORDS.benchPress, 'recovery'],
    [GOAL_KEYWORDS.plank, 'recovery'],
    [GOAL_KEYWORDS.lunges, 'recovery'],
    [GOAL_KEYWORDS.running, 'recovery'],
  ];
  
  for (const [keywords, route] of routeMap) {
    if (keywords.some(k => nameLower.includes(k))) {
      return route;
    }
  }
  
  return null;
}

/**
 * Check if unit is weight-related (kg/lb)
 */
export function isWeightUnit(unit: string): boolean {
  const unitLower = unit.toLowerCase();
  return ['кг', 'kg', 'lb', 'lbs', 'pound', 'pounds', 'килограмм'].some(u => unitLower.includes(u));
}

/**
 * Check if goal is rep-based
 */
export function isRepBasedGoal(unit: string): boolean {
  const unitLower = unit.toLowerCase();
  return ['раз', 'повтор', 'rep', 'reps', 'times', 'повторений'].some(u => unitLower.includes(u));
}

export { GOAL_KEYWORDS, TIME_UNITS };
