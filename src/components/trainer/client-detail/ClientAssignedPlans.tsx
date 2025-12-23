import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Plus,
  Dumbbell,
  Calendar,
  MoreVertical,
  Pause,
  Play,
  XCircle,
  CheckCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, differenceInWeeks, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface AssignedPlan {
  id: string;
  plan_id: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  training_plans: {
    id: string;
    name: string;
    description: string | null;
    duration_weeks: number;
  } | null;
}

interface ClientAssignedPlansProps {
  clientId: string;
  onAssignPlan: () => void;
}

export function ClientAssignedPlans({ clientId, onAssignPlan }: ClientAssignedPlansProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<AssignedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'pause' | 'resume' | 'complete' | 'cancel';
    planId: string;
    planName: string;
  } | null>(null);

  useEffect(() => {
    if (clientId) {
      loadAssignedPlans();
    }
  }, [clientId]);

  const loadAssignedPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assigned_training_plans')
        .select(`
          id,
          plan_id,
          start_date,
          end_date,
          status,
          training_plans (
            id,
            name,
            description,
            duration_weeks
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPlans(data || []);
    } catch (error) {
      console.error('Error loading assigned plans:', error);
      toast.error('Не удалось загрузить назначенные планы');
    } finally {
      setLoading(false);
    }
  };

  const updatePlanStatus = async (planId: string, newStatus: string) => {
    setActionLoading(planId);
    try {
      const { error } = await supabase
        .from('assigned_training_plans')
        .update({ status: newStatus })
        .eq('id', planId);

      if (error) throw error;

      setPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, status: newStatus } : p))
      );
      toast.success('Статус плана обновлён');
    } catch (error) {
      console.error('Error updating plan status:', error);
      toast.error('Не удалось обновить статус');
    } finally {
      setActionLoading(null);
      setConfirmDialog(null);
    }
  };

  const handleAction = (action: 'pause' | 'resume' | 'complete' | 'cancel', plan: AssignedPlan) => {
    setConfirmDialog({
      open: true,
      action,
      planId: plan.id,
      planName: plan.training_plans?.name || 'План',
    });
  };

  const confirmAction = () => {
    if (!confirmDialog) return;

    const statusMap = {
      pause: 'paused',
      resume: 'active',
      complete: 'completed',
      cancel: 'cancelled',
    };

    updatePlanStatus(confirmDialog.planId, statusMap[confirmDialog.action]);
  };

  const getActionText = () => {
    if (!confirmDialog) return { title: '', description: '', button: '' };

    const texts = {
      pause: {
        title: 'Приостановить план?',
        description: `План \\"${confirmDialog.planName}\\" будет приостановлен. Вы сможете возобновить его позже.`,
        button: 'Приостановить',
      },
      resume: {
        title: 'Возобновить план?',
        description: `План \\"${confirmDialog.planName}\\" будет возобновлён.`,
        button: 'Возобновить',
      },
      complete: {
        title: 'Завершить план?',
        description: `План \\"${confirmDialog.planName}\\" будет отмечен как завершённый.`,
        button: 'Завершить',
      },
      cancel: {
        title: 'Отменить план?',
        description: `План \\"${confirmDialog.planName}\\" будет отменён. Это действие нельзя отменить.`,
        button: 'Отменить план',
      },
    };

    return texts[confirmDialog.action];
  };

  const getProgress = (plan: AssignedPlan) => {
    if (!plan.training_plans?.duration_weeks || !plan.start_date) return 0;

    const startDate = new Date(plan.start_date);
    const now = new Date();
    const totalDays = plan.training_plans.duration_weeks * 7;
    const elapsedDays = differenceInDays(now, startDate);

    return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  };

  const getCurrentWeek = (plan: AssignedPlan) => {
    if (!plan.start_date) return 1;
    const startDate = new Date(plan.start_date);
    const weeks = differenceInWeeks(new Date(), startDate);
    return Math.max(1, weeks + 1);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      active: { variant: 'default', label: 'Активен' },
      paused: { variant: 'secondary', label: 'На паузе' },
      completed: { variant: 'outline', label: 'Завершён' },
      cancelled: { variant: 'destructive', label: 'Отменён' },
    };
    return variants[status] || { variant: 'outline' as const, label: status };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activePlans = plans.filter((p) => p.status === 'active');
  const otherPlans = plans.filter((p) => p.status !== 'active');

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Тренировочные планы
          </CardTitle>
          <Button onClick={onAssignPlan} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Назначить план
          </Button>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-8">
              <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">Нет назначенных планов</h3>
              <p className="text-muted-foreground mb-4">
                Назначьте клиенту тренировочный план для отслеживания прогресса
              </p>
              <Button onClick={onAssignPlan}>
                <Plus className="h-4 w-4 mr-2" />
                Назначить первый план
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Plans */}
              {activePlans.length > 0 && (
                <div className="space-y-3">
                  {activePlans.map((plan) => {
                    const progress = getProgress(plan);
                    const currentWeek = getCurrentWeek(plan);
                    const statusBadge = getStatusBadge(plan.status);

                    return (
                      <div
                        key={plan.id}
                        className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">
                                {plan.training_plans?.name || 'Неизвестный план'}
                              </h4>
                              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                            </div>
                            
                            {plan.training_plans?.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                                {plan.training_plans.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Начат {format(new Date(plan.start_date), 'd MMM yyyy', { locale: ru })}
                              </span>
                              <span>
                                Неделя {currentWeek} из {plan.training_plans?.duration_weeks || '?'}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Прогресс</span>
                                <span className="font-medium">{Math.round(progress)}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="shrink-0">
                                {actionLoading === plan.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreVertical className="h-4 w-4" />
                                )
                                }
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => plan.plan_id && navigate(`/training-plan/${plan.plan_id}`)}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Открыть план
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction('pause', plan)}>
                                <Pause className="h-4 w-4 mr-2" />
                                Приостановить
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction('complete', plan)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Завершить
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAction('cancel', plan)}
                                className="text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Отменить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Other Plans (collapsed) */}
              {otherPlans.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
                    История планов ({otherPlans.length})
                  </summary>
                  <div className="space-y-2 mt-2">
                    {otherPlans.map((plan) => {
                      const statusBadge = getStatusBadge(plan.status);

                      return (
                        <div
                          key={plan.id}
                          className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium">
                              {plan.training_plans?.name || 'Неизвестный план'}
                            </span>
                            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(plan.start_date), 'd MMM yyyy', { locale: ru })}
                            </span>
                            {plan.status === 'paused' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction('resume', plan)}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Возобновить
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog?.open}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionText().title}</AlertDialogTitle>
            <AlertDialogDescription>{getActionText().description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {getActionText().button}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
