import { useFastingWindow } from "@/hooks/useFastingWindow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Utensils } from "lucide-react";

interface FastingInlineWidgetProps {
  habit: any;
  userId: string;
  compact?: boolean;
}

export function FastingInlineWidget({ habit, userId, compact }: FastingInlineWidgetProps) {
  const { status, startEating, endEating, startFasting, isStarting, isEnding, isFastingStarting } = useFastingWindow(habit.id, userId);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}д ${remainingHours}ч`;
    }
    return hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`;
  };

  const targetMinutes = habit.custom_settings?.fasting_window || 960; // Default 16h
  const progress = status.isFasting ? Math.min((status.duration / targetMinutes) * 100, 100) : 0;
  const eatingProgress = status.isEating ? Math.min((status.duration / 480) * 100, 100) : 0; // 8h eating window

  return (
    <div className="p-3 space-y-3 bg-gradient-to-br from-emerald-500/5 to-green-500/5 rounded-lg border border-emerald-500/20">
      {/* Status indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status.isFasting && (
            <Badge variant="default" className="bg-gradient-to-r from-emerald-500 to-green-500 animate-pulse-slow">
              🔥 Голодание
            </Badge>
          )}
          {status.isEating && (
            <Badge variant="secondary" className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20">
              🍽️ Окно питания
            </Badge>
          )}
          {!status.isFasting && !status.isEating && (
            <Badge variant="outline" className="border-muted-foreground/30">
              ⏸️ Неактивно
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {formatDuration(status.duration)}
        </div>
      </div>

      {/* Progress bar */}
      {status.isFasting && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2 bg-muted/50" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatDuration(status.duration)}</span>
            <span>{formatDuration(targetMinutes)}</span>
          </div>
        </div>
      )}

      {status.isEating && (
        <div className="space-y-1">
          <Progress value={eatingProgress} className="h-2 bg-muted/50" />
          <div className="text-xs text-muted-foreground text-center">
            Окно питания: {formatDuration(status.duration)}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {status.isEating && (
          <Button 
            size="sm" 
            variant="default" 
            onClick={endEating}
            disabled={isEnding}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            {isEnding ? "..." : "Начать пост"}
          </Button>
        )}
        
        {!status.isFasting && !status.isEating && (
          <>
            <Button 
              size="sm" 
              variant="default" 
              onClick={startFasting}
              disabled={isFastingStarting}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              {isFastingStarting ? "..." : "Начать пост"}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={startEating}
              disabled={isStarting}
              className="flex-1"
            >
              <Utensils className="h-3.5 w-3.5 mr-1.5" />
              {isStarting ? "..." : "Начать еду"}
            </Button>
          </>
        )}
        
        {status.isFasting && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={startEating}
            disabled={isStarting}
            className="flex-1"
          >
            <Utensils className="h-3.5 w-3.5 mr-1.5" />
            {isStarting ? "..." : "Начать еду"}
          </Button>
        )}
      </div>
    </div>
  );
}
