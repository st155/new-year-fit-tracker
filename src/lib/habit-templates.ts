// Default habit templates with AI motivation milestones
import i18n from '@/i18n';

export interface HabitTemplate {
  id: string;
  name: string;
  icon: string;
  color: string;
  habit_type: 'duration_counter' | 'fasting_tracker' | 'daily_check' | 'numeric_counter' | 'daily_measurement';
  category: string;
  description: string;
  custom_settings?: Record<string, any>;
  ai_motivation?: {
    milestones: Record<number, string>; // minutes -> message
  };
}

// Template IDs mapped to i18n keys
const TEMPLATE_I18N_MAP: Record<string, string> = {
  'no-smoking': 'noSmoking',
  'no-alcohol': 'noAlcohol',
  'intermittent-fasting': 'intermittentFasting',
  'no-sugar': 'noSugar',
  'no-junk-food': 'noJunkFood',
  'no-weed': 'noWeed',
};

// Base templates with structure only (translations come from i18n)
const BASE_TEMPLATES: Array<Omit<HabitTemplate, 'name' | 'description' | 'ai_motivation'> & { 
  milestoneMinutes: number[];
  custom_settings?: Record<string, any>;
}> = [
  {
    id: 'no-smoking',
    icon: '🚭',
    color: 'from-red-500 to-orange-500',
    habit_type: 'duration_counter',
    category: 'health',
    milestoneMinutes: [20, 480, 1440, 2880, 4320, 10080, 20160, 43200, 525600],
    custom_settings: {
      cost_per_day: 300,
      show_health_benefits: true
    }
  },
  {
    id: 'no-alcohol',
    icon: '🚫🍺',
    color: 'from-blue-500 to-purple-500',
    habit_type: 'duration_counter',
    category: 'health',
    milestoneMinutes: [360, 1440, 10080, 43200, 525600],
    custom_settings: {
      cost_per_day: 500,
      show_health_benefits: true
    }
  },
  {
    id: 'intermittent-fasting',
    icon: '⏰🍽️',
    color: 'from-green-500 to-teal-500',
    habit_type: 'fasting_tracker',
    category: 'nutrition',
    milestoneMinutes: [720, 960, 1080, 1440],
    custom_settings: {
      default_window: 16,
      track_eating_window: true
    }
  },
  {
    id: 'no-sugar',
    icon: '🚫🍬',
    color: 'from-pink-500 to-rose-500',
    habit_type: 'duration_counter',
    category: 'nutrition',
    milestoneMinutes: [4320, 10080, 43200, 129600]
  },
  {
    id: 'no-junk-food',
    icon: '🚫🍔',
    color: 'from-orange-500 to-red-500',
    habit_type: 'duration_counter',
    category: 'nutrition',
    milestoneMinutes: [10080, 43200, 129600]
  },
  {
    id: 'no-weed',
    icon: '🌿🚫',
    color: 'from-green-500 to-emerald-500',
    habit_type: 'duration_counter',
    category: 'health',
    milestoneMinutes: [1440, 4320, 10080, 20160, 43200, 129600, 259200],
    custom_settings: {
      cost_per_day: 500,
      show_health_benefits: true
    }
  }
];

/**
 * Get localized habit templates
 */
export function getLocalizedTemplates(): HabitTemplate[] {
  const t = i18n.t.bind(i18n);
  
  return BASE_TEMPLATES.map(base => {
    const i18nKey = TEMPLATE_I18N_MAP[base.id];
    
    const milestones: Record<number, string> = {};
    base.milestoneMinutes.forEach(minutes => {
      const milestoneKey = `habits:templates.${i18nKey}.milestones.${minutes}`;
      milestones[minutes] = t(milestoneKey);
    });
    
    return {
      id: base.id,
      icon: base.icon,
      color: base.color,
      habit_type: base.habit_type,
      category: base.category,
      custom_settings: base.custom_settings,
      name: t(`habits:templates.${i18nKey}.name`),
      description: t(`habits:templates.${i18nKey}.description`),
      ai_motivation: {
        milestones
      }
    };
  });
}

export const getHabitTemplate = (templateId: string): HabitTemplate | undefined => {
  return getLocalizedTemplates().find(t => t.id === templateId);
};

export const getDefaultHabits = (): HabitTemplate[] => {
  return getLocalizedTemplates();
};
