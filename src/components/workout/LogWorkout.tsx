import { useState } from "react";
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
  rpe: number;
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
  logged: boolean;
}

export default function LogWorkout({ 
  exercise, 
  assignedPlanId, 
  dayOfWeek,
  workoutName,
  onComplete 
}: LogWorkoutProps) {
  const [setLogs, setSetLogs] = useState<SetLog[]>(
    Array.from({ length: exercise.sets }, (_, i) => ({
      set_number: i + 1,
      actual_weight: 0,
      actual_reps: exercise.reps,
      actual_rpe: exercise.rpe,
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
      toast.error("Please enter weight and reps");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
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
        actual_weight: setData.actual_weight,
        actual_reps: setData.actual_reps,
        actual_rpe: setData.actual_rpe,
        set_number: setNumber,
        notes: notes || null,
        performed_at: new Date().toISOString()
      });

    setSaving(false);

    if (error) {
      console.error("Error saving set:", error);
      toast.error("Failed to save set");
      return;
    }

    setSetLogs(prev => prev.map(s => 
      s.set_number === setNumber ? { ...s, logged: true } : s
    ));
    toast.success(`Set ${setNumber} logged!`);
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
        <div className="flex gap-4 text-sm text-muted-foreground mt-2">
          <span>Prescribed: {exercise.sets} sets × {exercise.reps} reps</span>
          <span>RPE Target: {exercise.rpe}</span>
          {exercise.rest_seconds && (
            <span>Rest: {exercise.rest_seconds}s</span>
          )}
        </div>
        <div className="mt-2">
          <Badge variant={allSetsLogged ? "default" : "secondary"}>
            {completedSets}/{exercise.sets} sets logged
          </Badge>
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
          Use Prescribed Values
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
                  Set {set.set_number}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!set.logged ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`weight-${set.set_number}`}>Weight (kg)</Label>
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
                      <Label htmlFor={`reps-${set.set_number}`}>Reps</Label>
                      <Input
                        id={`reps-${set.set_number}`}
                        type="number"
                        value={set.actual_reps || ""}
                        onChange={(e) => handleSetChange(set.set_number, 'actual_reps', parseInt(e.target.value) || 0)}
                        placeholder={exercise.reps.toString()}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>RPE (Rate of Perceived Exertion): {set.actual_rpe}</Label>
                    <Slider
                      value={[set.actual_rpe]}
                      onValueChange={([value]) => handleSetChange(set.set_number, 'actual_rpe', value)}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Easy (1)</span>
                      <span>Max Effort (10)</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleSaveSet(set.set_number)}
                    disabled={saving}
                    className="w-full"
                  >
                    Save Set {set.set_number}
                  </Button>
                </>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="font-medium">{set.actual_weight} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reps:</span>
                    <span className="font-medium">{set.actual_reps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RPE:</span>
                    <span className="font-medium">{set.actual_rpe}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did this exercise feel? Any observations..."
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
        {allSetsLogged ? "Complete Exercise" : `Log remaining sets (${completedSets}/${exercise.sets})`}
      </Button>
    </div>
  );
}
