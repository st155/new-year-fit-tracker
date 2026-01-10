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
import { TrainingPlanCalendarView, WorkoutCard } from './training-plan';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface TrainingPlanDetailViewProps {
  planId: string | null;
  isDemoMode?: boolean;
  onClose: () => void;
  onEdit?: (planId: string) => void;
  onAssign?: (planId: string) => void;
  onDeleted?: () => void;
}

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export const TrainingPlanDetailView = ({
  planId,
  isDemoMode = false,
  onClose,
  onEdit,
  onAssign,
  onDeleted
}: TrainingPlanDetailViewProps) => {
  const { t, i18n } = useTranslation('trainingPlan');
  const { plan, loading, deletePlan, duplicatePlan, refetch } = useTrainingPlanDetail(isDemoMode ? null : planId);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  // Demo plan data
  const demoWorkouts = [
    {
      id: 'demo-1',
      day_of_week: 0,
      workout_name: t('demo.workouts.chestTriceps.name'),
      description: t('demo.workouts.chestTriceps.description'),
      exercises: [
        { exercise_id: '1', exercise_name: t('demo.exercises.benchPress'), sets: 4, reps: '8-10', rest_seconds: 90, notes: '' },
        { exercise_id: '2', exercise_name: t('demo.exercises.inclineDumbbellPress'), sets: 3, reps: '10-12', rest_seconds: 60, notes: '' },
        { exercise_id: '3', exercise_name: t('demo.exercises.frenchPress'), sets: 3, reps: '12-15', rest_seconds: 60, notes: '' }
      ]
    },
    {
      id: 'demo-2',
      day_of_week: 2,
      workout_name: t('demo.workouts.backBiceps.name'),
      description: t('demo.workouts.backBiceps.description'),
      exercises: [
        { exercise_id: '4', exercise_name: t('demo.exercises.deadlift'), sets: 4, reps: '6-8', rest_seconds: 120, notes: '' },
        { exercise_id: '5', exercise_name: t('demo.exercises.pullups'), sets: 3, reps: '8-12', rest_seconds: 90, notes: '' },
        { exercise_id: '6', exercise_name: t('demo.exercises.barbellCurl'), sets: 3, reps: '10-12', rest_seconds: 60, notes: '' }
      ]
    },
    {
      id: 'demo-3',
      day_of_week: 4,
      workout_name: t('demo.workouts.legsShoulders.name'),
      description: t('demo.workouts.legsShoulders.description'),
      exercises: [
        { exercise_id: '7', exercise_name: t('demo.exercises.squats'), sets: 4, reps: '8-10', rest_seconds: 120, notes: '' },
        { exercise_id: '8', exercise_name: t('demo.exercises.legPress'), sets: 3, reps: '12-15', rest_seconds: 90, notes: '' },
        { exercise_id: '9', exercise_name: t('demo.exercises.seatedDumbbellPress'), sets: 3, reps: '10-12', rest_seconds: 60, notes: '' }
      ]
    }
  ];
  
  const demoPlan = isDemoMode ? {
    id: 'demo-plan',
    name: t('demo.name'),
    description: t('demo.description'),
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
              <p className="text-muted-foreground">{t('loading')}</p>
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
                <Badge variant="outline" className="ml-4">{t('detail.demo')}</Badge>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t('detail.weeks', { count: currentPlan.duration_weeks })}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {t('detail.clients', { count: currentPlan.assigned_training_plans.length })}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Dumbbell className="h-3 w-3" />
                {t('detail.workouts', { count: currentPlan.training_plan_workouts.length })}
              </Badge>
            </div>
          </DialogHeader>

          <Tabs defaultValue="calendar" className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="calendar" className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {t('detail.tabs.week')}
              </TabsTrigger>
              <TabsTrigger value="schedule">{t('detail.tabs.details')}</TabsTrigger>
              <TabsTrigger value="clients">
                {t('tabs.clients')} ({currentPlan.assigned_training_plans.length})
              </TabsTrigger>
              <TabsTrigger value="settings">{t('detail.tabs.settings')}</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-4">
              <TrainingPlanCalendarView workouts={currentPlan.training_plan_workouts} />
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="grid gap-3">
                {DAY_KEYS.map((dayKey, index) => {
                  const workout = currentPlan.training_plan_workouts.find(
                    w => w.day_of_week === index
                  );

                  return (
                    <Card key={index} className={workout ? 'border-primary/50' : ''}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {t(`days.${dayKey}`)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {workout ? (
                          <WorkoutCard workout={workout} />
                        ) : (
                          <p className="text-sm text-muted-foreground">{t('detail.rest')}</p>
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
                            {assignment.status === 'active' ? t('detail.status.active') : t('detail.status.completed')}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('detail.startDate', { date: new Date(assignment.start_date).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US') })}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">{t('detail.noPlan.title')}</h3>
                      <p className="text-muted-foreground mb-4">
                        {t('detail.noPlan.description')}
                      </p>
                      {!isDemoMode && onAssign && (
                        <Button onClick={() => onAssign(currentPlan.id)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          {t('detail.assignToClient')}
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
                    <CardTitle>{t('detail.info.title')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('detail.info.name')}</span>
                        <p className="font-medium">{currentPlan.name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('detail.info.duration')}</span>
                        <p className="font-medium">{t('detail.weeks', { count: currentPlan.duration_weeks })}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">{t('detail.info.created')}</span>
                        <p className="font-medium">
                          {isDemoMode ? t('detail.demoDescription') : formatDistanceToNow(new Date(currentPlan.created_at), {
                            addSuffix: true,
                            locale: dateLocale
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {!isDemoMode && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('detail.actions.title')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {onEdit && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => onEdit(currentPlan.id)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {t('detail.actions.edit')}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={handleDuplicate}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {t('detail.actions.duplicate')}
                      </Button>
                      {onAssign && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => onAssign(currentPlan.id)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          {t('detail.assignToClient')}
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        className="w-full justify-start"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('detail.actions.delete')}
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
              <AlertDialogTitle>{t('detail.deleteDialog.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('detail.deleteDialog.description')}
                {currentPlan.assigned_training_plans.length > 0 && (
                  <span className="block mt-2 text-destructive">
                    {t('detail.deleteDialog.warning', { count: currentPlan.assigned_training_plans.length })}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('detail.deleteDialog.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                {t('detail.deleteDialog.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};