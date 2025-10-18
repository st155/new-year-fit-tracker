// Default habit templates with AI motivation milestones

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

export const DEFAULT_HABIT_TEMPLATES: HabitTemplate[] = [
  {
    id: 'no-smoking',
    name: 'Не курю',
    icon: '🚭',
    color: 'from-red-500 to-orange-500',
    habit_type: 'duration_counter',
    category: 'health',
    description: 'Отслеживание времени без курения',
    custom_settings: {
      cost_per_day: 300, // 300₽ в день экономии
      show_health_benefits: true
    },
    ai_motivation: {
      milestones: {
        20: '🫁 Через 20 минут пульс и давление нормализуются',
        480: '🩸 Через 8 часов уровень кислорода в крови повышается',
        1440: '❤️ Через 24 часа риск сердечного приступа снижается',
        2880: '👃 Через 2 дня обоняние и вкус улучшаются',
        4320: '🫁 Через 3 дня дыхание становится легче',
        10080: '✨ Через неделю никотин полностью выводится',
        20160: '🩸 Через 2 недели кровообращение улучшается',
        43200: '💪 Через месяц функция легких улучшается на 30%',
        525600: '🏆 Через год риск сердечных заболеваний снижается в 2 раза'
      }
    }
  },
  {
    id: 'no-alcohol',
    name: 'Не пью',
    icon: '🚫🍺',
    color: 'from-blue-500 to-purple-500',
    habit_type: 'duration_counter',
    category: 'health',
    description: 'Трезвость и восстановление здоровья',
    custom_settings: {
      cost_per_day: 500,
      show_health_benefits: true
    },
    ai_motivation: {
      milestones: {
        360: '🫀 Через 6 часов печень начинает восстанавливаться',
        1440: '😴 Через 24 часа сон улучшается, тревожность снижается',
        10080: '✨ Через неделю качество сна значительно лучше',
        43200: '💪 Через месяц иммунитет укрепляется, кожа сияет',
        525600: '🏆 Через год риск заболеваний печени почти нулевой'
      }
    }
  },
  {
    id: 'intermittent-fasting',
    name: 'Intermittent Fasting',
    icon: '⏰🍽️',
    color: 'from-green-500 to-teal-500',
    habit_type: 'fasting_tracker',
    category: 'nutrition',
    description: 'Интервальное голодание для здоровья и энергии',
    custom_settings: {
      default_window: 16, // 16:8
      track_eating_window: true
    },
    ai_motivation: {
      milestones: {
        720: '🔥 Через 12ч жиросжигание активируется',
        960: '♻️ Через 16ч аутофагия начинается',
        1080: '💪 Через 18ч максимальное жиросжигание',
        1440: '📈 Через 24ч гормон роста повышается на 2000%'
      }
    }
  },
  {
    id: 'no-sugar',
    name: 'Без сладкого',
    icon: '🚫🍬',
    color: 'from-pink-500 to-rose-500',
    habit_type: 'duration_counter',
    category: 'nutrition',
    description: 'Отказ от сахара для здоровья и энергии',
    ai_motivation: {
      milestones: {
        4320: '✨ Через 3 дня тяга к сахару снижается',
        10080: '⚡ Через неделю энергия стабилизируется',
        43200: '✨ Через месяц кожа заметно улучшается',
        129600: '🏆 Через 3 месяца вес стабилизируется'
      }
    }
  },
  {
    id: 'no-junk-food',
    name: 'Без фастфуда',
    icon: '🚫🍔',
    color: 'from-orange-500 to-red-500',
    habit_type: 'duration_counter',
    category: 'nutrition',
    description: 'Здоровое питание без junk food',
    ai_motivation: {
      milestones: {
        10080: '💪 Через неделю организм очищается',
        43200: '✨ Через месяц энергия повышается',
        129600: '🏆 Через 3 месяца вес нормализуется'
      }
    }
  }
];

export const getHabitTemplate = (templateId: string): HabitTemplate | undefined => {
  return DEFAULT_HABIT_TEMPLATES.find(t => t.id === templateId);
};

export const getDefaultHabits = (): HabitTemplate[] => {
  return DEFAULT_HABIT_TEMPLATES;
};
