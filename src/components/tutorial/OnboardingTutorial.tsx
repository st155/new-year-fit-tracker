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
import { Progress } from "@/components/ui/progress";
import { Trophy, Zap, Target, Activity, ChevronLeft } from "lucide-react";

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
    const nextStep = currentStep + 1;
    
    if (nextStep < steps.length) {
      setCurrentStep(nextStep);
      if (user) {
        localStorage.setItem(`tutorial_step_${user.id}`, String(nextStep));
      }
      
      // Navigate based on step
      if (nextStep === 1) {
        navigate("/goals/create");
      } else if (nextStep === 2) {
        navigate("/challenges");
      } else if (nextStep === 3) {
        navigate("/integrations");
      } else if (nextStep === 4) {
        navigate("/habits");
      }
    } else {
      // Complete onboarding
      setIsOpen(false);
      if (user) {
        localStorage.setItem(`onboarding_completed_${user.id}`, "true");
      }
      navigate("/");
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      if (user) {
        localStorage.setItem(`tutorial_step_${user.id}`, String(currentStep - 1));
      }
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
      title: "Добро пожаловать! 🎉",
      description: "Создайте свою первую персональную цель и начните отслеживать прогресс к достижению ваших фитнес-целей.",
      icon: <Trophy className="h-16 w-16 text-primary mx-auto mb-4 animate-bounce" />,
      buttonText: "Создать цель",
    },
    {
      title: "Создайте свои цели 🎯",
      description: "Определите конкретные цели: вес, процент жира, подтягивания, VO2max и другие показатели.",
      icon: <Target className="h-16 w-16 text-primary mx-auto mb-4" />,
      buttonText: "Продолжить",
    },
    {
      title: "Присоединяйтесь к челленджам 🏆",
      description: "Соревнуйтесь с другими участниками, делитесь прогрессом и достигайте целей вместе!",
      icon: <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />,
      buttonText: "Смотреть челленджи",
    },
    {
      title: "Подключите устройства 📱",
      description: "Автоматически синхронизируйте данные с Whoop, Apple Health или Withings для точного отслеживания.",
      icon: <Zap className="h-16 w-16 text-primary mx-auto mb-4" />,
      buttonText: "Настроить интеграции",
    },
    {
      title: "Новое: Трекер привычек! ✨",
      description: "Отслеживайте ежедневные привычки, стройте серии выполнения и развивайте дисциплину. Gamification система с достижениями!",
      icon: <Activity className="h-16 w-16 text-primary mx-auto mb-4" />,
      buttonText: "Начать!",
    },
  ];

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Шаг {currentStep + 1} из {steps.length}</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
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
          <div className="flex gap-2 w-full">
            {currentStep > 0 && (
              <Button onClick={handlePrevious} variant="outline" className="w-full">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
            )}
            <Button onClick={handleNext} className="w-full">
              {steps[currentStep].buttonText}
            </Button>
          </div>
          <Button onClick={handleSkip} variant="ghost" className="w-full">
            Пропустить обучение
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
