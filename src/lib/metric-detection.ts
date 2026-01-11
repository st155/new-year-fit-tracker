/**
 * Metric type detection helpers
 * Support both English and Russian metric names for bilingual compatibility
 */

export function isStepsMetric(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('step') || n.includes('шаг') || n.includes('steps');
}

export function isBodyFatMetric(name: string): boolean {
  const n = name.toLowerCase();
  return (n.includes('body') && n.includes('fat')) || 
         n.includes('процент жира') || n.includes('жир') ||
         n.includes('body_fat');
}

export function isStrainMetric(name: string): boolean {
  const n = name.toLowerCase();
  return (n.includes('strain') && !n.includes('workout')) || n.includes('нагрузка');
}

export function isActiveCaloriesMetric(name: string): boolean {
  const n = name.toLowerCase();
  return (n.includes('active') && n.includes('calor')) || n.includes('активные калории');
}

export function isRestingHRMetric(name: string): boolean {
  const n = name.toLowerCase();
  return (n.includes('resting') && n.includes('heart')) || 
         n.includes('resting hr') || n.includes('пульс в покое') ||
         n.includes('resting_heart');
}

export function isSleepEfficiencyMetric(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('sleep') && n.includes('efficiency');
}

export function isSleepDurationMetric(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('sleep') && (n.includes('duration') || n.includes('hours'));
}

export function isRecoveryMetric(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('recovery') || n.includes('восстановление');
}

export function isHRVMetric(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('hrv') || n.includes('вариабельность');
}

export function isMaxHRMetric(name: string): boolean {
  const n = name.toLowerCase();
  return (n.includes('max') && n.includes('heart')) || 
         n.includes('max hr') || n.includes('макс');
}

export function isWeightMetric(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('weight') || n.includes('вес');
}

export function isMuscleMassMetric(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('muscle') || n.includes('мышечн');
}

export function isCaloriesMetric(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('calor') || n.includes('калор');
}

export function isDistanceMetric(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('distance') || n.includes('дистанц') || n.includes('км');
}

export function isVO2MaxMetric(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('vo2') || n.includes('макс потреб');
}

export function isWorkoutStrainMetric(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('workout') && n.includes('strain');
}
