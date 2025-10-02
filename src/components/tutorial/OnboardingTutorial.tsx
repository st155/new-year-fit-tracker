import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Zap } from "lucide-react";

export function OnboardingTutorial() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!user) return;

    const checkOnboarding = async () => {
      // Проверяем, прошел ли пользователь онбординг
      const onboardingKey = `onboarding_completed_${user.id}`;
      const completed = localStorage.getItem(onboardingKey);

      if (!completed) {
        setIsOpen(true);
      }
    };

    checkOnboarding();
  }, [user]);

  const handleNext = () => {
    if (currentStep === 0) {
      // Переходим на страницу челленджей
      setIsOpen(false);
      navigate("/challenges");
      localStorage.setItem(`tutorial_step_${user?.id}`, "1");
      // Откроем второй шаг через небольшую задержку
      setTimeout(() => {
        setCurrentStep(1);
        setIsOpen(true);
      }, 500);
    } else if (currentStep === 1) {
      // Переходим на страницу интеграций
      setIsOpen(false);
      navigate("/integrations");
      localStorage.setItem(`tutorial_step_${user?.id}`, "2");
      setTimeout(() => {
        setCurrentStep(2);
        setIsOpen(true);
      }, 500);
    } else {
      // Завершаем туториал
      setIsOpen(false);
      if (user) {
        localStorage.setItem(`onboarding_completed_${user.id}`, "true");
      }
      navigate("/");
    }
  };

  const handleSkip = () => {
    setIsOpen(false);
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, "true");
    }
    navigate("/");
  };

  const steps = [
    {
      title: "Welcome to FitnessChallenge! 🎉",
      description: "Let's get you started! First, join a challenge to compete with others and achieve your fitness goals.",
      icon: <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />,
      buttonText: "View Challenges",
    },
    {
      title: "Connect Your Devices 📱",
      description: "Now, connect your fitness trackers (Whoop, Garmin, Apple Health) to automatically sync your progress and compete in real-time.",
      icon: <Zap className="h-16 w-16 text-primary mx-auto mb-4" />,
      buttonText: "Setup Integrations",
    },
    {
      title: "You're All Set! ✅",
      description: "Great! You're ready to start your fitness journey. Track your progress, compete in challenges, and achieve your goals!",
      icon: <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />,
      buttonText: "Start Using App",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            {steps[currentStep].title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          {steps[currentStep].icon}
          <DialogDescription className="text-center text-base">
            {steps[currentStep].description}
          </DialogDescription>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleNext} className="w-full">
            {steps[currentStep].buttonText}
          </Button>
          <Button onClick={handleSkip} variant="ghost" className="w-full">
            Skip Tutorial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
