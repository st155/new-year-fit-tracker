import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Flame, TrendingUp, Trophy, Star, Zap } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { DurationCounter } from "./DurationCounter";
import { NumericCounter } from "./NumericCounter";
import { DailyMeasurement } from "./DailyMeasurement";
import { FastingTracker } from "./FastingTracker";
import { HabitOptionsMenu } from "./HabitOptionsMenu";
import { HabitEditDialog } from "./HabitEditDialog";
import { HabitCelebration } from "./HabitCelebration";
import { HabitSparkline } from "./HabitSparkline";
import { useHabitProgress } from "@/hooks/useHabitProgress";
import { useDeleteHabit } from "@/hooks/useDeleteHabit";
import { subDays } from 'date-fns';
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
import { 
  getHabitSentiment, 
  getHabitIcon, 
  getHabitCardClass,
  getNeonCircleClass 
} from "@/lib/habit-utils-v3";

interface HabitCardProps {
  habit: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    color: string | null;
    habit_type?: string;
    icon?: string;
    start_date?: string;
    target_value?: number;
    measurement_unit?: string;
    custom_settings?: any;
    user_id?: string;
    stats?: {
      current_streak: number;
      total_completions: number;
      completion_rate: number;
    };
    completed_today: boolean;
  };
  onCompleted: () => void;
}

export function HabitCard({ habit, onCompleted }: HabitCardProps) {
  const { t } = useTranslation('habits');
  const navigate = useNavigate();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [milestoneType, setMilestoneType] = useState<'completion' | 'milestone' | 'streak'>('completion');
  const { deleteHabit, archiveHabit } = useDeleteHabit();

  // Route to custom habit cards based on type
  if (habit.habit_type === "duration_counter") {
    return <DurationCounter habit={habit} userId={habit.user_id} />;
  }

  if (habit.habit_type === "fasting_tracker") {
    return <FastingTracker habit={habit} userId={habit.user_id} onCompleted={onCompleted} />;
  }

  if (habit.habit_type === "numeric_counter") {
    return <NumericCounter habit={habit} userId={habit.user_id} />;
  }

  if (habit.habit_type === "daily_measurement") {
    return <DailyMeasurement habit={habit} userId={habit.user_id} />;
  }

  // Default: daily_check habit card
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    if (habit.completed_today) return;

    setIsCompleting(true);
    try {
      const { error } = await supabase.from("habit_completions").insert({
        habit_id: habit.id,
        user_id: habit.user_id,
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Check for milestones
      const newStreak = (habit.stats?.current_streak || 0) + 1;
      const milestones = [7, 30, 100, 365];
      const achievedMilestone = milestones.find(m => newStreak === m);

      if (achievedMilestone) {
        setMilestoneType('milestone');
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 100);

        toast.success(t(`milestones.${achievedMilestone}`));
      } else if (newStreak > 1 && newStreak % 5 === 0) {
        // Mini celebration every 5 days
        setMilestoneType('streak');
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 100);
        toast.success(t('completion.streak', { count: newStreak }));
      } else {
        setMilestoneType('completion');
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 100);
        toast.success(t('completion.success'));
      }

      onCompleted();
    } catch (error) {
      console.error("Error completing habit:", error);
      toast.error(t('errors.completionError'));
    } finally {
      setIsCompleting(false);
    }
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

  const sentiment = getHabitSentiment(habit);
  const IconComponent = getHabitIcon(habit);
  const cardClass = getHabitCardClass(sentiment);
  const circleClass = getNeonCircleClass(sentiment);

  // Fetch last 7 days for sparkline
  const last7Days = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 7);
    return { start, end };
  }, []);

  const { data: progressData } = useHabitProgress(habit.id, last7Days);

  const sparklineData = useMemo(() => {
    if (!progressData) return [];
    return progressData.map(d => d.completed ? 1 : 0);
  }, [progressData]);

  return (
    <>
      <HabitCelebration trigger={celebrate} type={milestoneType} />
      
      <div 
        className={`glass-habit-card ${cardClass} p-6 group relative overflow-hidden space-y-6 cursor-pointer`}
        onClick={() => navigate(`/habits/${habit.id}`)}
      >
        <div className="absolute top-4 right-4">
          <HabitOptionsMenu
            onEdit={() => setShowEditDialog(true)}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
        </div>

      {/* Hero Circle Icon */}
      <div className="flex justify-center mb-6">
        <div className={`neon-circle ${circleClass} w-48 h-48 rotate-slow`}>
          {/* Inner circle with icon */}
          <div className="relative">
            <IconComponent className={`h-20 w-20 text-${sentiment === 'negative' ? 'habit-negative' : sentiment === 'positive' ? 'habit-positive' : 'habit-neutral'}`} strokeWidth={1.5} />
            {habit.completed_today && (
              <div className="absolute -top-2 -right-2 bg-success rounded-full p-1 animate-bounce-in">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Habit Title */}
      <div className="text-center mb-4">
        <h3 className={`text-2xl font-bold mb-1 text-glow text-${sentiment === 'negative' ? 'habit-negative' : sentiment === 'positive' ? 'habit-positive' : 'habit-neutral'}`}>
          {habit.name}
        </h3>
        {habit.description && (
          <p className="text-sm text-muted-foreground">{habit.description}</p>
        )}
      </div>

      {/* Stats Section */}
      {habit.stats && (
        <div className="space-y-4 mb-6">
          {/* Streak and Completions */}
          <div className="flex items-center justify-center gap-3">
            {habit.stats.current_streak > 0 && (
              <Badge 
                variant="secondary" 
                className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-habit-negative/20 to-secondary/20 border-habit-negative/30"
              >
                <Flame className="h-3 w-3 text-habit-negative" />
                <span className="font-semibold">{habit.stats.current_streak}</span>
                <span className="text-xs">{t('stats.days')}</span>
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className="flex items-center gap-1 px-3 py-1 border-white/20"
            >
              <TrendingUp className="h-3 w-3" />
              <span className="font-semibold">{habit.stats.total_completions}</span>
            </Badge>
          </div>

          {/* Completion Rate Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('stats.completionRate')}</span>
              <span className="font-semibold text-foreground">{Math.round(habit.stats.completion_rate)}%</span>
            </div>
            <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                  sentiment === 'negative' ? 'from-habit-negative to-secondary' :
                  sentiment === 'positive' ? 'from-habit-positive to-success' :
                  'from-habit-neutral to-primary'
                }`}
                style={{ width: `${habit.stats.completion_rate}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sparkline */}
      {sparklineData.length > 0 && (
        <div className="flex justify-center mb-4">
          <HabitSparkline 
            data={sparklineData}
            height={30}
            width={120}
            color={`hsl(var(--habit-${sentiment === 'negative' ? 'negative' : sentiment === 'positive' ? 'positive' : 'neutral'}))`}
          />
        </div>
      )}

      {/* Action Button */}
      <Button
        onClick={(e) => {
          e.stopPropagation();
          handleComplete();
        }}
        disabled={isCompleting || habit.completed_today}
        className={`w-full relative overflow-hidden group/btn ${
          habit.completed_today 
            ? 'bg-success/20 border-success/50 text-success hover:bg-success/30' 
            : `glass-strong border-${sentiment === 'negative' ? 'habit-negative' : sentiment === 'positive' ? 'habit-positive' : 'habit-neutral'}/50`
        }`}
        variant={habit.completed_today ? "outline" : "default"}
      >
        {!habit.completed_today && (
          <div className={`absolute inset-0 bg-gradient-to-r ${
            sentiment === 'negative' ? 'from-habit-negative/20 to-secondary/20' :
            sentiment === 'positive' ? 'from-habit-positive/20 to-success/20' :
            'from-habit-neutral/20 to-primary/20'
          } opacity-0 group-hover/btn:opacity-100 transition-opacity`} />
        )}
        {habit.completed_today ? (
          <>
            <Check className="mr-2 h-4 w-4 relative z-10" />
            <span className="relative z-10">{t('actions.done')}</span>
          </>
        ) : (
          <span className="relative z-10 font-semibold">{t('actions.mark')}</span>
        )}
      </Button>
    </div>

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
