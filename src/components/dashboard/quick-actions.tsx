import { FitnessCard } from "@/components/ui/fitness-card";
import { Button } from "@/components/ui/button";
import { Upload, Camera, Target, BarChart3, Calendar, MessageSquare, TrendingUp, Brain, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AIPhotoUpload } from "@/components/ui/ai-photo-upload";
import { useAuth } from "@/hooks/useAuth";

interface QuickActionsProps {
  userRole: "participant" | "trainer";
}

export function QuickActions({ userRole }: QuickActionsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);

  if (userRole === "trainer") {
    return (
      <FitnessCard className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Панель тренера
        </h3>
        
        <div className="grid grid-cols-1 gap-3">
          <Button 
            variant="fitness" 
            className="h-12 justify-start"
            onClick={() => navigate('/trainer-dashboard')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Панель управления
          </Button>
          
          <Button 
            variant="accent" 
            className="h-12 justify-start"
            onClick={() => navigate('/trainer-dashboard')}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Сообщения клиентам
          </Button>
          
          <Button 
            variant="secondary" 
            className="h-12 justify-start"
            onClick={() => navigate('/trainer-dashboard')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Планы тренировок
          </Button>
          
          <Button 
            variant="secondary" 
            className="h-12 justify-start"
            onClick={() => navigate('/trainer-dashboard')}
          >
            <Target className="w-4 h-4 mr-2" />
            Управление целями
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
      
      <div className="grid grid-cols-1 gap-3">
        <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="fitness" className="h-12 justify-start">
              <Brain className="w-4 h-4 mr-2" />
              ИИ-анализ трекера
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>ИИ-анализ фитнес-трекера</DialogTitle>
            </DialogHeader>
            <AIPhotoUpload
              onDataExtracted={(result) => {
                if (result.success && result.saved) {
                  setIsAIDialogOpen(false);
                  navigate('/progress');
                }
              }}
              label="Загрузить скриншот трекера"
            />
          </DialogContent>
        </Dialog>
        
        <Button 
          variant="success" 
          className="h-12 justify-start"
          onClick={() => navigate('/progress')}
        >
          <Upload className="w-4 h-4 mr-2" />
          Загрузить данные
        </Button>
        
        <Button 
          variant="accent" 
          className="h-12 justify-start"
          onClick={() => navigate('/goals/create')}
        >
          <Target className="w-4 h-4 mr-2" />
          Новая цель
        </Button>
        
        <Button 
          variant="secondary" 
          className="h-12 justify-start"
          onClick={() => navigate('/progress')}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Мой прогресс
        </Button>

        <Button 
          variant="outline" 
          className="h-12 justify-start"
          onClick={() => navigate('/fitness-data')}
        >
          <Activity className="w-4 h-4 mr-2" />
          Данные трекеров
        </Button>
      </div>
      
      <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
        <p className="text-sm text-primary font-medium mb-1">💡 Совет дня</p>
        <p className="text-xs text-muted-foreground">
          Подключите фитнес-трекеры для автоматического сбора всех показателей здоровья и активности!
        </p>
      </div>
    </FitnessCard>
  );
}