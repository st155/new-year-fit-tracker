export interface UnitMapping {
  display: string;
  normalized: string;
  category: 'strength' | 'cardio' | 'time' | 'weight' | 'distance' | 'percentage';
}

export const UNIT_MAPPINGS: Record<string, UnitMapping> = {
  // Strength
  'раз': { display: 'раз', normalized: 'reps', category: 'strength' },
  'reps': { display: 'раз', normalized: 'reps', category: 'strength' },
  'reps=': { display: 'раз', normalized: 'reps', category: 'strength' },
  
  // Weight
  'кг': { display: 'кг', normalized: 'kg', category: 'weight' },
  'kg': { display: 'кг', normalized: 'kg', category: 'weight' },
  'кг×8': { display: 'кг (8 повторений)', normalized: 'kg', category: 'strength' },
  
  // Time
  'мин': { display: 'мин', normalized: 'min', category: 'time' },
  'min': { display: 'мин', normalized: 'min', category: 'time' },
  'сек': { display: 'сек', normalized: 'sec', category: 'time' },
  'sec': { display: 'сек', normalized: 'sec', category: 'time' },
  
  // Cardio
  'мл/кг/мин': { display: 'мл/кг/мин', normalized: 'ml/kg/min', category: 'cardio' },
  'ml/kg/min': { display: 'мл/кг/мин', normalized: 'ml/kg/min', category: 'cardio' },
  
  // Distance
  'км': { display: 'км', normalized: 'km', category: 'distance' },
  'km': { display: 'км', normalized: 'km', category: 'distance' },
  'м': { display: 'м', normalized: 'm', category: 'distance' },
  'm': { display: 'м', normalized: 'm', category: 'distance' },
  
  // Percentage
  '%': { display: '%', normalized: 'percent', category: 'percentage' },
  'percent': { display: '%', normalized: 'percent', category: 'percentage' }
};

export function normalizeUnit(unit: string): UnitMapping {
  const mapping = UNIT_MAPPINGS[unit.toLowerCase()];
  if (mapping) return mapping;
  
  // Fallback
  return {
    display: unit,
    normalized: unit,
    category: 'strength'
  };
}

export function formatMeasurement(value: number, unit: string): string {
  const mapping = normalizeUnit(unit);
  
  // Special cases
  if (unit.includes('×')) {
    const parts = unit.split('×');
    if (parts.length === 2) {
      return `${value} кг (${parts[1]} повторений)`;
    }
  }
  
  return `${value} ${mapping.display}`;
}

/**
 * Format strength goal with reps: "105 кг × 1" or "60 кг × 8"
 */
export function formatStrengthGoal(value: number, unit: string, reps?: number | null): string {
  if (reps && (unit === 'кг' || unit === 'kg')) {
    if (reps === 1) {
      return `${value} кг (1RM)`;
    }
    return `${value} кг × ${reps}`;
  }
  return formatMeasurement(value, unit);
}

/**
 * Check if a goal is a strength-type goal that uses weight × reps format
 */
export function isStrengthWeightGoal(goalType: string, unit: string): boolean {
  return (goalType === 'strength' && (unit === 'кг' || unit === 'kg'));
}

export const COMMON_UNITS_BY_TYPE: Record<string, string[]> = {
  strength: ['раз', 'кг', 'сек'],
  cardio: ['мин', 'км', 'мл/кг/мин'],
  body_composition: ['кг', '%'],
  endurance: ['мин', 'км', 'раз'],
  flexibility: ['см', 'градусы']
};

export const GOAL_SUGGESTIONS: Record<string, { name: string; value: number; unit: string }[]> = {
  strength: [
    { name: 'Подтягивания', value: 10, unit: 'раз' },
    { name: 'Отжимания', value: 50, unit: 'раз' },
    { name: 'Жим лёжа', value: 80, unit: 'кг' },
    { name: 'Приседания', value: 100, unit: 'кг' }
  ],
  cardio: [
    { name: 'Бег 5 км', value: 25, unit: 'мин' },
    { name: 'VO₂max', value: 45, unit: 'мл/кг/мин' }
  ],
  body_composition: [
    { name: 'Процент жира', value: 15, unit: '%' },
    { name: 'Вес', value: 75, unit: 'кг' }
  ],
  endurance: [
    { name: 'Бег 10 км', value: 60, unit: 'мин' },
    { name: 'Планка', value: 5, unit: 'мин' }
  ]
};
