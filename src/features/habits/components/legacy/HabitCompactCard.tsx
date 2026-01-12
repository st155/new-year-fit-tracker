import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useFastingWindow } from "@/hooks/useFastingWindow";
import { useHabitMeasurements } from "@/hooks/useHabitMeasurements";
import { useHabitAttempts } from "@/hooks/useHabitAttempts";
import { useDeleteHabit } from "@/hooks/useDeleteHabit";
import { getHabitIcon, getHabitSentiment, getHabitNeonColor } from "@/lib/habit-utils";
import { CheckCircle2, Flame, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { HabitOptionsMenu } from "./HabitOptionsMenu";
import { HabitEditDialog } from "./HabitEditDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getIntlLocale } from "@/lib/date-locale";
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

interface HabitCompactCardProps {
  habit: any;
  userId?: string;
  onCompleted?: () => void;
}

export function HabitCompactCard({ habit, userId, onCompleted }: HabitCompactCardProps) {
  const { t } = useTranslation(['habits', 'units']);
  const [elapsedTime, setElapsedTime] = useState<{
    days: number;
    hours: number;
    minutes: number;
  } | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const Icon = getHabitIcon(habit);
  const sentiment = getHabitSentiment(habit);
  const neonColor = getHabitNeonColor(sentiment);

  const fastingWindow = useFastingWindow(habit.id, userId);
  const { stats } = useHabitMeasurements(habit.id, userId);
  const { currentAttempt } = useHabitAttempts(habit.id, userId);
  const { deleteHabit, archiveHabit } = useDeleteHabit();

  // Update elapsed time for duration counters
  useEffect(() => {
    if (habit.habit_type === "duration_counter") {
      // Use current_attempt.start_date if available, fallback to habit.start_date
      const startDate = habit.current_attempt?.start_date || habit.start_date;
      
      if (!startDate) return;
      
      const start = new Date(startDate);
      
      // Protection against Invalid Date
      if (isNaN(start.getTime())) {
        console.error('Invalid start_date for habit:', habit.id);
        return;
      }
      
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

  // FASTING TRACKER - Modern design
  if (habit.habit_type === "fasting_tracker") {
    const { status } = fastingWindow;
    const { duration: currentDuration } = status;
    
    const hours = Math.floor((currentDuration || 0) / 60);
    const minutes = (currentDuration || 0) % 60;
    const targetHours = habit.custom_data?.target_hours || 16;
    const progress = Math.min(((currentDuration || 0) / (targetHours * 60)) * 100, 100);

    return (
      <>
        <Card className="modern-habit-card group p-6 h-full">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center ring-2 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl",
                status.isFasting 
                  ? "bg-gradient-to-br from-emerald-500/30 to-green-500/40 ring-emerald-500/40 group-hover:ring-emerald-400 group-hover:shadow-emerald-500/50"
                  : "bg-gradient-to-br from-orange-500/30 to-yellow-500/40 ring-orange-500/40 group-hover:ring-orange-400 group-hover:shadow-orange-500/50"
              )}>
                <Icon className="h-7 w-7" style={{ color: status.isFasting ? "#10b981" : "#f97316" }} />
              </div>
              <h3 className="text-base font-bold truncate flex-1">{habit.name}</h3>
              <HabitOptionsMenu
                onEdit={() => setShowEditDialog(true)}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            </div>

          {/* Big Timer */}
          <div className="text-center py-3">
            <div className={cn(
              "text-6xl md:text-7xl font-black bg-gradient-to-r bg-clip-text text-transparent leading-none tracking-tight",
              status.isFasting 
                ? "from-emerald-400 via-green-400 to-emerald-500"
                : "from-orange-400 via-yellow-400 to-orange-500"
            )}>
              {hours}:{minutes.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              {t('dashboardCard.percentToGoal', { percent: Math.round(progress) })}
            </div>
          </div>

          {/* Progress Bar */}
          <Progress 
            value={progress} 
            className="h-4 group-hover:h-5 transition-all duration-300"
            variant={status.isFasting ? "success" : "warning"}
          />

          {/* Status Badge */}
          <div className="flex items-center justify-center">
            <Badge 
              variant={status.isFasting ? "excellent" : "fair"}
              className="text-sm px-4 py-1.5"
            >
              {status.isFasting ? t('dashboardCard.fasting') : t('dashboardCard.eating')}
            </Badge>
          </div>
        </div>
      </Card>
      
      <HabitEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        habit={habit}
        onSuccess={onCompleted}
      />

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent className="glass-strong border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('archive.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('archive.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-card border-white/20">
              {t('delete.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm}>
              {t('archive.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass-strong border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-card border-white/20">
              {t('delete.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
    );
  }

  // DURATION COUNTER - Modern with large metrics
  if (habit.habit_type === "duration_counter" && elapsedTime) {
    const totalHours = elapsedTime.days * 24 + elapsedTime.hours;
    const progressPercent = Math.min((totalHours / 720) * 100, 100); // 30 days = 720 hours

    return (
      <>
        <Card className="modern-habit-card group p-6 h-full">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/30 to-pink-500/40 flex items-center justify-center ring-2 ring-rose-500/40 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:ring-rose-400 group-hover:shadow-2xl group-hover:shadow-rose-500/50">
                <Icon className="h-7 w-7" style={{ color: neonColor }} />
              </div>
              <h3 className="text-base font-bold truncate flex-1">{habit.name}</h3>
              <HabitOptionsMenu
                onEdit={() => setShowEditDialog(true)}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            </div>

          {/* Big Timer */}
          <div className="text-center py-3">
            <div className="text-6xl md:text-7xl font-black bg-gradient-to-r from-rose-400 via-pink-400 to-rose-500 bg-clip-text text-transparent leading-none tracking-tight">
              {elapsedTime.days > 0 && `${t('dashboardCard.daysShort', { days: elapsedTime.days })} `}
              {t('dashboardCard.hoursShort', { hours: elapsedTime.hours })}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {t('dashboardCard.withoutSlips')}
            </div>
          </div>

          {/* Progress Bar */}
          <Progress 
            value={progressPercent} 
            className="h-4 group-hover:h-5 transition-all duration-300"
            variant="danger"
          />

          {/* Stats Row */}
          <div className="flex items-center justify-between gap-2">
            {currentAttempt && (
              <Badge variant="fair" className="flex items-center gap-1 text-xs">
                <Flame className="h-3 w-3" />
                {t('dashboardCard.since', { date: new Date(currentAttempt.start_date).toLocaleDateString(getIntlLocale(), { day: 'numeric', month: 'short' }) })}
              </Badge>
            )}
            
            {moneySaved !== null && moneySaved > 0 && (
              <Badge variant="excellent" className="flex items-center gap-1 text-xs font-bold">
                💰 {moneySaved.toLocaleString(getIntlLocale())} ₽
              </Badge>
            )}
          </div>
        </div>
      </Card>

      <HabitEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        habit={habit}
        onSuccess={onCompleted}
      />

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent className="glass-strong border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('archive.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('archive.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-card border-white/20">
              {t('delete.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm}>
              {t('archive.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass-strong border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-card border-white/20">
              {t('delete.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
    );
  }

  // DAILY HABIT or NUMERIC COUNTER - Modern design
  const isCompletedToday = habit.completed_today;
  const currentStreak = currentAttempt ? 
    Math.floor((new Date().getTime() - new Date(currentAttempt.start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const targetValue = habit.custom_data?.target_value;
  const currentValue = stats?.latest || stats?.total || 0;
  const progress = targetValue ? Math.min((currentValue / targetValue) * 100, 100) : 0;

  return (
    <>
      <Card className="modern-habit-card group p-6 h-full">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/40 flex items-center justify-center ring-2 ring-primary/40 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:ring-primary/60 group-hover:shadow-2xl group-hover:shadow-primary/50">
              <Icon className="h-7 w-7" style={{ color: neonColor }} />
            </div>
            <h3 className="text-base font-bold truncate flex-1">{habit.name}</h3>
            <HabitOptionsMenu
              onEdit={() => setShowEditDialog(true)}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          </div>

        {/* Main Content */}
        {isCompletedToday ? (
          <div className="flex flex-col items-center py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-2" />
            </motion.div>
            <Badge variant="excellent" className="text-sm">
              {t('dashboardCard.completed')}
            </Badge>
          </div>
        ) : habit.habit_type === "numeric_counter" && targetValue ? (
          <div className="space-y-3 py-2">
            <div className="text-center">
              <div className="text-6xl md:text-7xl font-black bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent leading-none tracking-tight">
                {currentValue}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {t('dashboardCard.outOf')} <span className="font-semibold">{targetValue}</span>
              </div>
            </div>
            <Progress 
              value={progress} 
              className="h-4 group-hover:h-5 transition-all duration-300"
              autoColor
            />
            <div className="text-center text-xs text-muted-foreground">
              {t('dashboardCard.percentComplete', { percent: Math.round(progress) })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-sm text-muted-foreground">
              {t('dashboardCard.notCompleted')}
            </div>
          </div>
        )}

        {/* Bottom Stats */}
        <div className="flex items-center justify-between gap-2 pt-2">
          {currentStreak > 0 && (
            <Badge variant="fair" className="flex items-center gap-1 text-xs">
              <Flame className="h-3 w-3" />
              {t('units:duration.daysShort', { count: currentStreak })}
            </Badge>
          )}
          
          {stats && stats.total > 0 && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3" />
              {stats.total}
            </Badge>
          )}
        </div>
      </div>
    </Card>

    <HabitEditDialog
      open={showEditDialog}
      onOpenChange={setShowEditDialog}
      habit={habit}
      onSuccess={onCompleted}
    />

    <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
      <AlertDialogContent className="glass-strong border-white/20">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('archive.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('archive.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="glass-card border-white/20">
            {t('delete.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleArchiveConfirm}>
            {t('archive.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent className="glass-strong border-white/20">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('delete.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="glass-card border-white/20">
            {t('delete.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            {t('delete.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
