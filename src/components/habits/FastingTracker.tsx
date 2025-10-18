import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFastingWindow } from "@/hooks/useFastingWindow";
import { AIMotivation } from "./AIMotivation";
import { Clock, Play, Square } from "lucide-react";

interface FastingTrackerProps {
  habit: any;
  userId?: string;
  onCompleted?: () => void;
}

export function FastingTracker({ habit, userId, onCompleted }: FastingTrackerProps) {
  const { status, startEating, endEating, isStarting, isEnding, windows } = useFastingWindow(habit.id, userId);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}м`;
    if (hours < 24) return `${hours}ч ${mins}м`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}д ${remainingHours}ч ${mins}м`;
  };

  const targetWindow = habit.custom_settings?.default_window || 16;
  const targetMinutes = targetWindow * 60;
  
  // Calculate actual elapsed time
  const elapsedMinutes = status.startTime
    ? Math.floor((currentTime.getTime() - status.startTime.getTime()) / 60000)
    : status.duration;

  const progress = status.isFasting ? Math.min(100, (elapsedMinutes / targetMinutes) * 100) : 0;

  // Get last 7 completed windows
  const recentWindows = windows?.filter(w => w.eating_end && w.fasting_duration).slice(0, 7) || [];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{habit.icon}</span>
          <div>
            <h3 className="font-semibold text-lg">{habit.name}</h3>
            <p className="text-sm text-muted-foreground">
              {status.isFasting ? "Голодание" : status.isEating ? "Окно питания" : "Не активно"}
            </p>
          </div>
        </div>
        <div className="text-right">
          {status.isFasting && (
            <div className="text-2xl font-bold bg-gradient-to-r from-green-500 to-teal-500 bg-clip-text text-transparent">
              {formatDuration(elapsedMinutes)}
            </div>
          )}
          {status.isEating && (
            <div className="text-xl font-semibold text-orange-500">
              Еда {formatDuration(elapsedMinutes)}
            </div>
          )}
        </div>
      </div>

      {/* Fasting Progress */}
      {status.isFasting && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Прогресс {targetWindow}ч</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-xs text-muted-foreground mt-1">
            {elapsedMinutes < targetMinutes 
              ? `Еще ${formatDuration(targetMinutes - elapsedMinutes)} до цели`
              : `Цель достигнута! ${formatDuration(elapsedMinutes - targetMinutes)} сверх нормы`
            }
          </p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-2 mb-4">
        {!status.isEating && (
          <Button
            onClick={() => startEating()}
            disabled={isStarting}
            className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            <Play className="h-4 w-4 mr-2" />
            {status.isFasting ? "Закончить голодание" : "Начать есть"}
          </Button>
        )}
        {status.isEating && (
          <Button
            onClick={() => endEating()}
            disabled={isEnding}
            className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
          >
            <Square className="h-4 w-4 mr-2" />
            Закончить есть
          </Button>
        )}
      </div>

      {/* AI Motivation */}
      {status.isFasting && habit.ai_motivation && (
        <AIMotivation habit={habit} elapsedMinutes={elapsedMinutes} />
      )}

      {/* Recent Windows */}
      {recentWindows.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-medium mb-2">Последние окна голодания</p>
          <div className="space-y-1">
            {recentWindows.map((window) => (
              <div key={window.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {new Date(window.eating_end!).toLocaleDateString('ru-RU', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="font-medium">
                  {formatDuration(window.fasting_duration!)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
