import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Target, BarChart3, Calendar, MessageSquare, TrendingUp, Brain, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AIPhotoUpload } from "@/components/ui/ai-photo-upload";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  userRole: "participant" | "trainer";
}

export function QuickActions({ userRole }: QuickActionsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);

  if (userRole === "trainer") {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2 px-1">
          <BarChart3 className="h-4 w-4 text-primary" />
          Панель тренера
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card 
            className="border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 hover:border-primary/40 transition-all cursor-pointer group"
            onClick={() => navigate('/trainer-dashboard')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold text-foreground">Панель управления</span>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="border-2 border-accent/20 bg-gradient-to-br from-accent/10 to-accent/5 hover:border-accent/40 transition-all cursor-pointer group"
            onClick={() => navigate('/trainer-dashboard')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <MessageSquare className="h-5 w-5 text-accent" />
                </div>
                <span className="font-semibold text-foreground">Сообщения клиентам</span>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 hover:border-blue-500/40 transition-all cursor-pointer group"
            onClick={() => navigate('/trainer-dashboard')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <span className="font-semibold text-foreground">Планы тренировок</span>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 hover:border-purple-500/40 transition-all cursor-pointer group"
            onClick={() => navigate('/trainer-dashboard')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <Target className="h-5 w-5 text-purple-500" />
                </div>
                <span className="font-semibold text-foreground">Управление целями</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2 px-1">
        <Target className="h-4 w-4 text-primary" />
        Быстрые действия
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="h-auto p-3 flex flex-col items-center gap-2 border-2 border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-500/5 hover:border-orange-500/40 transition-all group"
            >
              <div className="p-2 rounded-xl bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                <Brain className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-xs font-medium text-center leading-tight">ИИ-анализ</span>
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
          variant="outline"
          className="h-auto p-3 flex flex-col items-center gap-2 border-2 border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-500/5 hover:border-green-500/40 transition-all group"
          onClick={() => navigate('/progress')}
        >
          <div className="p-2 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
            <Upload className="h-5 w-5 text-green-500" />
          </div>
          <span className="text-xs font-medium text-center leading-tight">Загрузить</span>
        </Button>
        
        <Button 
          variant="outline"
          className="h-auto p-3 flex flex-col items-center gap-2 border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 hover:border-blue-500/40 transition-all group"
          onClick={() => navigate('/goals/create')}
        >
          <div className="p-2 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
            <Target className="h-5 w-5 text-blue-500" />
          </div>
          <span className="text-xs font-medium text-center leading-tight">Новая цель</span>
        </Button>
        
        <Button 
          variant="outline"
          className="h-auto p-3 flex flex-col items-center gap-2 border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 hover:border-purple-500/40 transition-all group"
          onClick={() => navigate('/progress')}
        >
          <div className="p-2 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </div>
          <span className="text-xs font-medium text-center leading-tight">Прогресс</span>
        </Button>

        <Button 
          variant="outline"
          className="h-auto p-3 flex flex-col items-center gap-2 border-2 border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 hover:border-cyan-500/40 transition-all group"
          onClick={() => navigate('/fitness-data')}
        >
          <div className="p-2 rounded-xl bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
            <Activity className="h-5 w-5 text-cyan-500" />
          </div>
          <span className="text-xs font-medium text-center leading-tight">Трекеры</span>
        </Button>
      </div>
      
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background animate-fade-in">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary">Совет дня</p>
              <p className="text-xs text-muted-foreground">
                Подключите фитнес-трекеры для автоматического сбора всех показателей здоровья и активности!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}