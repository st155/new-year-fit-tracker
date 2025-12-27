import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ExerciseSelector } from './ExerciseSelector';
import { Exercise } from '@/lib/exercises-database';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WorkoutExercise {
  exercise_id: string;
  exercise_name: string;
  exercise_type: 'strength' | 'cardio' | 'bodyweight';
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
  
  // Для силовых упражнений
  weight?: number;
  weight_unit?: 'kg' | 'lbs';
  tempo?: string;
  
  // Для кардио
  distance?: number;
  duration?: number;
  pace?: string;
  intensity?: 'low' | 'moderate' | 'high' | 'intervals';
  
  // Универсальное
  target_metric?: string;
}

interface WorkoutEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (workout: {
    day_of_week: number;
    workout_name: string;
    description?: string;
    exercises: WorkoutExercise[];
  }) => void;
  dayOfWeek: number;
  initialData?: {
    workout_name: string;
    description?: string;
    exercises: WorkoutExercise[];
  };
}

export const WorkoutEditor = ({ open, onClose, onSave, dayOfWeek, initialData }: WorkoutEditorProps) => {
  const [workoutName, setWorkoutName] = useState(initialData?.workout_name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [exercises, setExercises] = useState<WorkoutExercise[]>(initialData?.exercises || []);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const { t } = useTranslation('trainer');

  const DAYS = [
    t('trainingPlans.daysFull.monday'),
    t('trainingPlans.daysFull.tuesday'),
    t('trainingPlans.daysFull.wednesday'),
    t('trainingPlans.daysFull.thursday'),
    t('trainingPlans.daysFull.friday'),
    t('trainingPlans.daysFull.saturday'),
    t('trainingPlans.daysFull.sunday')
  ];

  const handleAddExercise = (exercise: Exercise) => {
    const baseExercise: WorkoutExercise = {
      exercise_id: exercise.id,
      exercise_name: exercise.nameRu,
      exercise_type: exercise.type,
      sets: 3,
      reps: '10',
      rest_seconds: 90
    };

    if (exercise.type === 'strength') {
      setExercises([...exercises, {
        ...baseExercise,
        weight: undefined,
        weight_unit: 'kg',
        tempo: undefined,
      }]);
    } else if (exercise.type === 'cardio') {
      setExercises([...exercises, {
        ...baseExercise,
        sets: 1,
        reps: '',
        distance: undefined,
        duration: undefined,
        pace: undefined,
        intensity: 'moderate',
      }]);
    } else {
      setExercises([...exercises, baseExercise]);
    }
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleUpdateExercise = (index: number, field: keyof WorkoutExercise, value: any) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const handleSave = () => {
    if (!workoutName.trim()) return;

    onSave({
      day_of_week: dayOfWeek,
      workout_name: workoutName,
      description: description || undefined,
      exercises
    });

    // Reset
    setWorkoutName('');
    setDescription('');
    setExercises([]);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('workoutEditor.workoutFor', { day: DAYS[dayOfWeek] })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t('workoutEditor.workoutName')}</Label>
              <Input
                placeholder={t('workoutEditor.workoutNamePlaceholder')}
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
              />
            </div>

            <div>
              <Label>{t('workoutEditor.description')}</Label>
              <Textarea
                placeholder={t('workoutEditor.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>{t('workoutEditor.exercises')}</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExerciseSelector(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('workoutEditor.addExercise')}
                </Button>
              </div>

              <div className="space-y-3">
                {exercises.map((ex, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{ex.exercise_name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExercise(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {ex.exercise_type === 'strength' && (
                      <>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">{t('workoutEditor.sets')}</Label>
                            <Input
                              type="number"
                              min="1"
                              value={ex.sets}
                              onChange={(e) => handleUpdateExercise(index, 'sets', parseInt(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t('workoutEditor.reps')}</Label>
                            <Input
                              placeholder={t('workoutEditor.repsPlaceholder')}
                              value={ex.reps}
                              onChange={(e) => handleUpdateExercise(index, 'reps', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t('workoutEditor.weight')}</Label>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="60"
                              value={ex.weight || ''}
                              onChange={(e) => handleUpdateExercise(index, 'weight', e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t('workoutEditor.rest')}</Label>
                            <Input
                              type="number"
                              min="30"
                              value={ex.rest_seconds}
                              onChange={(e) => handleUpdateExercise(index, 'rest_seconds', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">{t('workoutEditor.tempo')}</Label>
                            <Input
                              placeholder={t('workoutEditor.tempoPlaceholder')}
                              value={ex.tempo || ''}
                              onChange={(e) => handleUpdateExercise(index, 'tempo', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t('workoutEditor.targetMetric')}</Label>
                            <Input
                              placeholder={t('workoutEditor.targetMetricPlaceholder')}
                              value={ex.target_metric || ''}
                              onChange={(e) => handleUpdateExercise(index, 'target_metric', e.target.value)}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {ex.exercise_type === 'cardio' && (
                      <>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">{t('workoutEditor.distance')}</Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="5"
                              value={ex.distance || ''}
                              onChange={(e) => handleUpdateExercise(index, 'distance', e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t('workoutEditor.time')}</Label>
                            <Input
                              type="number"
                              placeholder="30"
                              value={ex.duration || ''}
                              onChange={(e) => handleUpdateExercise(index, 'duration', e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t('workoutEditor.pace')}</Label>
                            <Input
                              placeholder={t('workoutEditor.pacePlaceholder')}
                              value={ex.pace || ''}
                              onChange={(e) => handleUpdateExercise(index, 'pace', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">{t('workoutEditor.intensity')}</Label>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              value={ex.intensity || 'moderate'}
                              onChange={(e) => handleUpdateExercise(index, 'intensity', e.target.value)}
                            >
                              <option value="low">{t('workoutEditor.intensityLevels.low')}</option>
                              <option value="moderate">{t('workoutEditor.intensityLevels.moderate')}</option>
                              <option value="high">{t('workoutEditor.intensityLevels.high')}</option>
                              <option value="intervals">{t('workoutEditor.intensityLevels.intervals')}</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">{t('workoutEditor.rest')}</Label>
                            <Input
                              type="number"
                              min="30"
                              value={ex.rest_seconds}
                              onChange={(e) => handleUpdateExercise(index, 'rest_seconds', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {ex.exercise_type === 'bodyweight' && (
                      <>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">{t('workoutEditor.sets')}</Label>
                            <Input
                              type="number"
                              min="1"
                              value={ex.sets}
                              onChange={(e) => handleUpdateExercise(index, 'sets', parseInt(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t('workoutEditor.reps')}</Label>
                            <Input
                              placeholder={t('workoutEditor.repsBodyweightPlaceholder')}
                              value={ex.reps}
                              onChange={(e) => handleUpdateExercise(index, 'reps', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t('workoutEditor.rest')}</Label>
                            <Input
                              type="number"
                              min="30"
                              value={ex.rest_seconds}
                              onChange={(e) => handleUpdateExercise(index, 'rest_seconds', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">{t('workoutEditor.additionalWeight')}</Label>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="10"
                              value={ex.weight || ''}
                              onChange={(e) => handleUpdateExercise(index, 'weight', e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t('workoutEditor.tempo')}</Label>
                            <Input
                              placeholder={t('workoutEditor.tempoPlaceholder')}
                              value={ex.tempo || ''}
                              onChange={(e) => handleUpdateExercise(index, 'tempo', e.target.value)}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <Label className="text-xs">{t('workoutEditor.notes')}</Label>
                      <Input
                        placeholder={t('workoutEditor.notesPlaceholder')}
                        value={ex.notes || ''}
                        onChange={(e) => handleUpdateExercise(index, 'notes', e.target.value)}
                      />
                    </div>
                  </div>
                ))}

                {exercises.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('workoutEditor.addExercises')}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t('workoutEditor.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!workoutName.trim() || exercises.length === 0}>
              {t('workoutEditor.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExerciseSelector
        open={showExerciseSelector}
        onClose={() => setShowExerciseSelector(false)}
        onSelect={handleAddExercise}
      />
    </>
  );
};
