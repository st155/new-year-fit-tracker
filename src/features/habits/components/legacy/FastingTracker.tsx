import { useState, useEffect } from "react";
import { MoreVertical } from "lucide-react";
import { useFastingWindow } from "@/hooks/useFastingWindow";
import { AIMotivation } from "./AIMotivation";
import { CircularFastingProgress } from "./CircularFastingProgress";
import { FastingControlButton } from "./FastingControlButton";
import { HabitHistory } from "./HabitHistory";
import { Badge } from "@/components/ui/badge";
import { getHabitSentiment, getHabitCardClass } from "@/lib/habit-utils-v3";
import { useTranslation } from "react-i18next";

interface FastingTrackerProps {
  habit: any;
  userId?: string;
  onCompleted?: () => void;
}

export function FastingTracker({ habit, userId, onCompleted }: FastingTrackerProps) {
  const { t } = useTranslation('habits');
  const { status, startEating, startFasting, endEating, isStarting, isFastingStarting, isEnding, windows } = useFastingWindow(habit.id, userId);
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
    if (hours === 0) return t('fasting.duration.minutes', { mins });
    if (hours < 24) return t('fasting.duration.hours', { hours, mins });
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return t('fasting.duration.days', { days, hours: remainingHours });
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

  // Get current milestone message
  const getCurrentMilestone = () => {
    if (!status.isFasting) return null;
    const milestones = habit.ai_motivation?.milestones;
    if (!Array.isArray(milestones) || milestones.length === 0) return null;
    
    const sortedMilestones = [...milestones].sort((a, b) => (a?.minutes ?? 0) - (b?.minutes ?? 0));
    
    for (let i = 0; i < sortedMilestones.length; i++) {
      const milestone = sortedMilestones[i];
      if (elapsedMinutes >= (milestone?.minutes ?? Infinity) && elapsedMinutes < (milestone?.minutes ?? Infinity) + 30) {
        return milestone?.message;
      }
    }
    return null;
  };

  const currentMilestone = getCurrentMilestone();
  const sentiment = getHabitSentiment(habit);
  const cardClass = getHabitCardClass(sentiment);

  return (
    <div className={`glass-habit-card ${cardClass} p-6 group relative overflow-hidden`}>
      {/* More options menu */}
      <button className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100">
        <MoreVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-4xl">{habit.icon}</span>
          <h3 className={`text-2xl font-bold text-glow text-${sentiment === 'positive' ? 'habit-positive' : 'habit-neutral'}`}>
            {habit.name}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('fasting.targetGoal', { hours: targetWindow })}
        </p>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center space-y-8 transition-all duration-300">
        {/* Circular Progress */}
        <div className="relative">
          <CircularFastingProgress
            progress={progress}
            elapsedMinutes={elapsedMinutes}
            targetMinutes={targetMinutes}
            status={status}
            className="scale-105 hover:scale-110 transition-transform duration-300"
          />
        </div>

        {/* Milestone Message */}
        {currentMilestone && (
          <div className="w-full p-4 rounded-lg bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-purple-500/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-center text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {currentMilestone}
            </p>
          </div>
        )}

        {/* Eating Window Badge - показывается только при isEating */}
        {status.isEating && (
          <div className="w-full flex justify-center">
            <Badge 
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 text-sm font-semibold shadow-lg shadow-orange-500/30"
            >
              {t('fasting.eatingWindowBadge')}
            </Badge>
          </div>
        )}

        {/* Control Button */}
        <FastingControlButton
          status={status}
          onStartFasting={() => startFasting()}
          onStartEating={() => startEating()}
          onEndEating={() => endEating()}
          isLoading={isStarting || isFastingStarting || isEnding}
        />

        {/* Goal Progress Info */}
        {status.isFasting && (
          <div className="w-full p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs text-center text-muted-foreground">
              {elapsedMinutes < targetMinutes 
                ? t('fasting.moreToGoal', { time: formatDuration(targetMinutes - elapsedMinutes) })
                : t('fasting.goalAchievedExtra', { time: formatDuration(elapsedMinutes - targetMinutes) })
              }
            </p>
          </div>
        )}

        {/* AI Motivation Progress */}
        {status.isFasting && habit.ai_motivation && (
          <div className="w-full">
            <AIMotivation habit={habit} elapsedMinutes={elapsedMinutes} />
          </div>
        )}

        {/* History */}
        {recentWindows.length > 0 && (
          <div className="w-full pt-4 border-t border-white/10 space-y-2">
            <div className="text-xs text-muted-foreground">{t('fasting.recentWindows')}</div>
            <HabitHistory 
              windows={recentWindows}
              type="windows"
              maxItems={5}
            />
          </div>
        )}
      </div>
    </div>
  );
}
