import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFastingWindow } from "@/hooks/useFastingWindow";
import { useHabitMeasurements } from "@/hooks/useHabitMeasurements";
import { useHabitAttempts } from "@/hooks/useHabitAttempts";
import { useDeleteHabit } from "@/hooks/useDeleteHabit";
import { getHabitIcon, getHabitSentiment, getHabitNeonColor } from "@/lib/habit-utils";
import { CheckCircle2, Flame, ArrowRight, RotateCcw, Play, Square, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CircularProgress } from "./CircularProgress";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { HabitOptionsMenu } from "@/components/habits/HabitOptionsMenu";
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

interface InteractiveHabitCardProps {
  habit: any;
  userId?: string;
  onNavigate: () => void;
  onCompleted?: () => void;
}

export function InteractiveHabitCard({ habit, userId, onNavigate, onCompleted }: InteractiveHabitCardProps) {
  const [elapsedTime, setElapsedTime] = useState<{
    days: number;
    hours: number;
    minutes: number;
  } | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const Icon = getHabitIcon(habit);
  const sentiment = getHabitSentiment(habit);
  const neonColor = getHabitNeonColor(sentiment);

  const fastingWindow = useFastingWindow(habit.id, userId);
  const { stats, addMeasurement } = useHabitMeasurements(habit.id, userId);
  const { currentAttempt, resetHabit, isResetting } = useHabitAttempts(habit.id, userId);
  const { deleteHabit, archiveHabit, isDeleting, isArchiving } = useDeleteHabit();

  // Update elapsed time for duration counters
  useEffect(() => {
    if (habit.habit_type === "duration_counter") {
      const startDate = habit.current_attempt?.start_date || habit.start_date;
      if (!startDate) return;
      
      const start = new Date(startDate);
      if (isNaN(start.getTime())) return;
      
      const updateElapsed = () => {
        const now = new Date();
        const diff = now.getTime() - start.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        setElapsedTime({
          days,
          hours: hours % 24,
          minutes: minutes % 60,
        });
      };

      updateElapsed();
      const interval = setInterval(updateElapsed, 60000);
      return () => clearInterval(interval);
    }
  }, [habit.habit_type, habit.current_attempt?.start_date, habit.start_date, habit.id]);

  const moneySaved = elapsedTime && habit.custom_data?.cost_per_day
    ? Math.floor(
        ((elapsedTime.days * 24 + elapsedTime.hours) / 24) *
          habit.custom_data.cost_per_day
      )
    : null;

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowResetDialog(true);
  };

  const confirmReset = () => {
    resetHabit({ reason: resetReason });
    setShowResetDialog(false);
    setResetReason("");
    onCompleted?.();
  };

  const handleFastingAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  const handleNumericChange = (e: React.MouseEvent, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    const currentValue = stats?.latest || 0;
    const newValue = Math.max(0, currentValue + delta);
    addMeasurement({ value: newValue });
  };

  const handleArchive = () => {
    setShowArchiveDialog(true);
  };

  const handleArchiveConfirm = () => {
    archiveHabit(habit.id);
    setShowArchiveDialog(false);
    onCompleted?.();
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    deleteHabit(habit.id);
    setShowDeleteDialog(false);
    onCompleted?.();
  };

  // FASTING TRACKER
  if (habit.habit_type === "fasting_tracker") {
    const { status, startEating, endEating, startFasting, isStarting, isEnding, isFastingStarting } = fastingWindow;
    const { duration: currentDuration } = status;
    
    const hours = Math.floor((currentDuration || 0) / 60);
    const minutes = (currentDuration || 0) % 60;
    const targetHours = habit.custom_data?.target_hours || 16;
    const progress = (currentDuration || 0) / (targetHours * 60);

    return (
      <>
        <Card className="modern-habit-card group p-6 h-full relative overflow-hidden">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center ring-2 shadow-lg transition-all",
                  status.isFasting 
                    ? "bg-gradient-to-br from-emerald-500/30 to-green-500/40 ring-emerald-500/40"
                    : "bg-gradient-to-br from-orange-500/30 to-yellow-500/40 ring-orange-500/40"
                )}>
                  <Icon className="h-6 w-6" style={{ color: status.isFasting ? "#10b981" : "#f97316" }} />
                </div>
                <h3 className="text-sm font-bold truncate">{habit.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                <HabitOptionsMenu
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-50 hover:opacity-100"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNavigate(); }}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

          {/* Circular Progress */}
          <div className="flex justify-center py-2">
            <CircularProgress
              value={currentDuration || 0}
              max={targetHours * 60}
              size={140}
              strokeWidth={8}
              gradient={
                status.isFasting
                  ? { from: "#10b981", to: "#059669" }
                  : { from: "#f97316", to: "#fb923c" }
              }
            >
              <div className="text-center">
                <div className={cn(
                  "text-4xl font-black bg-gradient-to-r bg-clip-text text-transparent",
                  status.isFasting 
                    ? "from-emerald-400 to-green-500"
                    : "from-orange-400 to-yellow-500"
                )}>
                  {hours}:{minutes.toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round(progress * 100)}% цели
                </div>
              </div>
            </CircularProgress>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge 
              variant={status.isFasting ? "excellent" : "fair"}
              className="text-sm px-4 py-1.5"
            >
              {status.isFasting ? "🔥 Голодание" : "🍽️ Прием пищи"}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!status.isFasting && !status.isEating && (
              <Button
                onClick={(e) => handleFastingAction(e, startFasting)}
                disabled={isFastingStarting}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                size="sm"
              >
                <Play className="h-4 w-4 mr-1" />
                Начать голодание
              </Button>
            )}
            {status.isFasting && (
              <Button
                onClick={(e) => handleFastingAction(e, startEating)}
                disabled={isStarting}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                size="sm"
              >
                <Square className="h-4 w-4 mr-1" />
                Окно питания
              </Button>
            )}
            {status.isEating && (
              <Button
                onClick={(e) => handleFastingAction(e, endEating)}
                disabled={isEnding}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                size="sm"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Закончить есть
              </Button>
            )}
          </div>
        </div>
      </Card>

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent className="glass-strong border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Архивировать привычку?</AlertDialogTitle>
            <AlertDialogDescription>
              Привычка будет скрыта из списка активных, но все данные сохранятся.
              Вы сможете восстановить её позже.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-card border-white/20">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm}>
              Архивировать
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass-strong border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить привычку навсегда?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Будут удалены:
              <ul className="mt-2 list-disc list-inside text-sm">
                <li>Все логи выполнения</li>
                <li>Вся статистика и история</li>
                <li>Все измерения и попытки</li>
              </ul>
              <div className="mt-3 p-3 bg-destructive/10 rounded-md border border-destructive/30">
                <p className="text-sm font-semibold text-destructive">
                  ⚠️ Если вы хотите временно скрыть привычку, используйте "Архивировать"
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-card border-white/20">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Удалить навсегда
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
    );
  }

  // DURATION COUNTER
  if (habit.habit_type === "duration_counter" && elapsedTime) {
    const totalHours = elapsedTime.days * 24 + elapsedTime.hours;
    const progress = totalHours / 720; // 30 days = 720 hours

    return (
      <>
        <Card className="modern-habit-card group p-6 h-full relative overflow-hidden">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/30 to-pink-500/40 flex items-center justify-center ring-2 ring-rose-500/40 shadow-lg">
                <Icon className="h-6 w-6" style={{ color: neonColor }} />
              </div>
              <h3 className="text-sm font-bold truncate">{habit.name}</h3>
            </div>
            <div className="flex items-center gap-1">
              <HabitOptionsMenu
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-50 hover:opacity-100"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNavigate(); }}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

            {/* Circular Progress */}
            <div className="flex justify-center py-2">
              <CircularProgress
                value={totalHours}
                max={720}
                size={140}
                strokeWidth={8}
                gradient={{ from: "#f43f5e", to: "#ec4899" }}
              >
                <div className="text-center">
                  <div className="text-4xl font-black bg-gradient-to-r from-rose-400 to-pink-500 bg-clip-text text-transparent">
                    {elapsedTime.days > 0 && `${elapsedTime.days}д `}
                    {elapsedTime.hours}ч
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {Math.round(progress * 100)}% к 30д
                  </div>
                </div>
              </CircularProgress>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-2">
              {currentAttempt && (
                <Badge variant="fair" className="flex items-center gap-1 text-xs">
                  <Flame className="h-3 w-3" />
                  С {new Date(currentAttempt.start_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </Badge>
              )}
              {moneySaved !== null && moneySaved > 0 && (
                <Badge variant="excellent" className="flex items-center gap-1 text-xs font-bold">
                  💰 {moneySaved.toLocaleString('ru-RU')} ₽
                </Badge>
              )}
            </div>

            {/* Reset Button */}
            <Button
              onClick={handleReset}
              disabled={isResetting}
              variant="outline"
              size="sm"
              className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Сброс
            </Button>
          </div>
        </Card>

        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent className="glass-strong border-white/20">
            <AlertDialogHeader>
              <AlertDialogTitle>Сбросить привычку?</AlertDialogTitle>
              <AlertDialogDescription>
                Это начнёт новый отсчёт. Текущий результат ({elapsedTime.days}д {elapsedTime.hours}ч) будет сохранён в истории.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                placeholder="Причина срыва (опционально)"
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="glass-card border-white/20">
                Отмена
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmReset}
                className="bg-destructive hover:bg-destructive/90"
              >
                Сбросить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // NUMERIC COUNTER
  if (habit.habit_type === "numeric_counter") {
    const targetValue = habit.custom_data?.target_value || 100;
    const currentValue = stats?.latest || stats?.total || 0;
    const progress = currentValue / targetValue;

    return (
      <Card className="modern-habit-card group p-6 h-full relative overflow-hidden">
        <div className="space-y-4">
          {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-purple-500/40 flex items-center justify-center ring-2 ring-primary/40 shadow-lg">
              <Icon className="h-6 w-6" style={{ color: neonColor }} />
            </div>
            <h3 className="text-sm font-bold truncate">{habit.name}</h3>
          </div>
          <div className="flex items-center gap-1">
            <HabitOptionsMenu
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-50 hover:opacity-100"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNavigate(); }}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

          {/* Circular Progress */}
          <div className="flex justify-center py-2">
            <CircularProgress
              value={currentValue}
              max={targetValue}
              size={140}
              strokeWidth={8}
              gradient={{ from: "hsl(var(--primary))", to: "#a855f7" }}
            >
              <div className="text-center">
                <div className="text-4xl font-black bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  {currentValue}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  из {targetValue}
                </div>
              </div>
            </CircularProgress>
          </div>

          {/* Progress Badge */}
          <div className="flex justify-center">
            <Badge variant="outline" className="text-sm px-4 py-1.5">
              {Math.round(progress * 100)}% выполнено
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={(e) => handleNumericChange(e, -1)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              onClick={(e) => handleNumericChange(e, 1)}
              variant="default"
              size="sm"
              className="flex-1"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // DAILY HABIT (Fallback)
  const isCompletedToday = habit.completed_today;

  return (
    <Card className="modern-habit-card group p-6 h-full relative overflow-hidden">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-purple-500/40 flex items-center justify-center ring-2 ring-primary/40 shadow-lg">
                <Icon className="h-6 w-6" style={{ color: neonColor }} />
              </div>
              <h3 className="text-sm font-bold truncate">{habit.name}</h3>
            </div>
            <div className="flex items-center gap-1">
              <HabitOptionsMenu
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-50 hover:opacity-100"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onNavigate(); }}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

        {isCompletedToday ? (
          <div className="flex flex-col items-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-2" />
            </motion.div>
            <Badge variant="excellent" className="text-sm">
              ✓ Выполнено
            </Badge>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground">
              Не выполнено
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
