import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { parseWorkoutText, ParsedWorkout } from "@/lib/workout-text-parser";
import { ParsedWorkoutPreview } from "./ParsedWorkoutPreview";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileText, Calendar as CalendarIcon, Clock, User } from "lucide-react";

interface ManualWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PLACEHOLDER_TEXT = `Пример ввода:

Lunges alternating 
10x20kg
10x40kg
8x50kg

Overhead press barbell 
10x20kg
8x40kg

superset:
Dips
10
10x20kg

Biceps dumbbell 
10x20kg
10x25

Plank 3x45sec
Side Plank
1m 1m`;

export function ManualWorkoutDialog({ 
  open, 
  onOpenChange,
  onSuccess 
}: ManualWorkoutDialogProps) {
  const { t, i18n } = useTranslation('workouts');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [workoutText, setWorkoutText] = useState("");
  const [workoutName, setWorkoutName] = useState(t('manual.defaultName'));
  const [workoutDate, setWorkoutDate] = useState<Date>(new Date());
  const [duration, setDuration] = useState("60");
  const [trainerName, setTrainerName] = useState("");
  const [parsedWorkout, setParsedWorkout] = useState<ParsedWorkout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  const handleParse = () => {
    if (!workoutText.trim()) {
      toast.error(t('manual.enterText'));
      return;
    }
    
    const parsed = parseWorkoutText(workoutText);
    if (parsed.exercises.length === 0) {
      toast.error(t('manual.parseError'), {
        description: t('manual.checkFormat')
      });
      return;
    }
    
    setParsedWorkout(parsed);
    setStep('preview');
  };

  const handleSave = async () => {
    if (!user?.id || !parsedWorkout) return;

    setIsSaving(true);
    try {
      const startTime = new Date(workoutDate);
      startTime.setHours(10, 0, 0, 0);
      const notes = trainerName ? `Тренировка с ${trainerName}` : workoutName;

      // Create workout record
      const { data: workout, error: workoutError } = await supabase
        .from("workouts")
        .insert({
          user_id: user.id,
          workout_type: "strength",
          start_time: startTime.toISOString(),
          duration_minutes: parseInt(duration) || 60,
          source: "manual_trainer",
          notes: notes,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Create workout logs for each set
      const logs = [];
      for (const exercise of parsedWorkout.exercises) {
        for (let setIndex = 0; setIndex < exercise.sets.length; setIndex++) {
          const set = exercise.sets[setIndex];
          logs.push({
            user_id: user.id,
            exercise_name: exercise.name,
            set_number: setIndex + 1,
            actual_weight: set.weight || 0,
            actual_reps: Math.round(set.reps || 0), // Ensure integer for database
            actual_rpe: 7,
            superset_group: exercise.supersetGroup?.toString() || null,
            performed_at: startTime.toISOString(),
            notes: set.duration_seconds 
              ? `Duration: ${set.duration_seconds}s` 
              : null,
          });
        }
      }

      if (logs.length > 0) {
        const { error: logsError } = await supabase
          .from("workout_logs")
          .insert(logs);

        if (logsError) throw logsError;
      }

      // Auto-link with WHOOP workout on the same day
      const workoutDateStr = startTime.toISOString().split('T')[0];
      const { data: whoopWorkout } = await supabase
        .from("workouts")
        .select("id")
        .eq("user_id", user.id)
        .eq("source", "whoop")
        .gte("start_time", `${workoutDateStr}T00:00:00`)
        .lt("start_time", `${workoutDateStr}T23:59:59`)
        .in("workout_type", ['0', '1', '48', '63', '44', '47', '82', '71'])
        .is("linked_workout_id", null)
        .limit(1)
        .maybeSingle();

      if (whoopWorkout) {
        await supabase
          .from("workouts")
          .update({ linked_workout_id: workout.id })
          .eq("id", whoopWorkout.id);
      }

      toast.success(t('manual.saveSuccess'), {
        description: t('manual.saveSuccessDesc', { 
          exercises: parsedWorkout.exercises.length, 
          sets: parsedWorkout.totalSets,
          whoop: whoopWorkout ? ` • ${t('manual.linkedWithWhoop')}` : ''
        })
      });

      // Invalidate workout-related queries for smooth UI update
      await queryClient.invalidateQueries({ queryKey: ['workout-history'] });
      await queryClient.invalidateQueries({ queryKey: ['progress-metrics'] });

      // Reset form and close dialog
      setWorkoutText("");
      setParsedWorkout(null);
      setStep('input');
      onOpenChange(false);
      onSuccess?.();

    } catch (error) {
      console.error("Error saving workout:", error);
      toast.error(t('manual.saveError'), {
        description: t('manual.tryAgain')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setParsedWorkout(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-neutral-900 border-neutral-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-cyan-400" />
            {t('manual.title')}
          </DialogTitle>
          <DialogDescription>
            {t('manual.description')}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4">
            {/* Workout metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workout-name" className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {t('manual.nameLabel')}
                </Label>
                <Input
                  id="workout-name"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder={t('manual.defaultName')}
                  className="bg-neutral-800 border-neutral-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainer-name" className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {t('manual.trainerLabel')}
                </Label>
                <Input
                  id="trainer-name"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  placeholder={t('manual.trainerPlaceholder')}
                  className="bg-neutral-800 border-neutral-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {t('manual.dateLabel')}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-neutral-800 border-neutral-700 hover:bg-neutral-700",
                        !workoutDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {workoutDate ? format(workoutDate, "d MMMM yyyy", { locale: dateLocale }) : t('manual.selectDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={workoutDate}
                      onSelect={(date) => date && setWorkoutDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {t('manual.durationLabel')}
                </Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="60"
                  className="bg-neutral-800 border-neutral-700"
                />
              </div>
            </div>

            {/* Workout text input */}
            <div className="space-y-2">
              <Label htmlFor="workout-text">{t('manual.textLabel')}</Label>
              <Textarea
                id="workout-text"
                value={workoutText}
                onChange={(e) => setWorkoutText(e.target.value)}
                placeholder={PLACEHOLDER_TEXT}
                className="min-h-[300px] font-mono text-sm bg-neutral-800 border-neutral-700"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                {t('manual.cancel')}
              </Button>
              <Button 
                onClick={handleParse}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                {t('manual.parse')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Parsed workout preview */}
            {parsedWorkout && (
              <ParsedWorkoutPreview 
                workout={parsedWorkout}
                workoutName={trainerName ? `${workoutName} (${trainerName})` : workoutName}
                date={format(workoutDate, "yyyy-MM-dd")}
                duration={parseInt(duration) || 60}
              />
            )}

            <div className="flex justify-between gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('input')}
              >
                ← {t('manual.edit')}
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('manual.saving')}
                  </>
                ) : (
                  t('manual.save')
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
