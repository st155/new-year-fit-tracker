import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface DurationCounterProps {
  habit: any;
  userId?: string;
}

export function DurationCounter({ habit, userId }: DurationCounterProps) {
  const [elapsed, setElapsed] = useState({ days: 0, hours: 0, minutes: 0 });
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const { currentAttempt, longestStreak, resetHabit, isResetting } = useHabitAttempts(habit.id, userId);

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
    const interval = setInterval(updateElapsed, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [habit.start_date, currentAttempt]);

  const handleReset = () => {
    resetHabit({ reason: resetReason });
    setShowResetDialog(false);
    setResetReason("");
  };

  // Calculate money saved if cost_per_day is set
  const moneySaved = habit.custom_settings?.cost_per_day 
    ? (elapsed.days * habit.custom_settings.cost_per_day).toFixed(0)
    : null;

  // Determine milestone
  const getMilestone = (days: number) => {
    if (days >= 365) return { emoji: "🌟", text: "1 Year!" };
    if (days >= 100) return { emoji: "💯", text: "100 Days!" };
    if (days >= 30) return { emoji: "🏆", text: "1 Month!" };
    if (days >= 7) return { emoji: "🎉", text: "1 Week!" };
    return null;
  };

  const milestone = getMilestone(elapsed.days);
  const elapsedMinutes = elapsed.days * 1440 + elapsed.hours * 60 + elapsed.minutes;

  return (
    <>
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{habit.icon || "🔥"}</span>
                {habit.name}
              </CardTitle>
              {milestone && (
                <Badge variant="secondary" className="mt-2">
                  {milestone.emoji} {milestone.text}
                </Badge>
              )}
            </div>
            {longestStreak > 0 && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Best Streak</div>
                <div className="text-sm font-semibold">{longestStreak} days</div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Main Counter */}
          <div className="text-center py-4">
            <div className="text-5xl font-bold text-primary">
              {elapsed.days}
            </div>
            <div className="text-muted-foreground">days</div>
            <div className="text-sm text-muted-foreground mt-1">
              {elapsed.hours}h {elapsed.minutes}m
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {moneySaved && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-xs text-muted-foreground">Saved</div>
                  <div className="font-semibold">{moneySaved} ₽</div>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Current</div>
                <div className="font-semibold">{elapsed.days} days</div>
              </div>
              </div>
            </div>

            {/* AI Motivation */}
            {habit.ai_motivation && (
              <AIMotivation habit={habit} elapsedMinutes={elapsedMinutes} />
            )}

            {/* Reset Button */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowResetDialog(true)}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Reset Counter
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
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
            className="min-h-[80px]"
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
