import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, Dumbbell, Sparkles, Edit, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { switchActivePlan } from "@/lib/training-plan-utils";
import { toast } from "sonner";
import { useState } from "react";
import { EditPlanPreferencesDialog } from "./EditPlanPreferencesDialog";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface MyTrainingPlanCardProps {
  plan: {
    id: string;
    status: string;
    start_date: string;
    end_date: string | null;
    created_at: string;
    training_plans: {
      id: string;
      name: string;
      description: string;
      duration_weeks: number;
      is_ai_generated: boolean;
      ai_metadata: any;
    };
  };
  onUpdate: () => void;
}

export function MyTrainingPlanCard({ plan, onUpdate }: MyTrainingPlanCardProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('workouts');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  const isActive = plan.status === 'active';

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const result = await switchActivePlan(user.id, plan.id);
      
      if (result.success) {
        toast.success(t('trainingPlan.activated'));
        onUpdate();
      } else {
        toast.error(result.error || t('trainingPlan.activateFailed'));
      }
    } catch (error: any) {
      toast.error(error.message || t('trainingPlan.activateError'));
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeactivate = async () => {
    setIsActivating(true);
    try {
      const { error } = await supabase
        .from('assigned_training_plans')
        .update({ status: 'inactive' })
        .eq('id', plan.id);
      
      if (error) throw error;
      toast.success(t('trainingPlan.deactivated'));
      onUpdate();
    } catch (error: any) {
      toast.error(t('trainingPlan.deactivateFailed'));
    } finally {
      setIsActivating(false);
    }
  };

  const handleViewDetails = () => {
    navigate(`/training-plans/${plan.training_plans.id}`);
  };

  return (
    <>
      <Card className={cn(
        "relative overflow-hidden transition-all hover:scale-[1.02]",
        isActive && "border-cyan-500 shadow-lg shadow-cyan-500/20"
      )}>
        {isActive && (
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-cyan-500 via-primary to-pink-500" />
        )}
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg line-clamp-1">
                {plan.training_plans.name}
              </CardTitle>
              <CardDescription className="line-clamp-2 mt-1">
                {plan.training_plans.description}
              </CardDescription>
            </div>
            <Badge variant={isActive ? "default" : "secondary"} className={cn(
              isActive && "bg-gradient-to-r from-cyan-500 to-primary text-white"
            )}>
              {isActive ? t('trainingPlan.active') : t('trainingPlan.inactive')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{plan.training_plans.duration_weeks} {t('trainingPlan.weeks')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="w-4 h-4" />
              <span>
                {format(new Date(plan.start_date), 'd MMM yyyy', { locale: dateLocale })}
              </span>
            </div>
          </div>

          {plan.training_plans.is_ai_generated && (
            <div className="flex items-center gap-2 text-xs text-cyan-500 bg-cyan-500/10 rounded-lg px-3 py-2">
              <Sparkles className="w-3 h-3" />
              <span>{t('trainingPlan.createdByAI')}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {!isActive && (
              <Button 
                onClick={handleActivate}
                disabled={isActivating}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                {t('trainingPlan.activate')}
              </Button>
            )}
            
            <Button 
              onClick={handleViewDetails}
              variant={isActive ? "default" : "outline"}
              className="flex-1"
              size="sm"
            >
              {t('trainingPlan.view')}
            </Button>

            {plan.training_plans.is_ai_generated && (
              <Button
                onClick={() => setShowEditDialog(true)}
                variant="ghost"
                size="sm"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}

            {isActive && (
              <Button
                onClick={handleDeactivate}
                disabled={isActivating}
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                title={t('trainingPlan.deactivate')}
              >
                <Pause className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <EditPlanPreferencesDialog 
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={onUpdate}
      />
    </>
  );
}
