import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { TRAINING_PLAN_PRESETS, TrainingPlanPreset } from '@/lib/training-plan-presets';
import { PresetCard } from './training-plan-ai/PresetCard';
import { SettingsPanel } from './training-plan-ai/SettingsPanel';
import { PreviewPanel } from './training-plan-ai/PreviewPanel';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateTrainingPlanDialogAIProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainerId: string;
  onSuccess?: () => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DIFFICULTY_KEYS = ['beginner', 'regular', 'advanced', 'elite'] as const;

export const CreateTrainingPlanDialogAI = ({
  open,
  onOpenChange,
  trainerId,
  onSuccess,
}: CreateTrainingPlanDialogAIProps) => {
  const { toast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState<TrainingPlanPreset | null>(null);
  const [duration, setDuration] = useState(8);
  const [difficulty, setDifficulty] = useState(1); // 0=beginner, 1=regular, 2=advanced, 3=elite
  const [isCreating, setIsCreating] = useState(false);

  const generatePlanName = () => {
    if (!selectedPreset) return '';
    const difficultyLabels = ['Beginner', 'Regular', 'Advanced', 'Elite'];
    return `${selectedPreset.name} - ${difficultyLabels[difficulty]}`;
  };

  const generateDescription = () => {
    if (!selectedPreset) return '';
    const difficultyLabels = ['beginner-friendly', 'intermediate', 'advanced', 'elite-level'];
    return `A ${difficultyLabels[difficulty]} ${duration}-week ${selectedPreset.category.toLowerCase()} program. ${selectedPreset.description}`;
  };

  const generateWorkouts = () => {
    if (!selectedPreset) return [];
    
    const difficultyKey = DIFFICULTY_KEYS[difficulty];
    
    return selectedPreset.workoutTemplates.map((template) => ({
      day_of_week: template.dayOfWeek,
      workout_name: template.name,
      description: `${template.type} • ${template.duration} minutes`,
      exercises: template.exercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets[difficultyKey],
        reps: ex.reps[difficultyKey],
        notes: ex.notes || '',
      })),
    }));
  };

  const getWorkoutPreview = () => {
    if (!selectedPreset) return [];
    
    return selectedPreset.workoutTemplates.map((template) => ({
      day: DAYS[template.dayOfWeek],
      name: template.name,
      exerciseCount: template.exercises.length,
    }));
  };

  const handleCreate = async () => {
    if (!selectedPreset) return;

    setIsCreating(true);
    try {
      // Create training plan
      const { data: plan, error: planError } = await supabase
        .from('training_plans')
        .insert({
          trainer_id: trainerId,
          name: generatePlanName(),
          description: generateDescription(),
          duration_weeks: duration,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create workouts
      const workouts = generateWorkouts();
      const { error: workoutsError } = await supabase
        .from('training_plan_workouts')
        .insert(
          workouts.map((w) => ({
            plan_id: plan.id,
            day_of_week: w.day_of_week,
            workout_name: w.workout_name,
            description: w.description,
            exercises: w.exercises,
          }))
        );

      if (workoutsError) throw workoutsError;

      toast({
        title: 'Training plan created!',
        description: 'Your AI-generated training plan is ready.',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating training plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to create training plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Training Plan Creator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Select Preset */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">1. Choose a Program</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {TRAINING_PLAN_PRESETS.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  selected={selectedPreset?.id === preset.id}
                  onSelect={() => {
                    setSelectedPreset(preset);
                    setDuration(preset.defaultDuration);
                  }}
                />
              ))}
            </div>
          </div>

          {selectedPreset && (
            <>
              {/* Step 2: Adjust Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    2. Adjust Settings
                  </h3>
                  <SettingsPanel
                    duration={duration}
                    onDurationChange={setDuration}
                    difficulty={difficulty}
                    onDifficultyChange={setDifficulty}
                    maxWorkouts={selectedPreset.weeklyWorkouts}
                  />
                </div>

                {/* Step 3: Preview */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">3. Preview</h3>
                  <PreviewPanel
                    name={generatePlanName()}
                    description={generateDescription()}
                    category={selectedPreset.category}
                    duration={duration}
                    weeklyWorkouts={selectedPreset.weeklyWorkouts}
                    workoutPreview={getWorkoutPreview()}
                  />
                </div>
              </div>

              {/* Create Button */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Training Plan'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
