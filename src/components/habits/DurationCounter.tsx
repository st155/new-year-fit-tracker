import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, DollarSign } from "lucide-react";
import { useHabitAttempts } from "@/hooks/useHabitAttempts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { AIMotivation } from "@/components/habits/AIMotivation";
import { 
  getHabitSentiment, 
  getHabitIcon,
  getHabitCardClass,
  getNeonCircleClass 
} from "@/lib/habit-utils";
import { HabitHistory } from "./HabitHistory";

interface DurationCounterProps {
  habit: any;
  userId?: string;
}

export function DurationCounter({ habit, userId }: DurationCounterProps) {
  const [elapsed, setElapsed] = useState({ days: 0, hours: 0, minutes: 0 });
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const { currentAttempt, attempts, longestStreak, resetHabit, isResetting } = useHabitAttempts(habit.id, userId);

  useEffect(() => {
    if (!habit.start_date && !currentAttempt?.start_date) return;

    const startDate = new Date(currentAttempt?.start_date || habit.start_date);
    
    const updateElapsed = () => {
      const now = new Date();
      const diff = now.getTime() - startDate.getTime();
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setElapsed({ days, hours, minutes });
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);

    return () => clearInterval(interval);
  }, [habit.start_date, currentAttempt]);

  const handleReset = () => {
    resetHabit({ reason: resetReason });
    setShowResetDialog(false);
    setResetReason("");
  };

  const moneySaved = habit.custom_settings?.cost_per_day 
    ? (elapsed.days * habit.custom_settings.cost_per_day).toFixed(0)
    : null;

  const getMilestone = (days: number) => {
    if (days >= 365) return { emoji: "🌟", text: "1 Year!" };
    if (days >= 100) return { emoji: "💯", text: "100 Days!" };
    if (days >= 30) return { emoji: "🏆", text: "1 Month!" };
    if (days >= 7) return { emoji: "🎉", text: "1 Week!" };
    return null;
  };

  const milestone = getMilestone(elapsed.days);
  const elapsedMinutes = elapsed.days * 1440 + elapsed.hours * 60 + elapsed.minutes;
  const sentiment = getHabitSentiment(habit);
  const IconComponent = getHabitIcon(habit);
  const cardClass = getHabitCardClass(sentiment);
  const circleClass = getNeonCircleClass(sentiment);

  return (
    <>
      <div className={`glass-habit-card ${cardClass} p-6 group relative overflow-hidden space-y-4`}>

        {milestone && (
          <div className="absolute top-4 left-4">
            <Badge variant="secondary" className="bg-gradient-to-r from-gold/20 to-bronze/20 border-gold/30 animate-pulse-glow">
              {milestone.emoji} {milestone.text}
            </Badge>
          </div>
        )}

        {/* Hero Circle with Timer */}
        <div className="flex justify-center mb-6 mt-8">
          <div className={`neon-circle ${circleClass} w-48 h-48 rotate-slow`}>
            <div className="text-center">
              <div className={`text-5xl font-bold text-glow mb-1 text-${sentiment === 'negative' ? 'habit-negative' : 'habit-positive'}`}>
                {elapsed.days}
              </div>
              <div className="text-sm text-muted-foreground">дней</div>
              <div className="text-xs text-muted-foreground mt-1">
                {elapsed.hours}ч {elapsed.minutes}м
              </div>
            </div>
          </div>
        </div>

        {/* Habit Title */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <IconComponent className="h-6 w-6 text-muted-foreground" />
            <h3 className={`text-2xl font-bold text-glow text-${sentiment === 'negative' ? 'habit-negative' : 'habit-positive'}`}>
              {habit.name}
            </h3>
          </div>
          {longestStreak > 0 && (
            <p className="text-xs text-muted-foreground">
              Лучший результат: {longestStreak} дней
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {moneySaved && (
            <div className="stat-glass-card p-3 border-t-habit-positive">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-habit-positive/20 to-success/20">
                  <DollarSign className="h-4 w-4 text-habit-positive" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Saved</div>
                  <div className="font-bold text-habit-positive">{moneySaved} ₽</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="stat-glass-card p-3 border-t-primary">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary-end/20">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Current</div>
                <div className="font-bold text-primary">{elapsed.days} days</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Motivation */}
        {habit.ai_motivation && (
          <AIMotivation habit={habit} elapsedMinutes={elapsedMinutes} />
        )}

        {/* History of attempts */}
        {attempts && attempts.length > 1 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">История попыток</div>
            <HabitHistory 
              attempts={attempts.filter(a => a.end_date)}
              type="attempts"
              maxItems={3}
            />
          </div>
        )}

        {/* Reset Button */}
        <Button 
          variant="outline" 
          className="w-full glass-strong border-habit-negative/50 hover:shadow-glow-negative hover:border-habit-negative"
          onClick={() => setShowResetDialog(true)}
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Reset Counter
        </Button>
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Habit Counter?</AlertDialogTitle>
            <AlertDialogDescription>
              You lasted {elapsed.days} days this time! Don't worry, your progress is saved.
              {longestStreak > 0 && ` Your best streak is ${longestStreak} days.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <Textarea
            placeholder="What happened? (optional)"
            value={resetReason}
            onChange={(e) => setResetReason(e.target.value)}
            className="min-h-[80px] glass-strong"
          />

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={isResetting}>
              {isResetting ? "Resetting..." : "Start Fresh"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
