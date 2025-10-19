import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkoutEditor } from './WorkoutEditor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus } from 'lucide-react';

interface TrainingPlanBuilderProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: Array<{ user_id: string; username: string; full_name: string }>;
}

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export const TrainingPlanBuilder = ({ open, onClose, onSuccess, clients }: TrainingPlanBuilderProps) => {
  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [duration, setDuration] = useState('4');
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveWorkout = (workout: any) => {
    const existingIndex = workouts.findIndex(w => w.day_of_week === workout.day_of_week);
    
    if (existingIndex >= 0) {
      const updated = [...workouts];
      updated[existingIndex] = workout;
      setWorkouts(updated);
    } else {
      setWorkouts([...workouts, workout]);
    }
    
    setEditingDay(null);
  };

  const handleSavePlan = async () => {
    if (!planName.trim() || workouts.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Введите название плана и добавьте хотя бы одну тренировку',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Создаем план
      const { data: plan, error: planError } = await supabase
        .from('training_plans')
        .insert({
          trainer_id: user.user.id,
          name: planName,
          description: description || null,
          duration_weeks: parseInt(duration)
        })
        .select()
        .single();

      if (planError) throw planError;

      // Создаем тренировки
      const workoutsToInsert = workouts.map(w => ({
        plan_id: plan.id,
        day_of_week: w.day_of_week,
        workout_name: w.workout_name,
        description: w.description,
        exercises: w.exercises
      }));

      const { error: workoutsError } = await supabase
        .from('training_plan_workouts')
        .insert(workoutsToInsert);

      if (workoutsError) throw workoutsError;

      // Назначаем план клиенту (если выбран)
      if (selectedClient) {
        const { error: assignError } = await supabase
          .from('assigned_training_plans')
          .insert({
            plan_id: plan.id,
            client_id: selectedClient,
            assigned_by: user.user.id,
            start_date: new Date().toISOString().split('T')[0],
            status: 'active'
          });

        if (assignError) throw assignError;
        
        toast({
          title: 'Успешно',
          description: 'Тренировочный план создан и назначен клиенту'
        });
      } else {
        toast({
          title: 'Успешно',
          description: 'План создан. Назначьте его клиенту в настройках плана'
        });
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить план',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setPlanName('');
    setDescription('');
    setSelectedClient('');
    setDuration('4');
    setWorkouts([]);
    setEditingDay(null);
    onClose();
  };

  const getWorkoutForDay = (day: number) => {
    return workouts.find(w => w.day_of_week === day);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создание тренировочного плана</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Основная информация */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Название плана *</Label>
                <Input
                  placeholder="Например: Набор массы - 4 недели"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
              </div>

              <div>
                <Label>Клиент (необязательно)</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Не назначать сейчас" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Не назначать сейчас</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.user_id} value={client.user_id}>
                        {client.full_name} (@{client.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedClient && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Вы сможете назначить план клиенту позже
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Длительность (недели)</Label>
                <Input
                  type="number"
                  min="1"
                  max="52"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              <div>
                <Label>Описание (опционально)</Label>
                <Textarea
                  placeholder="Цели программы, особенности..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={1}
                />
              </div>
            </div>

            {/* Недельный график */}
            <div>
              <Label className="mb-3 block">Недельный график тренировок</Label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day, index) => {
                  const workout = getWorkoutForDay(index);
                  return (
                    <Button
                      key={index}
                      variant={workout ? 'default' : 'outline'}
                      className="flex flex-col h-24 items-center justify-center text-xs p-2"
                      onClick={() => setEditingDay(index)}
                    >
                      <Calendar className="h-4 w-4 mb-1" />
                      <span className="font-medium">{day.slice(0, 2)}</span>
                      {workout ? (
                        <span className="text-xs mt-1 truncate w-full text-center">
                          {workout.workout_name}
                        </span>
                      ) : (
                        <Plus className="h-3 w-3 mt-1 opacity-50" />
                      )}
                    </Button>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Тренировок добавлено: {workouts.length}/7
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button onClick={handleSavePlan} disabled={saving || !planName.trim() || workouts.length === 0}>
              {saving ? 'Сохранение...' : 'Создать план'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingDay !== null && (
        <WorkoutEditor
          open={editingDay !== null}
          onClose={() => setEditingDay(null)}
          onSave={handleSaveWorkout}
          dayOfWeek={editingDay}
          initialData={getWorkoutForDay(editingDay)}
        />
      )}
    </>
  );
};
