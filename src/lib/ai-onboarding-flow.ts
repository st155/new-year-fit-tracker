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
    aiMessage: '👋 Привет! Я твой AI-тренер. Сейчас я задам тебе несколько вопросов, чтобы создать идеальный план тренировок специально для тебя.',
    nextStep: 'step_2_connect_health'
  },
  {
    id: 'step_2_connect_health',
    type: 'health_connect',
    aiMessage: '🔗 Хочешь подключить Apple Health или Google Fit? Это поможет мне лучше понять твою активность.',
    aiMessageShort: 'Подключение здоровья',
    component: { name: 'ConnectHealthButtons', props: {} },
    nextStep: 'step_3_goal'
  },
  {
    id: 'step_3_goal',
    type: 'button_group',
    aiMessage: '🎯 Какая твоя главная цель?',
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
    nextStep: 'step_4_experience'
  },
  {
    id: 'step_4_experience',
    type: 'button_group',
    aiMessage: '💪 Какой у тебя опыт тренировок?',
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
    nextStep: 'step_5_schedule'
  },
  {
    id: 'step_5_schedule',
    type: 'day_selector',
    aiMessage: '📅 В какие дни недели ты можешь тренироваться?',
    aiMessageShort: 'Расписание',
    component: { name: 'DaySelector', props: {} },
    saveKey: 'training_days',
    nextStep: 'step_6_duration'
  },
  {
    id: 'step_6_duration',
    type: 'button_group',
    aiMessage: '⏱️ Сколько времени у тебя есть на одну тренировку?',
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
    nextStep: 'step_7_recovery'
  },
  {
    id: 'step_7_recovery',
    type: 'button_group',
    aiMessage: '😴 Как бы ты оценил свой уровень стресса и восстановления?',
    aiMessageShort: 'Восстановление',
    component: { 
      name: 'ButtonToggleGroup', 
      props: {
        options: [
          { value: 'low', label: 'Низкий стресс', description: 'Хорошо сплю, минимум стресса' },
          { value: 'moderate', label: 'Средний стресс', description: 'Иногда устаю' },
          { value: 'high', label: 'Высокий стресс', description: 'Много работы, мало сна' }
        ]
      }
    },
    saveKey: 'recovery_profile',
    nextStep: 'step_8_focus'
  },
  {
    id: 'step_8_focus',
    type: 'chip_multi_select',
    aiMessage: '🎯 На каких группах мышц хочешь сфокусироваться?',
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
    nextStep: 'step_9_1rm'
  },
  {
    id: 'step_9_1rm',
    type: 'number_input',
    aiMessage: '🏋️ Какие у тебя текущие максимумы в базовых упражнениях? (необязательно)',
    aiMessageShort: '1RM',
    component: { 
      name: 'NumberInputForm', 
      props: {
        exercises: [
          { name: 'squat', label: 'Присед' },
          { name: 'bench', label: 'Жим лежа' },
          { name: 'deadlift', label: 'Становая тяга' }
        ]
      }
    },
    saveKey: 'current_1rm',
    nextStep: 'step_10_style'
  },
  {
    id: 'step_10_style',
    type: 'image_toggle',
    aiMessage: '🎨 Какой стиль выполнения упражнений ты предпочитаешь?',
    aiMessageShort: 'Стиль',
    component: { 
      name: 'ImageToggleGroup', 
      props: {
        categories: [
          {
            name: 'squat',
            label: 'Присед',
            options: [
              { value: 'high_bar', label: 'High Bar', image: '/squat-high.jpg' },
              { value: 'low_bar', label: 'Low Bar', image: '/squat-low.jpg' }
            ]
          },
          {
            name: 'deadlift',
            label: 'Становая',
            options: [
              { value: 'conventional', label: 'Классика', image: '/deadlift-conv.jpg' },
              { value: 'sumo', label: 'Сумо', image: '/deadlift-sumo.jpg' }
            ]
          }
        ]
      }
    },
    saveKey: 'lifting_styles',
    nextStep: 'step_11_generate'
  },
  {
    id: 'step_11_generate',
    type: 'final_button',
    aiMessage: '✨ Отлично! Я собрал всю информацию. Готов создать твой персональный тренировочный план?',
    aiMessageShort: 'Генерация',
    component: { name: 'GeneratePlanButton', props: { label: 'Создать План' } }
  }
];
