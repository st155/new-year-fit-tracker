import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ExerciseSelector } from './ExerciseSelector';
import { Exercise } from '@/lib/exercises-database';
import { Plus, Trash2 } from 'lucide-react';

interface WorkoutExercise {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
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

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export const WorkoutEditor = ({ open, onClose, onSave, dayOfWeek, initialData }: WorkoutEditorProps) => {
  const [workoutName, setWorkoutName] = useState(initialData?.workout_name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [exercises, setExercises] = useState<WorkoutExercise[]>(initialData?.exercises || []);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);

  const handleAddExercise = (exercise: Exercise) => {
    setExercises([
      ...exercises,
      {
        exercise_id: exercise.id,
        exercise_name: exercise.nameRu,
        sets: 3,
        reps: '10',
        rest_seconds: 90
      }
    ]);
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
              Тренировка: {DAYS[dayOfWeek]}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Название тренировки</Label>
              <Input
                placeholder="Например: Грудь + трицепс"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
              />
            </div>

            <div>
              <Label>Описание (опционально)</Label>
              <Textarea
                placeholder="Дополнительная информация..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Упражнения</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExerciseSelector(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить упражнение
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

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Подходы</Label>
                        <Input
                          type="number"
                          min="1"
                          value={ex.sets}
                          onChange={(e) => handleUpdateExercise(index, 'sets', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Повторения</Label>
                        <Input
                          placeholder="10 или 8-12"
                          value={ex.reps}
                          onChange={(e) => handleUpdateExercise(index, 'reps', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Отдых (сек)</Label>
                        <Input
                          type="number"
                          min="30"
                          value={ex.rest_seconds}
                          onChange={(e) => handleUpdateExercise(index, 'rest_seconds', parseInt(e.target.value))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Заметки (опционально)</Label>
                      <Input
                        placeholder="Техника выполнения, особенности..."
                        value={ex.notes || ''}
                        onChange={(e) => handleUpdateExercise(index, 'notes', e.target.value)}
                      />
                    </div>
                  </div>
                ))}

                {exercises.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Добавьте упражнения для тренировки
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={!workoutName.trim() || exercises.length === 0}>
              Сохранить тренировку
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
