import i18n from '@/i18n';

export interface SupplementTimeRule {
  allowed: string[];
  default: string;
  warningKey: string;
}

// Russian to English supplement name mapping for validation
const RUSSIAN_TO_ENGLISH: Record<string, string> = {
  'мелатонин': 'melatonin',
  'кофеин': 'caffeine',
  'магний': 'magnesium',
  'ашваганда': 'ashwagandha',
  '5 нтр': '5-htp',
  '5-нтр': '5-htp',
  'теанин': 'l-theanine',
  'л-теанин': 'l-theanine',
  'витамин d': 'vitamin d',
  'витамин д': 'vitamin d',
  'витамин c': 'vitamin c',
  'витамин с': 'vitamin c',
  'витамин b': 'b12',
};

// Static rules with translation keys instead of hardcoded strings
const SUPPLEMENT_TIME_RULES: Record<string, SupplementTimeRule> = {
  melatonin: {
    allowed: ['evening'],
    default: 'evening',
    warningKey: 'supplements:timeValidation.melatoninWarning',
  },
  caffeine: {
    allowed: ['morning', 'afternoon'],
    default: 'morning',
    warningKey: 'supplements:timeValidation.caffeineWarning',
  },
  'pre-workout': {
    allowed: ['morning', 'afternoon'],
    default: 'afternoon',
    warningKey: 'supplements:timeValidation.preWorkoutWarning',
  },
  magnesium: {
    allowed: ['evening'],
    default: 'evening',
    warningKey: 'supplements:timeValidation.magnesiumWarning',
  },
  ashwagandha: {
    allowed: ['evening'],
    default: 'evening',
    warningKey: 'supplements:timeValidation.ashwagandhaWarning',
  },
  'vitamin d': {
    allowed: ['morning', 'afternoon'],
    default: 'morning',
    warningKey: 'supplements:timeValidation.vitaminDWarning',
  },
  b12: {
    allowed: ['morning', 'afternoon'],
    default: 'morning',
    warningKey: 'supplements:timeValidation.b12Warning',
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
  
  // Try to convert Russian name to English for validation
  const englishName = RUSSIAN_TO_ENGLISH[nameLower] || nameLower;

  // Check each rule
  for (const [keyword, rule] of Object.entries(SUPPLEMENT_TIME_RULES)) {
    if (englishName.includes(keyword)) {
      const hasInvalidTime = intakeTimes.some(
        (time) => !rule.allowed.includes(time)
      );

      if (hasInvalidTime) {
        return {
          valid: false,
          warning: i18n.t(rule.warningKey),
          suggested: [rule.default],
          corrected: true,
        };
      }

      // Valid but provide info
      return {
        valid: true,
        warning: i18n.t('supplements:timeValidation.correctTime', { name: supplementName }),
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
