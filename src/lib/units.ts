import i18n from '@/i18n';

export interface UnitMapping {
  display: string;
  normalized: string;
  category: 'strength' | 'cardio' | 'time' | 'weight' | 'distance' | 'percentage';
}

// Internal mapping for normalization (without display strings)
const UNIT_NORMALIZE: Record<string, { normalized: string; category: UnitMapping['category'] }> = {
  // Strength
  'раз': { normalized: 'reps', category: 'strength' },
  'reps': { normalized: 'reps', category: 'strength' },
  'reps=': { normalized: 'reps', category: 'strength' },
  
  // Weight
  'кг': { normalized: 'kg', category: 'weight' },
  'kg': { normalized: 'kg', category: 'weight' },
  'кг×8': { normalized: 'kg', category: 'strength' },
  
  // Time
  'мин': { normalized: 'min', category: 'time' },
  'min': { normalized: 'min', category: 'time' },
  'сек': { normalized: 'sec', category: 'time' },
  'sec': { normalized: 'sec', category: 'time' },
  
  // Cardio
  'мл/кг/мин': { normalized: 'mlKgMin', category: 'cardio' },
  'ml/kg/min': { normalized: 'mlKgMin', category: 'cardio' },
  
  // Distance
  'км': { normalized: 'km', category: 'distance' },
  'km': { normalized: 'km', category: 'distance' },
  'м': { normalized: 'm', category: 'distance' },
  'm': { normalized: 'm', category: 'distance' },
  
  // Percentage
  '%': { normalized: 'percent', category: 'percentage' },
  'percent': { normalized: 'percent', category: 'percentage' }
};

/**
 * Get localized display string for a normalized unit
 */
function getUnitDisplay(normalized: string): string {
  return i18n.t(`units:display.${normalized}`);
}

/**
 * @deprecated Use normalizeUnit() which now returns localized display strings
 */
export const UNIT_MAPPINGS: Record<string, UnitMapping> = {};

export function normalizeUnit(unit: string): UnitMapping {
  const mapping = UNIT_NORMALIZE[unit.toLowerCase()];
  if (mapping) {
    return {
      display: getUnitDisplay(mapping.normalized),
      normalized: mapping.normalized,
      category: mapping.category
    };
  }
  
  // Fallback
  return {
    display: unit,
    normalized: unit,
    category: 'strength'
  };
}

export function formatMeasurement(value: number, unit: string): string {
  const mapping = normalizeUnit(unit);
  
  // Special cases for kg×reps format
  if (unit.includes('×')) {
    const parts = unit.split('×');
    if (parts.length === 2) {
      return i18n.t('units:display.kgReps', { value, reps: parts[1] });
    }
  }
  
  return `${value} ${mapping.display}`;
}

/**
 * Format strength goal with reps: "105 кг × 1" or "60 кг × 8"
 */
export function formatStrengthGoal(value: number, unit: string, reps?: number | null): string {
  const normalized = normalizeUnit(unit).normalized;
  if (reps && normalized === 'kg') {
    if (reps === 1) {
      return i18n.t('units:format.strengthGoal1RM', { value });
    }
    return i18n.t('units:format.strengthGoalReps', { value, reps });
  }
  return formatMeasurement(value, unit);
}

/**
 * Check if a goal is a strength-type goal that uses weight × reps format
 */
export function isStrengthWeightGoal(goalType: string, unit: string): boolean {
  const normalized = normalizeUnit(unit).normalized;
  return goalType === 'strength' && normalized === 'kg';
}

/**
 * Get common units by goal type (localized)
 */
export function getCommonUnitsByType(): Record<string, string[]> {
  return {
    strength: [getUnitDisplay('reps'), getUnitDisplay('kg'), getUnitDisplay('sec')],
    cardio: [getUnitDisplay('min'), getUnitDisplay('km'), getUnitDisplay('mlKgMin')],
    body_composition: [getUnitDisplay('kg'), getUnitDisplay('percent')],
    endurance: [getUnitDisplay('min'), getUnitDisplay('km'), getUnitDisplay('reps')],
    flexibility: [i18n.t('units:display.cm'), i18n.t('units:display.degrees')]
  };
}

/**
 * Get goal suggestions (localized)
 */
export function getGoalSuggestions(): Record<string, { name: string; value: number; unit: string }[]> {
  return {
    strength: [
      { name: i18n.t('units:suggestions.strength.pullups'), value: 10, unit: getUnitDisplay('reps') },
      { name: i18n.t('units:suggestions.strength.pushups'), value: 50, unit: getUnitDisplay('reps') },
      { name: i18n.t('units:suggestions.strength.benchPress'), value: 80, unit: getUnitDisplay('kg') },
      { name: i18n.t('units:suggestions.strength.squats'), value: 100, unit: getUnitDisplay('kg') }
    ],
    cardio: [
      { name: i18n.t('units:suggestions.cardio.run5k'), value: 25, unit: getUnitDisplay('min') },
      { name: i18n.t('units:suggestions.cardio.vo2max'), value: 45, unit: getUnitDisplay('mlKgMin') }
    ],
    body_composition: [
      { name: i18n.t('units:suggestions.bodyComposition.bodyFat'), value: 15, unit: getUnitDisplay('percent') },
      { name: i18n.t('units:suggestions.bodyComposition.weight'), value: 75, unit: getUnitDisplay('kg') }
    ],
    endurance: [
      { name: i18n.t('units:suggestions.endurance.run10k'), value: 60, unit: getUnitDisplay('min') },
      { name: i18n.t('units:suggestions.endurance.plank'), value: 5, unit: getUnitDisplay('min') }
    ]
  };
}

// Legacy exports removed - use getCommonUnitsByType() and getGoalSuggestions() instead
// These getter functions return localized values based on current language
