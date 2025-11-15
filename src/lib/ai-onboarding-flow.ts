export type OnboardingStepType = 
  | 'message'
  | 'health_connect'
  | 'button_group'
  | 'slider'
  | 'day_selector'
  | 'chip_multi_select'
  | 'number_input'
  | 'image_toggle'
  | 'final_button';

export interface OnboardingStep {
  id: string;
  type: OnboardingStepType;
  aiMessage: string;
  aiMessageShort?: string;
  component?: {
    name: string;
    props: Record<string, any>;
  };
  saveKey?: string;
  nextStep?: string;
}

export const ONBOARDING_FLOW: OnboardingStep[] = [
  {
    id: 'step_1_welcome',
    type: 'message',
    aiMessage: '👋 Привет! Я твой AI-тренер. За 5 простых шагов я создам идеальный тренировочный план для тебя.',
    nextStep: 'step_2_goal'
  },
  {
    id: 'step_2_goal',
    type: 'button_group',
    aiMessage: '🎯 Шаг 1/5: Какая твоя главная цель?',
    aiMessageShort: 'Цель',
    component: { 
      name: 'ButtonToggleGroup', 
      props: {
        options: [
          { value: 'hypertrophy', label: 'Набор Мышц', icon: 'Dumbbell' },
          { value: 'fat_loss', label: 'Сбросить Вес', icon: 'Flame' },
          { value: 'strength', label: 'Стать Сильнее', icon: 'Zap' }
        ]
      }
    },
    saveKey: 'primary_goal',
    nextStep: 'step_3_experience'
  },
  {
    id: 'step_3_experience',
    type: 'button_group',
    aiMessage: '💪 Шаг 2/5: Какой у тебя опыт тренировок?',
    aiMessageShort: 'Опыт',
    component: { 
      name: 'ButtonToggleGroup', 
      props: {
        options: [
          { value: 'beginner', label: 'Новичок', description: '< 1 года' },
          { value: 'intermediate', label: 'Средний', description: '1-3 года' },
          { value: 'advanced', label: 'Продвинутый', description: '3+ лет' }
        ]
      }
    },
    saveKey: 'experience_level',
    nextStep: 'step_4_schedule'
  },
  {
    id: 'step_4_schedule',
    type: 'day_selector',
    aiMessage: '📅 Шаг 3/5: В какие дни недели ты можешь тренироваться?',
    aiMessageShort: 'Расписание',
    component: { name: 'DaySelector', props: {} },
    saveKey: 'training_days',
    nextStep: 'step_5_duration'
  },
  {
    id: 'step_5_duration',
    type: 'button_group',
    aiMessage: '⏱️ Шаг 4/5: Сколько времени у тебя есть на одну тренировку?',
    aiMessageShort: 'Длительность',
    component: { 
      name: 'ButtonToggleGroup', 
      props: {
        options: [
          { value: '30', label: '30-45 мин', icon: 'Clock' },
          { value: '60', label: '60-75 мин', icon: 'Clock' },
          { value: '90', label: '90+ мин', icon: 'Clock' }
        ]
      }
    },
    saveKey: 'preferred_workout_duration',
    nextStep: 'step_6_focus'
  },
  {
    id: 'step_6_focus',
    type: 'chip_multi_select',
    aiMessage: '🎯 Шаг 5/5: На каких группах мышц хочешь сфокусироваться? (выбери 2-3)',
    aiMessageShort: 'Фокус',
    component: { 
      name: 'MultiSelectChipGroup', 
      props: {
        options: [
          { value: 'chest', label: 'Грудь', icon: 'Heart' },
          { value: 'back', label: 'Спина', icon: 'Move' },
          { value: 'shoulders', label: 'Плечи', icon: 'Triangle' },
          { value: 'arms', label: 'Руки', icon: 'Zap' },
          { value: 'legs', label: 'Ноги', icon: 'Activity' },
          { value: 'core', label: 'Пресс', icon: 'Circle' }
        ]
      }
    },
    saveKey: 'focus_areas',
    nextStep: 'step_7_generate'
  },
  {
    id: 'step_7_generate',
    type: 'final_button',
    aiMessage: '✨ Отлично! Я собрал всю информацию. Готов создать твой персональный 12-недельный план?',
    aiMessageShort: 'Генерация',
    component: { name: 'GeneratePlanButton', props: { label: 'Создать План' } }
  }
];
