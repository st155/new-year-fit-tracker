import { FitnessCard } from "@/components/ui/fitness-card";
import { Button } from "@/components/ui/button";
import { Upload, Camera, Target, BarChart3, Calendar, MessageSquare } from "lucide-react";

interface QuickActionsProps {
  userRole: "participant" | "trainer";
}

export function QuickActions({ userRole }: QuickActionsProps) {
  if (userRole === "trainer") {
    return (
      <FitnessCard className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Панель тренера
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="fitness" className="h-12 justify-start">
            <BarChart3 className="w-4 h-4 mr-2" />
            Аналитика команды
          </Button>
          
          <Button variant="accent" className="h-12 justify-start">
            <MessageSquare className="w-4 h-4 mr-2" />
            Отправить сообщение
          </Button>
          
          <Button variant="secondary" className="h-12 justify-start">
            <Calendar className="w-4 h-4 mr-2" />
            Планы тренировок
          </Button>
          
          <Button variant="secondary" className="h-12 justify-start">
            <Target className="w-4 h-4 mr-2" />
            Установить цели
          </Button>
        </div>
      </FitnessCard>
    );
  }

  return (
    <FitnessCard className="p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-primary" />
        Быстрые действия
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button variant="fitness" className="h-12 justify-start">
          <Camera className="w-4 h-4 mr-2" />
          Сделать фото
        </Button>
        
        <Button variant="success" className="h-12 justify-start">
          <Upload className="w-4 h-4 mr-2" />
          Загрузить данные
        </Button>
        
        <Button variant="accent" className="h-12 justify-start">
          <Target className="w-4 h-4 mr-2" />
          Обновить цели
        </Button>
        
        <Button variant="secondary" className="h-12 justify-start">
          <BarChart3 className="w-4 h-4 mr-2" />
          Мой прогресс
        </Button>
      </div>
      
      <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
        <p className="text-sm text-primary font-medium mb-1">💡 Совет дня</p>
        <p className="text-xs text-muted-foreground">
          Регулярность важнее интенсивности. Загружай данные каждый день!
        </p>
      </div>
    </FitnessCard>
  );
}