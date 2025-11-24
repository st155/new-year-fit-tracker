export interface SupplementTimeRule {
  allowed: string[];
  default: string;
  warning: string;
}

export const SUPPLEMENT_TIME_RULES: Record<string, SupplementTimeRule> = {
  melatonin: {
    allowed: ['evening'],
    default: 'evening',
    warning: '⚠️ Мелатонин принимается только вечером перед сном!',
  },
  caffeine: {
    allowed: ['morning', 'afternoon'],
    default: 'morning',
    warning: '☕ Кофеин не рекомендуется принимать вечером',
  },
  'pre-workout': {
    allowed: ['morning', 'afternoon'],
    default: 'afternoon',
    warning: '💪 Предтреники лучше принимать до обеда',
  },
  magnesium: {
    allowed: ['evening'],
    default: 'evening',
    warning: '🌙 Магний лучше принимать вечером для сна',
  },
  ashwagandha: {
    allowed: ['evening'],
    default: 'evening',
    warning: '🧘 Ашвагандха помогает расслабиться - лучше вечером',
  },
  'vitamin d': {
    allowed: ['morning', 'afternoon'],
    default: 'morning',
    warning: '☀️ Витамин D лучше принимать утром',
  },
  b12: {
    allowed: ['morning', 'afternoon'],
    default: 'morning',
    warning: '⚡ Витамин B12 дает энергию - утром или днем',
  },
};

export interface ValidationResult {
  valid: boolean;
  warning?: string;
  suggested?: string[];
  corrected?: boolean;
}

export function validateIntakeTimes(
  supplementName: string,
  intakeTimes: string[]
): ValidationResult {
  const nameLower = supplementName.toLowerCase();

  // Check each rule
  for (const [keyword, rule] of Object.entries(SUPPLEMENT_TIME_RULES)) {
    if (nameLower.includes(keyword)) {
      const hasInvalidTime = intakeTimes.some(
        (time) => !rule.allowed.includes(time)
      );

      if (hasInvalidTime) {
        return {
          valid: false,
          warning: rule.warning,
          suggested: [rule.default],
          corrected: true,
        };
      }

      // Valid but provide info
      return {
        valid: true,
        warning: `✓ ${supplementName} - правильное время приема`,
      };
    }
  }

  // No specific rule found
  return { valid: true };
}

export function autoCorrectIntakeTimes(
  supplementName: string,
  intakeTimes: string[]
): { intakeTimes: string[]; warning?: string } {
  const validation = validateIntakeTimes(supplementName, intakeTimes);

  if (!validation.valid && validation.suggested) {
    return {
      intakeTimes: validation.suggested,
      warning: validation.warning,
    };
  }

  return { intakeTimes };
}
