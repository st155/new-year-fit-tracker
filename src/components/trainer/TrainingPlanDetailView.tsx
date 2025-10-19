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
  UserPlus
} from 'lucide-react';
import { useState } from 'react';

interface TrainingPlanDetailViewProps {
  planId: string | null;
  onClose: () => void;
  onEdit?: (planId: string) => void;
  onAssign?: (planId: string) => void;
  onDeleted?: () => void;
}

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export const TrainingPlanDetailView = ({
  planId,
  onClose,
  onEdit,
  onAssign,
  onDeleted
}: TrainingPlanDetailViewProps) => {
  const { plan, loading, deletePlan, duplicatePlan, refetch } = useTrainingPlanDetail(planId);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  if (!planId) return null;

  return (
    <>
      <Dialog open={!!planId} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : plan ? (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="h-8 w-8 p-0"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <DialogTitle className="text-2xl">{plan.name}</DialogTitle>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {plan.duration_weeks} {plan.duration_weeks === 1 ? 'неделя' : 'недели'}
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {plan.assigned_training_plans.length} клиентов
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    {plan.training_plan_workouts.length} тренировок
                  </Badge>
                </div>
              </DialogHeader>

              <Tabs defaultValue="schedule" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="schedule">Расписание</TabsTrigger>
                  <TabsTrigger value="clients">
                    Клиенты ({plan.assigned_training_plans.length})
                  </TabsTrigger>
                  <TabsTrigger value="settings">Настройки</TabsTrigger>
                </TabsList>

                <TabsContent value="schedule" className="space-y-4 mt-4">
                  <div className="grid gap-3">
                    {DAYS.map((day, index) => {
                      const workout = plan.training_plan_workouts.find(
                        w => w.day_of_week === index
                      );

                      return (
                        <Card key={index} className={workout ? 'border-primary/50' : ''}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {day}
                              {!workout && (
                                <Badge variant="outline" className="ml-auto">
                                  Отдых
                                </Badge>
                              )}
                            </CardTitle>
                          </CardHeader>
                          {workout && (
                            <CardContent>
                              <Accordion type="single" collapsible>
                                <AccordionItem value="exercises" className="border-0">
                                  <AccordionTrigger className="hover:no-underline py-2">
                                    <div className="flex items-center gap-2">
                                      <Dumbbell className="h-4 w-4 text-primary" />
                                      <span className="font-medium">{workout.workout_name}</span>
                                      <Badge variant="secondary" className="ml-2">
                                        {workout.exercises.length} упражнений
                                      </Badge>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="pt-3">
                                    {workout.description && (
                                      <p className="text-sm text-muted-foreground mb-3">
                                        {workout.description}
                                      </p>
                                    )}
                                    <div className="space-y-2">
                                      {workout.exercises.map((ex, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                        >
                                          <div className="flex-1">
                                            <p className="font-medium text-sm">
                                              {idx + 1}. {ex.exercise_name}
                                            </p>
                                            {ex.notes && (
                                              <p className="text-xs text-muted-foreground mt-1">
                                                {ex.notes}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex gap-3 text-xs text-muted-foreground">
                                            <span>{ex.sets} x {ex.reps}</span>
                                            <span>Отдых: {ex.rest_seconds}с</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="clients" className="mt-4">
                  {plan.assigned_training_plans.length === 0 ? (
                    <Card className="p-8 text-center">
                      <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">План еще не назначен</h3>
                      <p className="text-muted-foreground mb-4">
                        Назначьте этот план клиенту для отслеживания прогресса
                      </p>
                      {onAssign && (
                        <Button onClick={() => onAssign(plan.id)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Назначить клиенту
                        </Button>
                      )}
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {plan.assigned_training_plans.map((assignment) => (
                        <Card key={assignment.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={assignment.profiles.avatar_url || ''} />
                                  <AvatarFallback>
                                    {assignment.profiles.full_name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {assignment.profiles.full_name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    @{assignment.profiles.username}
                                  </p>
                                </div>
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
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="settings" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Управление планом</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {onEdit && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => onEdit(plan.id)}
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
                        Создать копию
                      </Button>
                      {onAssign && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => onAssign(plan.id)}
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
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="text-center py-8">План не найден</div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить план?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. План будет удален безвозвратно.
              {plan && plan.assigned_training_plans.length > 0 && (
                <span className="block mt-2 text-destructive">
                  Этот план назначен {plan.assigned_training_plans.length} клиентам.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
