import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';

export const useOnboardingFlow = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isNewUser = user ? !!localStorage.getItem(`new_user_${user.id}`) : false;
  const flowCompleted = user ? !!localStorage.getItem(`onboarding_flow_completed_${user.id}`) : false;
  
  const startOnboarding = () => {
    navigate('/challenges?onboarding=true');
  };
  
  const nextStep = (currentStep: 'challenges' | 'integrations') => {
    if (currentStep === 'challenges') {
      navigate('/integrations?onboarding=true');
    } else if (currentStep === 'integrations') {
      completeOnboarding();
    }
  };
  
  const skipOnboarding = () => {
    completeOnboarding();
  };
  
  const completeOnboarding = () => {
    if (user) {
      localStorage.setItem(`onboarding_flow_completed_${user.id}`, 'true');
      localStorage.removeItem(`new_user_${user.id}`);
      navigate('/');
    }
  };
  
  return {
    isNewUser,
    flowCompleted,
    isInOnboardingFlow: isNewUser && !flowCompleted,
    startOnboarding,
    nextStep,
    skipOnboarding,
    completeOnboarding
  };
};
