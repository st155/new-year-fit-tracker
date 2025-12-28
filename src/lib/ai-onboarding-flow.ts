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

// Translation keys - use t() from useTranslation('workouts') to get actual text
export const ONBOARDING_FLOW: OnboardingStep[] = [
  {
    id: 'step_1_welcome',
    type: 'message',
    aiMessage: 'onboarding.steps.welcome',
    nextStep: 'step_2_goal'
  },
  {
    id: 'step_2_goal',
    type: 'button_group',
    aiMessage: 'onboarding.steps.goal',
    aiMessageShort: 'onboarding.short.goal',
    component: { 
      name: 'ButtonToggleGroup', 
      props: {
        options: [
          { value: 'hypertrophy', labelKey: 'onboarding.goals.hypertrophy', icon: 'Dumbbell' },
          { value: 'fat_loss', labelKey: 'onboarding.goals.fatLoss', icon: 'Flame' },
          { value: 'strength', labelKey: 'onboarding.goals.strength', icon: 'Zap' }
        ]
      }
    },
    saveKey: 'primary_goal',
    nextStep: 'step_3_experience'
  },
  {
    id: 'step_3_experience',
    type: 'button_group',
    aiMessage: 'onboarding.steps.experience',
    aiMessageShort: 'onboarding.short.experience',
    component: { 
      name: 'ButtonToggleGroup', 
      props: {
        options: [
          { value: 'beginner', labelKey: 'onboarding.experience.beginner', descriptionKey: 'onboarding.experienceDesc.beginner' },
          { value: 'intermediate', labelKey: 'onboarding.experience.intermediate', descriptionKey: 'onboarding.experienceDesc.intermediate' },
          { value: 'advanced', labelKey: 'onboarding.experience.advanced', descriptionKey: 'onboarding.experienceDesc.advanced' }
        ]
      }
    },
    saveKey: 'experience_level',
    nextStep: 'step_4_schedule'
  },
  {
    id: 'step_4_schedule',
    type: 'day_selector',
    aiMessage: 'onboarding.steps.schedule',
    aiMessageShort: 'onboarding.short.schedule',
    component: { name: 'DaySelector', props: {} },
    saveKey: 'training_days',
    nextStep: 'step_5_duration'
  },
  {
    id: 'step_5_duration',
    type: 'button_group',
    aiMessage: 'onboarding.steps.duration',
    aiMessageShort: 'onboarding.short.duration',
    component: { 
      name: 'ButtonToggleGroup', 
      props: {
        options: [
          { value: '30', labelKey: 'onboarding.duration.short', icon: 'Clock' },
          { value: '60', labelKey: 'onboarding.duration.medium', icon: 'Clock' },
          { value: '90', labelKey: 'onboarding.duration.long', icon: 'Clock' }
        ]
      }
    },
    saveKey: 'preferred_workout_duration',
    nextStep: 'step_6_focus'
  },
  {
    id: 'step_6_focus',
    type: 'chip_multi_select',
    aiMessage: 'onboarding.steps.focus',
    aiMessageShort: 'onboarding.short.focus',
    component: { 
      name: 'MultiSelectChipGroup', 
      props: {
        options: [
          { value: 'chest', labelKey: 'onboarding.muscles.chest', icon: 'Heart' },
          { value: 'back', labelKey: 'onboarding.muscles.back', icon: 'Move' },
          { value: 'shoulders', labelKey: 'onboarding.muscles.shoulders', icon: 'Triangle' },
          { value: 'arms', labelKey: 'onboarding.muscles.arms', icon: 'Zap' },
          { value: 'legs', labelKey: 'onboarding.muscles.legs', icon: 'Activity' },
          { value: 'core', labelKey: 'onboarding.muscles.core', icon: 'Circle' }
        ]
      }
    },
    saveKey: 'focus_areas',
    nextStep: 'step_7_generate'
  },
  {
    id: 'step_7_generate',
    type: 'final_button',
    aiMessage: 'onboarding.steps.generate',
    aiMessageShort: 'onboarding.short.generate',
    component: { name: 'GeneratePlanButton', props: { labelKey: 'onboarding.createPlan' } }
  }
];
