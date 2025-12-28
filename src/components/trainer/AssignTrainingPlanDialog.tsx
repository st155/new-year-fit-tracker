import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Dumbbell, Loader2, Check, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TrainingPlan {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
  workouts_count: number;
  active_clients_count: number;
}

interface AssignTrainingPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onSuccess: () => void;
}

export function AssignTrainingPlanDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  onSuccess,
}: AssignTrainingPlanDialogProps) {
  const { t } = useTranslation('trainer');
  const { user } = useAuth();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [assigning, setAssigning] = useState(false);
  const [existingPlanIds, setExistingPlanIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && user?.id) {
      loadPlans();
      loadExistingAssignments();
    }
  }, [open, user?.id, clientId]);

  const loadPlans = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Fetch plans with workout counts
      const { data: plansData, error: plansError } = await supabase
        .from('training_plans')
        .select(`
          id,
          name,
          description,
          duration_weeks,
          training_plan_workouts(count),
          assigned_training_plans(count)
        `)
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      const formattedPlans: TrainingPlan[] = (plansData || []).map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        duration_weeks: plan.duration_weeks,
        workouts_count: plan.training_plan_workouts?.[0]?.count || 0,
        active_clients_count: plan.assigned_training_plans?.[0]?.count || 0,
      }));

      setPlans(formattedPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error(t('assignPlan.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assigned_training_plans')
        .select('plan_id')
        .eq('client_id', clientId)
        .eq('status', 'active');

      if (error) throw error;

      setExistingPlanIds((data || []).map((a) => a.plan_id).filter(Boolean) as string[]);
    } catch (error) {
      console.error('Error loading existing assignments:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedPlanId || !user?.id) return;

    setAssigning(true);
    try {
      const selectedPlan = plans.find((p) => p.id === selectedPlanId);
      const endDate = selectedPlan?.duration_weeks
        ? new Date(new Date(startDate).getTime() + selectedPlan.duration_weeks * 7 * 24 * 60 * 60 * 1000)
        : null;

      const { error } = await supabase
        .from('assigned_training_plans')
        .insert({
          plan_id: selectedPlanId,
          client_id: clientId,
          assigned_by: user.id,
          start_date: startDate,
          end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
          status: 'active',
        });

      if (error) throw error;

      toast.success(t('assignPlan.assigned', { name: selectedPlan?.name }));
      onSuccess();
      onOpenChange(false);
      setSelectedPlanId(null);
    } catch (error: any) {
      console.error('Error assigning plan:', error);
      toast.error(error.message || t('assignPlan.assignError'));
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{t('assignPlan.title')}</DialogTitle>
          <DialogDescription>
            {t('assignPlan.selectFor', { name: clientName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('assignPlan.startDate')}
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-48"
            />
          </div>

          {/* Plans List */}
          <div className="space-y-2">
            <Label>{t('assignPlan.selectPlan')}</Label>
            <ScrollArea className="h-[350px] rounded-md border p-2">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>{t('assignPlan.noPlans')}</p>
                  <p className="text-sm mt-1">{t('assignPlan.noPlansHint')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {plans.map((plan) => {
                    const isAlreadyAssigned = existingPlanIds.includes(plan.id);
                    const isSelected = selectedPlanId === plan.id;

                    return (
                      <Card
                        key={plan.id}
                        className={`cursor-pointer transition-all ${
                          isAlreadyAssigned
                            ? 'opacity-50 cursor-not-allowed'
                            : isSelected
                            ? 'ring-2 ring-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => !isAlreadyAssigned && setSelectedPlanId(plan.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium truncate">{plan.name}</h4>
                                {isAlreadyAssigned && (
                                  <Badge variant="secondary" className="shrink-0">
                                    <Check className="h-3 w-3 mr-1" />
                                    {t('assignPlan.alreadyAssigned')}
                                  </Badge>
                                )}
                              </div>
                              {plan.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {plan.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {plan.duration_weeks} {t('assignPlan.weeks')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Dumbbell className="h-3.5 w-3.5" />
                                  {plan.workouts_count} {t('assignPlan.workouts')}
                                </span>
                              </div>
                            </div>
                            {isSelected && !isAlreadyAssigned && (
                              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleAssign} disabled={!selectedPlanId || assigning}>
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('assignPlan.assigning')}
                </>
              ) : (
                t('assignPlan.assign')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
