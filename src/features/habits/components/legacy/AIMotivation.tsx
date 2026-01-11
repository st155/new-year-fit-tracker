import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AIMotivationProps {
  habit: any;
  elapsedMinutes: number;
}

export function AIMotivation({ habit, elapsedMinutes }: AIMotivationProps) {
  const { t } = useTranslation('habits');
  
  const motivation = useMemo(() => {
    const milestones = habit.ai_motivation?.milestones || {};
    const milestoneKeys = Object.keys(milestones).map(Number).sort((a, b) => a - b);
    
    // Find next milestone
    const nextMilestone = milestoneKeys.find(m => m > elapsedMinutes);
    const lastMilestone = milestoneKeys.filter(m => m <= elapsedMinutes).pop();

    if (nextMilestone) {
      const remaining = nextMilestone - elapsedMinutes;
      const progress = (elapsedMinutes / nextMilestone) * 100;
      
      return {
        message: milestones[nextMilestone],
        remaining,
        progress,
        isNext: true,
      };
    }

    if (lastMilestone) {
      return {
        message: milestones[lastMilestone],
        remaining: 0,
        progress: 100,
        isNext: false,
      };
    }

    return null;
  }, [habit.ai_motivation, elapsedMinutes]);

  if (!motivation) return null;

  const formatRemaining = (minutes: number) => {
    if (minutes < 60) return t('fasting.duration.minutes', { mins: minutes });
    if (minutes < 1440) return t('fasting.duration.hours', { hours: Math.floor(minutes / 60), mins: minutes % 60 });
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return t('fasting.duration.days', { days, hours });
  };

  return (
    <div className="mt-4 p-3 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg">
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {motivation.isNext ? (
              t('motivation.moreToProgress', { time: formatRemaining(motivation.remaining) })
            ) : (
              t('motivation.achieved')
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {motivation.message}
          </p>
          {motivation.isNext && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${Math.min(100, motivation.progress)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
