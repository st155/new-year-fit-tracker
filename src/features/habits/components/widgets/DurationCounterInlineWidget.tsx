import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, DollarSign, TrendingUp } from "lucide-react";
import { useHabitAttempts } from "@/hooks/useHabitAttempts";
import { calculateElapsedTime, formatElapsedTime, getMilestoneProgress, calculateMoneySaved } from "@/lib/duration-utils";
import { Progress } from "@/components/ui/progress";
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

interface DurationCounterInlineWidgetProps {
  habit: any;
  compact?: boolean;
}

export function DurationCounterInlineWidget({ habit, compact }: DurationCounterInlineWidgetProps) {
  const { t } = useTranslation('habits');
  const [elapsed, setElapsed] = useState({ days: 0, hours: 0, minutes: 0 });
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const { currentAttempt, longestStreak, resetHabit, isResetting } = useHabitAttempts(habit.id, habit.user_id);

  useEffect(() => {
    if (!habit.start_date && !currentAttempt?.start_date) return;

    const startDate = currentAttempt?.start_date || habit.start_date;
    const updateElapsed = () => {
      const result = calculateElapsedTime(startDate);
      setElapsed(result);
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
    ? calculateMoneySaved(elapsed.days, habit.custom_settings.cost_per_day)
    : null;

  const milestone = getMilestoneProgress(elapsed.days);

  return (
    <>
      <div className="p-3 space-y-3 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-lg border border-blue-500/20">
        {/* Main counter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30">
              <div className="text-2xl font-bold text-blue-500">{elapsed.days}</div>
              <div className="text-[10px] text-muted-foreground">{t('durationWidget.days')}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-muted-foreground">
                {formatElapsedTime(elapsed.days, elapsed.hours, elapsed.minutes)}
              </div>
              {longestStreak > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {t('durationWidget.best', { days: longestStreak })}
                </div>
              )}
            </div>
          </div>

          {moneySaved && (
            <Badge variant="secondary" className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
              <DollarSign className="h-3 w-3 mr-1" />
              {moneySaved} ₽
            </Badge>
          )}
        </div>

        {/* Milestone progress */}
        {milestone && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('durationWidget.until', { milestone: milestone.label })}</span>
              <span className="text-muted-foreground">{elapsed.days} / {milestone.next}</span>
            </div>
            <Progress value={milestone.progress} className="h-1.5" />
          </div>
        )}

        {/* Reset button */}
        <Button 
          variant="outline" 
          size="sm"
          className="w-full border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5"
          onClick={() => setShowResetDialog(true)}
        >
          <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
          {t('durationWidget.reset')}
        </Button>
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('durationWidget.resetTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('durationWidget.resetDescription', { days: elapsed.days })}
              {longestStreak > 0 && ` ${t('durationWidget.resetDescriptionWithBest', { best: longestStreak })}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <Textarea
            placeholder={t('durationWidget.whatHappened')}
            value={resetReason}
            onChange={(e) => setResetReason(e.target.value)}
            className="min-h-[60px] glass-strong"
          />

          <AlertDialogFooter>
            <AlertDialogCancel>{t('durationWidget.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={isResetting}>
              {isResetting ? t('durationWidget.resetting') : t('durationWidget.startFresh')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
