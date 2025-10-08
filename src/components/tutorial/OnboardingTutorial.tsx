import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Target, 
  Activity, 
  Zap, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

export function OnboardingTutorial() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    {
      id: 1,
      title: "Создайте цели",
      description: "Определите свои фитнес-цели",
      icon: Target,
      path: "/goals/create",
      color: "text-blue-500",
    },
    {
      id: 2,
      title: "Присоединитесь к челленджу",
      description: "Соревнуйтесь с другими",
      icon: Trophy,
      path: "/challenges",
      color: "text-yellow-500",
    },
    {
      id: 3,
      title: "Подключите устройства",
      description: "Синхронизируйте данные",
      icon: Zap,
      path: "/integrations",
      color: "text-purple-500",
    },
    {
      id: 4,
      title: "Создайте привычки",
      description: "Отслеживайте ежедневные привычки",
      icon: Activity,
      path: "/habits",
      color: "text-green-500",
    },
  ];

  useEffect(() => {
    if (!user) return;

    const onboardingKey = `onboarding_completed_${user.id}`;
    const newUserKey = `new_user_${user.id}`;
    const completedStepsKey = `onboarding_steps_${user.id}`;
    
    const completed = localStorage.getItem(onboardingKey);
    const isNewUser = localStorage.getItem(newUserKey);
    const savedSteps = localStorage.getItem(completedStepsKey);
    
    if (savedSteps) {
      setCompletedSteps(JSON.parse(savedSteps));
    }
    
    if (!completed || isNewUser) {
      if (isNewUser) {
        localStorage.removeItem(newUserKey);
      }
      setIsOpen(true);
    }
  }, [user]);

  const handleStepClick = (stepId: number, path: string) => {
    navigate(path);
  };

  const handleStepComplete = (stepId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const newCompletedSteps = completedSteps.includes(stepId)
      ? completedSteps.filter(id => id !== stepId)
      : [...completedSteps, stepId];
    
    setCompletedSteps(newCompletedSteps);
    
    if (user) {
      localStorage.setItem(
        `onboarding_steps_${user.id}`,
        JSON.stringify(newCompletedSteps)
      );
      
      // If all steps completed, mark onboarding as done
      if (newCompletedSteps.length === steps.length) {
        localStorage.setItem(`onboarding_completed_${user.id}`, "true");
        setTimeout(() => setIsOpen(false), 1000);
      }
    }
  };

  const handleClose = () => {
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, "true");
    }
    setIsOpen(false);
  };

  const progressPercentage = (completedSteps.length / steps.length) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 animate-fade-in">
      <Card className="shadow-2xl border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Начало работы</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {completedSteps.length} из {steps.length} выполнено
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2 mt-3" />
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-2 pt-0">
            {steps.map((step) => {
              const isCompleted = completedSteps.includes(step.id);
              const Icon = step.icon;
              
              return (
                <div
                  key={step.id}
                  onClick={() => handleStepClick(step.id, step.path)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    "hover:bg-accent/50 hover:border-primary/50",
                    isCompleted && "bg-success/5 border-success/30"
                  )}
                >
                  <div
                    onClick={(e) => handleStepComplete(step.id, e)}
                    className="cursor-pointer"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <Icon className={cn("h-5 w-5", step.color)} />
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      isCompleted && "line-through text-muted-foreground"
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}

            {completedSteps.length === steps.length && (
              <div className="pt-2">
                <Badge className="w-full justify-center py-2" variant="default">
                  🎉 Отлично! Все готово к старту!
                </Badge>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
