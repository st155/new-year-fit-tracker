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
