import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { MyTrainingPlanCard } from "@/components/workout/MyTrainingPlanCard";

interface AssignedPlan {
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
}

export default function MyTrainingPlans() {
  const navigate = useNavigate();
  const { t } = useTranslation('trainingPlan');

  const { data: plans, isLoading, refetch } = useQuery({
    queryKey: ['my-training-plans'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('assigned_training_plans')
        .select(`
          *,
          training_plans (
            id,
            name,
            description,
            duration_weeks,
            is_ai_generated,
            ai_metadata
          )
        `)
        .eq('client_id', user.id)
        .eq('assigned_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AssignedPlan[];
    }
  });

  const activePlans = plans?.filter(p => p.status === 'active') || [];
  const inactivePlans = plans?.filter(p => p.status === 'inactive') || [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/workouts')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('myPlans.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('myPlans.subtitle')}
            </p>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/workouts/ai-onboarding')}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('myPlans.createNew')}
        </Button>
      </div>

      {!plans || plans.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-cyan-500" />
            </div>
            <CardTitle>{t('myPlans.noPlans.title')}</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              {t('myPlans.noPlans.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button 
              onClick={() => navigate('/workouts/ai-onboarding')}
              size="lg"
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {t('myPlans.noPlans.action')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {activePlans.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{t('myPlans.activePlan')}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activePlans.map(plan => (
                  <MyTrainingPlanCard 
                    key={plan.id} 
                    plan={plan} 
                    onUpdate={refetch}
                  />
                ))}
              </div>
            </div>
          )}

          {inactivePlans.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-muted-foreground">
                {t('myPlans.previousPlans')}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inactivePlans.map(plan => (
                  <MyTrainingPlanCard 
                    key={plan.id} 
                    plan={plan} 
                    onUpdate={refetch}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
