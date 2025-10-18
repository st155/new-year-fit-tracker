import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useFastingWindow } from "@/hooks/useFastingWindow";
import { AIMotivation } from "./AIMotivation";
import { CircularFastingProgress } from "./CircularFastingProgress";
import { FastingControlButton } from "./FastingControlButton";
import { FastingHistory } from "./FastingHistory";

interface FastingTrackerProps {
  habit: any;
  userId?: string;
  onCompleted?: () => void;
}

export function FastingTracker({ habit, userId, onCompleted }: FastingTrackerProps) {
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

  return (
    <Card className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
      
      {/* Header */}
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{habit.icon}</span>
            <div>
              <h3 className="text-xl font-bold">{habit.name}</h3>
              <p className="text-sm text-muted-foreground">
                Цель: {targetWindow}:8 часов
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="relative flex flex-col items-center space-y-6 pb-8">
        {/* Circular Progress */}
        <CircularFastingProgress
          progress={progress}
          elapsedMinutes={elapsedMinutes}
          targetMinutes={targetMinutes}
          status={status}
        />

        {/* Milestone Message */}
        {currentMilestone && (
          <div className="w-full p-4 rounded-lg bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-purple-500/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-center text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {currentMilestone}
            </p>
          </div>
        )}

        {/* Control Button */}
        <FastingControlButton
          status={status}
          onStartFasting={() => startFasting()}
          onStartEating={() => startEating()}
          isLoading={isStarting || isFastingStarting || isEnding}
        />

        {/* Goal Progress Info */}
        {status.isFasting && (
          <div className="w-full p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs text-center text-muted-foreground">
              {elapsedMinutes < targetMinutes 
                ? `⏱️ Еще ${formatDuration(targetMinutes - elapsedMinutes)} до цели`
                : `🎉 Цель достигнута! +${formatDuration(elapsedMinutes - targetMinutes)} сверх нормы`
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
          <div className="w-full pt-4 border-t">
            <FastingHistory windows={recentWindows} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
