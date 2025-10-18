// Utility functions for onboarding tutorial progress tracking

export const ONBOARDING_STEPS = {
  CREATE_GOALS: 1,
  JOIN_CHALLENGE: 2,
  CONNECT_DEVICES: 3,
  CREATE_HABITS: 4,
} as const;

/**
 * Mark an onboarding step as completed
 */
export const completeOnboardingStep = (userId: string, stepId: number) => {
  const completedStepsKey = `onboarding_steps_${userId}`;
  const savedSteps = localStorage.getItem(completedStepsKey);
  
  let completedSteps: number[] = [];
  if (savedSteps) {
    completedSteps = JSON.parse(savedSteps);
  }
  
  if (!completedSteps.includes(stepId)) {
    completedSteps.push(stepId);
    localStorage.setItem(completedStepsKey, JSON.stringify(completedSteps));
    
    // If all steps completed, mark onboarding as done
    if (completedSteps.length === Object.keys(ONBOARDING_STEPS).length) {
      localStorage.setItem(`onboarding_completed_${userId}`, "true");
    }
  }
};

/**
 * Check if an onboarding step is completed
 */
export const isStepCompleted = (userId: string, stepId: number): boolean => {
  const completedStepsKey = `onboarding_steps_${userId}`;
  const savedSteps = localStorage.getItem(completedStepsKey);
  
  if (!savedSteps) return false;
  
  const completedSteps: number[] = JSON.parse(savedSteps);
  return completedSteps.includes(stepId);
};

/**
 * Initialize default habits for a new user
 */
export const initializeDefaultHabits = async (userId: string, supabase: any) => {
  const { DEFAULT_HABIT_TEMPLATES } = await import('./habit-templates');
  
  // Check if user already has habits
  const { data: existingHabits } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', userId)
    .limit(1);
  
  if (existingHabits && existingHabits.length > 0) {
    return; // User already has habits
  }
  
  // Create default habit templates (inactive by default)
  const habitsToCreate = DEFAULT_HABIT_TEMPLATES.map(template => ({
    user_id: userId,
    name: template.name,
    description: template.description,
    icon: template.icon,
    color: template.color.replace('from-', '').replace('to-', '').split(' ')[0], // Extract first color
    habit_type: template.habit_type,
    category: template.category,
    custom_settings: template.custom_settings || {},
    ai_motivation: template.ai_motivation || {},
    is_active: false, // Don't activate by default
    frequency: 'daily',
    target_count: 7,
  }));
  
  await supabase
    .from('habits')
    .insert(habitsToCreate);
};
