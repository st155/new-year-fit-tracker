import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rpe?: number;
  rir?: number;
  rest_seconds?: number;
}

interface LogWorkoutProps {
  exercise: Exercise;
  assignedPlanId?: string;
  dayOfWeek: number;
  workoutName: string;
  onComplete: () => void;
}

interface SetLog {
  set_number: number;
  actual_weight: number;
  actual_reps: number;
  actual_rpe: number;
  actual_rir: number;
  logged: boolean;
}

export default function LogWorkout({ 
  exercise, 
  assignedPlanId, 
  dayOfWeek,
  workoutName,
  onComplete 
}: LogWorkoutProps) {
  const { t } = useTranslation('workouts');
  const [useRIR, setUseRIR] = useState(exercise.rir !== undefined);
  const [setLogs, setSetLogs] = useState<SetLog[]>(
    Array.from({ length: exercise.sets }, (_, i) => ({
      set_number: i + 1,
      actual_weight: 0,
      actual_reps: exercise.reps,
      actual_rpe: exercise.rpe || 7,
      actual_rir: exercise.rir || 3,
      logged: false
    }))
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSetChange = (setNumber: number, field: keyof SetLog, value: number) => {
    setSetLogs(prev => prev.map(s => 
      s.set_number === setNumber ? { ...s, [field]: value } : s
    ));
  };

  const handleSaveSet = async (setNumber: number) => {
    const setData = setLogs[setNumber - 1];
    
    if (setData.actual_weight <= 0 || setData.actual_reps <= 0) {
      toast.error(t('logging.enterWeightAndReps'));
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(t('logging.notAuthenticated'));
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('workout_logs')
      .insert({
        user_id: user.id,
        exercise_name: exercise.name,
        assigned_plan_id: assignedPlanId,
        day_of_week: dayOfWeek,
        workout_name: workoutName,
        prescribed_reps: exercise.reps,
        prescribed_rpe: exercise.rpe,
        prescribed_rir: exercise.rir,
        actual_weight: setData.actual_weight,
        actual_reps: setData.actual_reps,
        actual_rpe: useRIR ? null : setData.actual_rpe,
        actual_rir: useRIR ? setData.actual_rir : null,
        set_number: setNumber,
        notes: notes || null,
        performed_at: new Date().toISOString()
      });

    setSaving(false);

    if (error) {
      console.error("Error saving set:", error);
      toast.error(t('logging.failedToSaveSet'));
      return;
    }

    setSetLogs(prev => prev.map(s => 
      s.set_number === setNumber ? { ...s, logged: true } : s
    ));
    toast.success(t('logging.setLogged', { number: setNumber }));
  };

  const handleQuickLog = () => {
    setSetLogs(prev => prev.map(s => ({
      ...s,
      actual_weight: s.actual_weight || 0,
      actual_reps: exercise.reps,
      actual_rpe: exercise.rpe
    })));
  };

  const allSetsLogged = setLogs.every(s => s.logged);
  const completedSets = setLogs.filter(s => s.logged).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold">{exercise.name}</h3>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
          <span>{t('logging.prescribed')}: {exercise.sets} sets × {exercise.reps} reps</span>
          {exercise.rpe && <span>{t('logging.rpeTarget')}: {exercise.rpe}</span>}
          {exercise.rir !== undefined && <span>{t('logging.rirTarget')}: {exercise.rir}</span>}
          {exercise.rest_seconds && (
            <span>{t('logging.rest')}: {exercise.rest_seconds}s</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant={allSetsLogged ? "default" : "secondary"}>
            {t('logging.setsLogged', { completed: completedSets, total: exercise.sets })}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUseRIR(!useRIR)}
            className="h-7 text-xs"
          >
            {useRIR ? t('logging.switchToRPE') : t('logging.switchToRIR')}
          </Button>
        </div>
      </div>

      {/* Quick Log Button */}
      {completedSets === 0 && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleQuickLog}
          className="w-full"
        >
          {t('logging.usePrescribedValues')}
        </Button>
      )}

      {/* Sets */}
      <div className="space-y-4">
        {setLogs.map((set) => (
          <Card key={set.set_number} className={set.logged ? "border-primary" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {set.logged ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                  {t('logging.set')} {set.set_number}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!set.logged ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`weight-${set.set_number}`}>{t('logging.weight')}</Label>
                      <Input
                        id={`weight-${set.set_number}`}
                        type="number"
                        step="0.5"
                        value={set.actual_weight || ""}
                        onChange={(e) => handleSetChange(set.set_number, 'actual_weight', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`reps-${set.set_number}`}>{t('logging.reps')}</Label>
                      <Input
                        id={`reps-${set.set_number}`}
                        type="number"
                        value={set.actual_reps || ""}
                        onChange={(e) => handleSetChange(set.set_number, 'actual_reps', parseInt(e.target.value) || 0)}
                        placeholder={exercise.reps.toString()}
                      />
                    </div>
                  </div>
                  
                  {useRIR ? (
                    <div className="space-y-2">
                      <Label>{t('logging.rir')}: {set.actual_rir}</Label>
                      <Slider
                        value={[set.actual_rir]}
                        onValueChange={([value]) => handleSetChange(set.set_number, 'actual_rir', value)}
                        min={0}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t('logging.rirScale.failure')}</span>
                        <span>{t('logging.rirScale.manyLeft')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>{t('logging.rpe')}: {set.actual_rpe}</Label>
                      <Slider
                        value={[set.actual_rpe]}
                        onValueChange={([value]) => handleSetChange(set.set_number, 'actual_rpe', value)}
                        min={1}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t('logging.rpeScale.easy')}</span>
                        <span>{t('logging.rpeScale.max')}</span>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={() => handleSaveSet(set.set_number)}
                    disabled={saving}
                    className="w-full"
                  >
                    {t('logging.saveSet')} {set.set_number}
                  </Button>
                </>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('logging.weight')}:</span>
                    <span className="font-medium">{set.actual_weight} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('logging.reps')}:</span>
                    <span className="font-medium">{set.actual_reps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{useRIR ? 'RIR:' : 'RPE:'}</span>
                    <span className="font-medium">{useRIR ? set.actual_rir : set.actual_rpe}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t('logging.notes')}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('logging.notesPlaceholder')}
          rows={3}
        />
      </div>

      {/* Complete Button */}
      <Button 
        onClick={onComplete}
        disabled={!allSetsLogged}
        size="lg"
        className="w-full"
      >
        {allSetsLogged ? t('logging.completeExercise') : t('logging.setsLogged', { completed: completedSets, total: exercise.sets })}
      </Button>
    </div>
  );
}