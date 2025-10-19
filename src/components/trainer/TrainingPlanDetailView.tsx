import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTrainingPlanDetail } from '@/hooks/useTrainingPlanDetail';
import {
  ArrowLeft,
  Calendar,
  User,
  Dumbbell,
  Edit,
  Trash2,
  Copy,
  UserPlus,
  CalendarDays
} from 'lucide-react';
import { useState } from 'react';
import { TrainingPlanCalendarView } from './TrainingPlanCalendarView';
import { WorkoutCard } from './WorkoutCard';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TrainingPlanDetailViewProps {
  planId: string | null;
  isDemoMode?: boolean;
  onClose: () => void;
  onEdit?: (planId: string) => void;
  onAssign?: (planId: string) => void;
  onDeleted?: () => void;
}

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export const TrainingPlanDetailView = ({
  planId,
  isDemoMode = false,
  onClose,
  onEdit,
  onAssign,
  onDeleted
}: TrainingPlanDetailViewProps) => {
  const { plan, loading, deletePlan, duplicatePlan, refetch } = useTrainingPlanDetail(isDemoMode ? null : planId);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Demo plan data
  const demoWorkouts = [
    {
      id: 'demo-1',
      day_of_week: 0,
      workout_name: 'Грудь + Трицепс',
      description: 'Базовая тренировка на верх тела',
      exercises: [
        { exercise_id: '1', exercise_name: 'Жим штанги лежа', sets: 4, reps: '8-10', rest_seconds: 90, notes: '' },
        { exercise_id: '2', exercise_name: 'Жим гантелей на наклонной', sets: 3, reps: '10-12', rest_seconds: 60, notes: '' },
        { exercise_id: '3', exercise_name: 'Французский жим', sets: 3, reps: '12-15', rest_seconds: 60, notes: '' }
      ]
    },
    {
      id: 'demo-2',
      day_of_week: 2,
      workout_name: 'Спина + Бицепс',
      description: 'Тяговые упражнения',
      exercises: [
        { exercise_id: '4', exercise_name: 'Становая тяга', sets: 4, reps: '6-8', rest_seconds: 120, notes: '' },
        { exercise_id: '5', exercise_name: 'Подтягивания', sets: 3, reps: '8-12', rest_seconds: 90, notes: '' },
        { exercise_id: '6', exercise_name: 'Подъем штанги на бицепс', sets: 3, reps: '10-12', rest_seconds: 60, notes: '' }
      ]
    },
    {
      id: 'demo-3',
      day_of_week: 4,
      workout_name: 'Ноги + Плечи',
      description: 'День ног и дельт',
      exercises: [
        { exercise_id: '7', exercise_name: 'Приседания', sets: 4, reps: '8-10', rest_seconds: 120, notes: '' },
        { exercise_id: '8', exercise_name: 'Жим ногами', sets: 3, reps: '12-15', rest_seconds: 90, notes: '' },
        { exercise_id: '9', exercise_name: 'Жим гантелей сидя', sets: 3, reps: '10-12', rest_seconds: 60, notes: '' }
      ]
    }
  ];
  
  const demoPlan = isDemoMode ? {
    id: 'demo-plan',
    name: 'Демо-план: Набор массы',
    description: 'Пример тренировочного плана на 3 раза в неделю. Это демонстрационный план для ознакомления.',
    duration_weeks: 8,
    created_at: new Date().toISOString(),
    trainer_id: 'demo',
    training_plan_workouts: demoWorkouts,
    assigned_training_plans: []
  } : null;
  
  const currentPlan = isDemoMode ? demoPlan : plan;

  const handleDelete = async () => {
    const success = await deletePlan();
    if (success) {
      setShowDeleteDialog(false);
      onDeleted?.();
      onClose();
    }
  };

  const handleDuplicate = async () => {
    const newPlanId = await duplicatePlan();
    if (newPlanId) {
      refetch();
    }
  };

  if (!isDemoMode && loading) {
    return (
      <Dialog open={!!planId} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-muted-foreground">Загрузка...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!currentPlan) {
    return null;
  }

  return (
    <>
      <Dialog open={!!planId || isDemoMode} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <DialogTitle className="text-2xl">{currentPlan.name}</DialogTitle>
                  {currentPlan.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentPlan.description}
                    </p>
                  )}
                </div>
              </div>
              {isDemoMode && (
                <Badge variant="outline" className="ml-4">Демо</Badge>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {currentPlan.duration_weeks} {currentPlan.duration_weeks === 1 ? 'неделя' : 'недели'}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {currentPlan.assigned_training_plans.length} клиентов
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Dumbbell className="h-3 w-3" />
                {currentPlan.training_plan_workouts.length} тренировок
              </Badge>
            </div>
          </DialogHeader>

          <Tabs defaultValue="calendar" className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="calendar" className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                Неделя
              </TabsTrigger>
              <TabsTrigger value="schedule">Детали</TabsTrigger>
              <TabsTrigger value="clients">
                Клиенты ({currentPlan.assigned_training_plans.length})
              </TabsTrigger>
              <TabsTrigger value="settings">Настройки</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-4">
              <TrainingPlanCalendarView workouts={currentPlan.training_plan_workouts} />
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="grid gap-3">
                {DAYS.map((day, index) => {
                  const workout = currentPlan.training_plan_workouts.find(
                    w => w.day_of_week === index
                  );

                  return (
                    <Card key={index} className={workout ? 'border-primary/50' : ''}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {day}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {workout ? (
                          <WorkoutCard workout={workout} />
                        ) : (
                          <p className="text-sm text-muted-foreground">Отдых</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="clients" className="mt-4">
              <div className="space-y-3">
                {currentPlan.assigned_training_plans?.length > 0 ? (
                  currentPlan.assigned_training_plans.map((assignment) => (
                    <Card key={assignment.id}>
                      <CardContent className="flex items-center gap-4 p-4">
                        <Avatar>
                          <AvatarImage src={assignment.profiles.avatar_url || undefined} />
                          <AvatarFallback>
                            {assignment.profiles.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{assignment.profiles.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            @{assignment.profiles.username}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={assignment.status === 'active' ? 'default' : 'secondary'}
                          >
                            {assignment.status === 'active' ? 'Активен' : 'Завершен'}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Начало: {new Date(assignment.start_date).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">План не назначен</h3>
                      <p className="text-muted-foreground mb-4">
                        Назначьте этот план клиентам для начала тренировок
                      </p>
                      {!isDemoMode && onAssign && (
                        <Button onClick={() => onAssign(currentPlan.id)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Назначить клиенту
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Основная информация</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Название:</span>
                        <p className="font-medium">{currentPlan.name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Длительность:</span>
                        <p className="font-medium">{currentPlan.duration_weeks} недель</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Создан:</span>
                        <p className="font-medium">
                          {isDemoMode ? 'Демонстрационный план' : formatDistanceToNow(new Date(currentPlan.created_at), {
                            addSuffix: true,
                            locale: ru
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {!isDemoMode && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Действия</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {onEdit && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => onEdit(currentPlan.id)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Редактировать план
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={handleDuplicate}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Дублировать план
                      </Button>
                      {onAssign && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => onAssign(currentPlan.id)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Назначить клиенту
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        className="w-full justify-start"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить план
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {!isDemoMode && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить тренировочный план?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. План будет удален навсегда вместе со всеми тренировками.
                {currentPlan.assigned_training_plans.length > 0 && (
                  <span className="block mt-2 text-destructive">
                    Внимание: план назначен {currentPlan.assigned_training_plans.length} клиентам
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};