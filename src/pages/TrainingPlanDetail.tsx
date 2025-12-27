import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTrainingPlanDetail } from '@/hooks/useTrainingPlanDetail';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Dumbbell, Users, BarChart3, Activity } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import {
  TrainingPlanHeader,
  TrainingPlanStats,
  TrainingPlanWorkoutsTab,
  TrainingPlanClientsTab,
  TrainingPlanOverviewTab,
  TrainingPlanAnalytics,
} from '@/components/trainer/training-plan';

export default function TrainingPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('trainingPlan');
  
  // Early return if no ID provided
  if (!id) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">{t('noIdProvided')}</h2>
            <Button onClick={() => navigate('/trainer-dashboard?tab=plans')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToPlans')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const { plan, loading, refetch, deletePlan, duplicatePlan } = useTrainingPlanDetail(id);

  const handleDelete = async () => {
    const success = await deletePlan();
    if (success) {
      navigate('/trainer-dashboard?tab=plans');
    }
  };

  const handleDuplicate = async () => {
    const newPlanId = await duplicatePlan();
    if (newPlanId) {
      navigate(`/training-plans/${newPlanId}`);
    }
  };

  if (loading) {
    return <PageLoader message={t('loading')} />;
  }

  if (!plan) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">{t('notFound')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('notFoundDesc')}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={refetch}>
                {t('tryAgain')}
              </Button>
              <Button onClick={() => navigate('/trainer-dashboard?tab=plans')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('backToPlans')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeClients = plan.assigned_training_plans?.filter(a => a.status === 'active').length || 0;
  const totalWorkouts = plan.training_plan_workouts?.length || 0;
  
  // Completion rate - simplified (full implementation requires training_plan_workout_logs table)
  const completionRate = 0; // Default to 0 until workout logs are tracked

  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-6">
      <TrainingPlanHeader
        planName={plan.name}
        description={plan.description}
        durationWeeks={plan.duration_weeks}
        totalWorkouts={totalWorkouts}
        activeClients={activeClients}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />

      <TrainingPlanStats
        activeClients={activeClients}
        totalWorkouts={totalWorkouts}
        completionRate={completionRate}
      />

      {/* Tabs Section */}
      <Tabs defaultValue="workouts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workouts">
            <Dumbbell className="h-4 w-4 mr-2" />
            {t('tabs.workouts')}
          </TabsTrigger>
          <TabsTrigger value="clients">
            <Users className="h-4 w-4 mr-2" />
            {t('tabs.clients')}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('tabs.analytics')}
          </TabsTrigger>
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 mr-2" />
            {t('tabs.overview')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workouts" className="space-y-4">
          <TrainingPlanWorkoutsTab workouts={plan.training_plan_workouts || []} />
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <TrainingPlanClientsTab
            planId={plan.id}
            planName={plan.name}
            planDurationWeeks={plan.duration_weeks}
            assignedClients={plan.assigned_training_plans || []}
            onViewClient={(clientId) => navigate(`/trainer-dashboard?tab=clients&client=${clientId}`)}
            onRefresh={refetch}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <TrainingPlanAnalytics
            workouts={plan.training_plan_workouts || []}
            assignedClients={plan.assigned_training_plans || []}
            durationWeeks={plan.duration_weeks}
          />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <TrainingPlanOverviewTab
            createdAt={plan.created_at}
            durationWeeks={plan.duration_weeks}
            totalWorkouts={totalWorkouts}
            activeClients={activeClients}
            completionRate={completionRate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}