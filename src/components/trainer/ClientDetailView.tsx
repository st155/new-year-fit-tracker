import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft,
  Target,
  TrendingUp,
  Calendar,
  Activity,
  Heart,
  Zap,
  Weight,
  Plus,
  Sparkles,
  Info,
  Wifi,
  Moon,
  Flame,
  Wind
} from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { useNavigate } from "react-router-dom";
import { GoalCreateDialog } from "@/features/goals/components";

import { useGoalsRealtime, useMeasurementsRealtime } from "@/hooks/useRealtime";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { format } from "date-fns";
import { useClientDetailData, formatSourceName } from "@/hooks/useClientDetailData";
import { HealthDataTabs } from "./health-data/HealthDataTabs";
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { GroupedGoalsView } from './client-detail/GroupedGoalsView';
import { GoalProgressChart } from './client-detail/GoalProgressChart';
import { GoalsProgressOverview } from './client-detail/GoalsProgressOverview';
import { WorkoutAnalysis } from './client-detail/WorkoutAnalysis';
import { ProgressTimeline } from './client-detail/ProgressTimeline';
import { TrainerNotes } from './client-detail/TrainerNotes';
import { ClientReportExport } from './export/ClientReportExport';
import { PeriodComparison } from './export/PeriodComparison';
import { AutoSyncMonitor } from './automation/AutoSyncMonitor';
import { ConflictResolutionPanel } from './automation/ConflictResolutionPanel';
import { AutomatedInsights } from './automation/AutomatedInsights';
import { ClientHealthScore } from './client-detail/ClientHealthScore';
import { AdvancedFilters, FilterState } from './client-detail/AdvancedFilters';
import { ClientDetailSkeleton } from './client-detail/ClientDetailSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ClientProgressVisualization } from './client-detail/visualization/ClientProgressVisualization';
import { AIGoalSuggestions } from './client-detail/AIGoalSuggestions';
import { ClientAssignedPlans } from './client-detail/ClientAssignedPlans';
import { AssignTrainingPlanDialog } from './AssignTrainingPlanDialog';
import { useAuth } from '@/hooks/useAuth';
import { ClientWorkoutsList } from './client-detail/ClientWorkoutsList';
import { ClientStrengthWorkouts } from './client-detail/ClientStrengthWorkouts';
import { useTranslation } from 'react-i18next';

interface Client {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

interface Goal {
  id: string;
  goal_name: string;
  target_value: number;
  target_unit: string;
  goal_type: string;
  current_value: number;
  progress_percentage: number;
  last_measurement_date: string | null;
  measurements_count: number;
}

interface Measurement {
  id: string;
  goal_id: string;
  value: number;
  measurement_date: string;
  goal_name: string;
  unit: string;
  source?: string;
}

interface HealthData {
  date: string;
  steps?: number;
  weight?: number;
  heart_rate_avg?: number;
  active_calories?: number;
  sleep_hours?: number;
  recovery_score?: number;
  day_strain?: number;
}

interface ClientDetailViewProps {
  client: Client;
  onBack: () => void;
}

// Health Score Component with Data Fetching
const ClientHealthScoreWithData = ({ clientId }: { clientId: string }) => {
  const { user } = useAuth();
  const { data: healthScore, isLoading, error } = useQuery({
    queryKey: ['client-health-score', clientId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .rpc('get_client_health_scores', { p_trainer_id: user.id });
      
      if (error) {
        console.warn('Health score not available:', error);
        return null;
      }
      
      // Find the specific client's health score
      return data?.find((score: any) => score.client_id === clientId) || null;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="hidden lg:block">
        <Card className="w-64">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted animate-pulse mx-auto" />
              <div className="h-6 w-24 bg-muted rounded animate-pulse mx-auto" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-4 w-full bg-muted rounded animate-pulse" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !healthScore) {
    return null;
  }

  return (
    <ClientHealthScore
      totalScore={Math.round(healthScore?.health_score || 0)}
      breakdown={{
        recovery: Math.round(healthScore?.recovery_score || 0),
        sleep: Math.round(healthScore?.sleep_quality || 0),
        activity: Math.round(healthScore?.activity_level || 0),
        consistency: Math.round(healthScore?.consistency_score || 0),
        trend: 0, // trend_score not available in new function
      }}
      lastUpdated={healthScore?.last_updated ? new Date(healthScore.last_updated) : new Date()}
      className="hidden lg:block"
    />
  );
};

export function ClientDetailView({ client, onBack }: ClientDetailViewProps) {
  const { navigationSource } = useClientContext();
  const navigate = useNavigate();
  const { t } = useTranslation(['trainer', 'trainerDashboard']);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showAssignPlanDialog, setShowAssignPlanDialog] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('goals');
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    period: '30d',
    sources: [],
    metricTypes: [],
    minConfidence: 0,
  });
  
  const handleResetFilters = () => {
    setFilters({
      period: '30d',
      sources: [],
      metricTypes: [],
      minConfidence: 0,
    });
  };

  // Используем оптимизированный хук для загрузки данных
  const { 
    goals, 
    measurements, 
    healthData, 
    whoopSummary,
    ouraSummary,
    unifiedMetrics,
    loading, 
    error, 
    refetch
  } = useClientDetailData(client.user_id);

  // Real-time updates for goals with optimistic updates
  useGoalsRealtime(client.user_id, (payload) => {
    toast.info(t('clientDetail.goalsUpdated'));
    
    // Точечное обновление goals в React Query кэше
    queryClient.setQueryData(['client-detail', client.user_id], (old: any) => {
      if (!old) return old;
      
      if (payload.eventType === 'INSERT') {
        return { ...old, goals: [...old.goals, payload.new] };
      }
      if (payload.eventType === 'UPDATE') {
        return { 
          ...old, 
          goals: old.goals.map((g: any) => g.id === payload.new.id ? payload.new : g)
        };
      }
      if (payload.eventType === 'DELETE') {
        return { 
          ...old, 
          goals: old.goals.filter((g: any) => g.id !== payload.old.id)
        };
      }
      return old;
    });
  });

  useMeasurementsRealtime(client.user_id, () => {
    toast.info(t('clientDetail.measurementAdded'));
    refetch();
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return <ClientDetailSkeleton onBack={onBack} />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('clientDetail.back')}
          </Button>
        </div>
        <ErrorState
          title={t('clientDetail.loadError')}
          message={error.message || t('clientDetail.loadErrorDesc')}
          onRetry={refetch}
        />
      </div>
    );
  }

  const handleOpenAIHub = () => {
    navigate(`/trainer-dashboard?tab=ai-hub&client=${client.user_id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('clientDetail.back')}
          </Button>
        </div>
        
        {/* Actions Bar */}
        <div className="flex gap-2">
          <ClientReportExport
            client={client}
            goals={goals}
            healthData={healthData}
            whoopSummary={whoopSummary}
            ouraSummary={ouraSummary}
            unifiedMetrics={unifiedMetrics}
          />
          <Button onClick={() => setShowGoalDialog(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('clientDetail.addGoal')}
          </Button>
          <Button onClick={handleOpenAIHub} size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {t('clientDetail.askAI')}
          </Button>
        </div>
      </div>

      {/* Challenge Context Alert */}
      {navigationSource?.type === 'challenges' && navigationSource.challengeId && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {t('clientDetail.participatesInChallenge')} <strong>{navigationSource.challengeName}</strong>
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/trainer-dashboard?tab=challenges&challenge=${navigationSource.challengeId}`)}
            >
              {t('clientDetail.returnToChallenge')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={client.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                {getInitials(client.full_name || client.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl">{client.full_name || client.username}</CardTitle>
              <CardDescription>@{client.username}</CardDescription>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">{goals.length} {t('clientDetail.goals')}</Badge>
                <Badge variant="outline">{measurements.length} {t('clientDetail.measurementsPerMonth')}</Badge>
              </div>
            </div>
            
            {/* Client Health Score */}
            <ClientHealthScoreWithData clientId={client.user_id} />
          </div>
        </CardHeader>
      </Card>

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleResetFilters}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="goals" className="space-y-4">
        <TabsList className="w-full overflow-x-auto flex flex-nowrap md:grid md:grid-cols-8 bg-muted/50 p-1 gap-1">
          <TabsTrigger value="goals" className="whitespace-nowrap flex-shrink-0">{t('clientDetail.tabs.goals')}</TabsTrigger>
          <TabsTrigger value="progress" className="whitespace-nowrap flex-shrink-0">{t('clientDetail.tabs.progress')}</TabsTrigger>
          <TabsTrigger value="workouts" className="whitespace-nowrap flex-shrink-0">{t('clientDetail.tabs.workouts')}</TabsTrigger>
          <TabsTrigger value="timeline" className="whitespace-nowrap flex-shrink-0">{t('clientDetail.tabs.timeline')}</TabsTrigger>
          <TabsTrigger value="automation" className="whitespace-nowrap flex-shrink-0">{t('clientDetail.tabs.automation')}</TabsTrigger>
          <TabsTrigger value="comparison" className="whitespace-nowrap flex-shrink-0">{t('clientDetail.tabs.comparison')}</TabsTrigger>
          <TabsTrigger value="measurements" className="whitespace-nowrap flex-shrink-0">{t('clientDetail.tabs.measurements')}</TabsTrigger>
          <TabsTrigger value="health" className="whitespace-nowrap flex-shrink-0">{t('clientDetail.tabs.health')}</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-4">
          <AIGoalSuggestions 
            clientId={client.user_id}
            trainerId={user?.id || ''}
            onOpenChat={() => setActiveTab('ai-chat')}
          />
          {goals.length > 0 ? (
            <>
              {/* Beautiful Progress Overview */}
              <GoalsProgressOverview 
                goals={goals}
                measurements={measurements}
              />
              
              {/* Original Grouped View - collapsed by default */}
              <details className="mt-8">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {t('clientDetail.showGrouping')}
                </summary>
                <div className="mt-4">
                  <GroupedGoalsView 
                    goals={goals} 
                    clientId={client.user_id}
                    onRefresh={refetch}
                  />
                </div>
              </details>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="h-16 w-16 mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">{t('clientDetail.noGoals.title')}</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md">
                  {t('clientDetail.noGoals.description')}
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowGoalDialog(true)} 
                    size="lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    {t('clientDetail.noGoals.createFirst')}
                  </Button>
                  <Button 
                    onClick={handleOpenAIHub} 
                    size="lg"
                    variant="outline"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    {t('clientDetail.askAI')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Whoop Health Metrics */}
          <div className="space-y-4 mt-8">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('clientDetail.whoopMetrics')}
              <Badge variant="outline" className="ml-2">{t('clientDetail.last7days')}</Badge>
            </h3>
            
            {whoopSummary && whoopSummary.recoveryScore.count > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recovery Score Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5 text-green-500" />
                        {t('clientDetail.recoveryScore')}
                      </CardTitle>
                      <Badge variant="outline">Whoop</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-3xl font-bold">
                        {whoopSummary.recoveryScore.avg}%
                      </div>
                      <Progress 
                        value={whoopSummary.recoveryScore.avg} 
                        className="h-2"
                        variant={
                          whoopSummary.recoveryScore.avg > 66 ? "success" :
                          whoopSummary.recoveryScore.avg > 33 ? "warning" :
                          "danger"
                        }
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{t('trainerDashboard:clientDetail.min')} {whoopSummary.recoveryScore.min}%</span>
                        <span>{t('trainerDashboard:clientDetail.max')} {whoopSummary.recoveryScore.max}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('trainerDashboard:clientDetail.avg7days')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Sleep Quality Card */}
                {whoopSummary.sleep.count > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Moon className="h-5 w-5 text-blue-500" />
                          {t('trainerDashboard:clientDetail.sleepQuality')}
                        </CardTitle>
                        <Badge variant="outline">Whoop</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-3xl font-bold">
                          {whoopSummary.sleep.durationAvg}ч
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('trainerDashboard:clientDetail.efficiency')}</span>
                            <span className="font-medium">{whoopSummary.sleep.efficiencyAvg}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('trainerDashboard:clientDetail.performance')}</span>
                            <span className="font-medium">{whoopSummary.sleep.performanceAvg}%</span>
                          </div>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{t('trainerDashboard:clientDetail.rangeHours', { min: whoopSummary.sleep.durationMin, max: whoopSummary.sleep.durationMax })}</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('trainerDashboard:clientDetail.avg7daysStats')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Day Strain Card */}
                {whoopSummary.strain.dayStrainAvg > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Flame className="h-5 w-5 text-orange-500" />
                          Day Strain
                        </CardTitle>
                        <Badge variant="outline">Whoop</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-3xl font-bold">
                          {whoopSummary.strain.dayStrainAvg}
                        </div>
                        <Progress 
                          value={Math.min(100, (whoopSummary.strain.dayStrainAvg / 20) * 100)} 
                          className="h-2"
                          variant={
                            whoopSummary.strain.dayStrainAvg >= 10 && whoopSummary.strain.dayStrainAvg <= 15 ? "success" :
                            whoopSummary.strain.dayStrainAvg > 15 ? "warning" :
                            "default"
                          }
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{t('trainerDashboard:clientDetail.min')}: {whoopSummary.strain.dayStrainMin}</span>
                          <span>{t('trainerDashboard:clientDetail.max')}: {whoopSummary.strain.dayStrainMax}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('trainerDashboard:clientDetail.avgStrainLabel')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Workout Activity Card */}
                {whoopSummary.strain.workoutCount > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-purple-500" />
                          {t('trainerDashboard:clientDetail.workouts')}
                        </CardTitle>
                        <Badge variant="outline">Whoop</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-3xl font-bold">
                          {whoopSummary.strain.workoutCount}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('trainerDashboard:clientDetail.avgWorkoutStrain')}</span>
                            <span className="font-medium">{whoopSummary.strain.workoutStrainAvg}</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('trainerDashboard:clientDetail.workoutsLast7days')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">{t('trainerDashboard:clientDetail.whoopNotFound')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('trainerDashboard:clientDetail.whoopNotFoundDesc')}
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://www.whoop.com" target="_blank" rel="noopener noreferrer">
                      {t('trainerDashboard:clientDetail.learnWhoop')}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Oura Ring Metrics */}
          <div className="space-y-4 mt-8">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Moon className="h-5 w-5" />
              {t('trainerDashboard:clientDetail.ouraMetrics')}
              <Badge variant="outline" className="ml-2">{t('trainerDashboard:clientDetail.last7days')}</Badge>
            </h3>

            {ouraSummary && ouraSummary.sleep.count > 0 ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Moon className="h-5 w-5 text-purple-500" />
                    <CardTitle>{t('trainerDashboard:clientDetail.ouraStats')}</CardTitle>
                    <Badge variant="outline">Oura Ring</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{t('trainerDashboard:clientDetail.sleepLabel')}</p>
                    <div className="space-y-1">
                      <p className="text-sm">{t('trainerDashboard:clientDetail.avgDuration')}: <strong>{ouraSummary.sleep.durationAvg}h</strong></p>
                      <p className="text-sm">{t('trainerDashboard:clientDetail.efficiency')}: <strong>{ouraSummary.sleep.efficiencyAvg}%</strong></p>
                      <p className="text-sm">{t('trainerDashboard:clientDetail.deepSleep')}: <strong>{ouraSummary.sleep.deepSleepAvg}h</strong></p>
                      <p className="text-sm">{t('trainerDashboard:clientDetail.remSleep')}: <strong>{ouraSummary.sleep.remSleepAvg}h</strong></p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{t('trainerDashboard:clientDetail.hrvLabel')}</p>
                    <div className="space-y-1">
                      <p className="text-sm">{t('trainerDashboard:clientDetail.average')}: <strong>{ouraSummary.hrv.avg} ms</strong></p>
                      <p className="text-sm">{t('trainerDashboard:clientDetail.rangeLabel')}: <strong>{ouraSummary.hrv.min} - {ouraSummary.hrv.max} ms</strong></p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{t('trainerDashboard:clientDetail.breathingLabel')}</p>
                    <div className="space-y-1">
                      <p className="text-sm">{t('trainerDashboard:clientDetail.avgRate')}: <strong>{ouraSummary.respiratoryRate.avg} {t('trainerDashboard:clientDetail.breathsPerMin')}</strong></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Moon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">{t('trainerDashboard:clientDetail.ouraNotFound')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('trainerDashboard:clientDetail.ouraNotFoundDesc')}
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://ouraring.com" target="_blank" rel="noopener noreferrer">
                      {t('trainerDashboard:clientDetail.learnOura')}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <ClientProgressVisualization
            clientId={client.user_id}
            unifiedMetrics={unifiedMetrics}
          />
        </TabsContent>

        <TabsContent value="workouts" className="space-y-4">
          {/* Assigned Training Plans */}
          <ClientAssignedPlans
            clientId={client.user_id}
            onAssignPlan={() => setShowAssignPlanDialog(true)}
          />
          
          {/* Strength Workouts from workout_logs */}
          <ClientStrengthWorkouts clientId={client.user_id} />
          
          {/* Cardio/Health Workouts from workouts table (Whoop/Garmin) */}
          <ClientWorkoutsList clientId={client.user_id} />
          
          <WorkoutAnalysis 
            metrics={unifiedMetrics} 
            clientName={client.full_name || client.username}
          />
          
          {/* Trainer Notes about workouts */}
          <TrainerNotes 
            clientId={client.user_id}
            clientName={client.full_name || client.username}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <ProgressTimeline 
            goals={goals}
            measurements={measurements}
            recoveryScore={whoopSummary ? [whoopSummary.recoveryScore.avg] : undefined}
          />
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="grid gap-6">
            <AutoSyncMonitor clientId={client.user_id} />
            <AutomatedInsights clientId={client.user_id} />
            <ConflictResolutionPanel clientId={client.user_id} />
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <PeriodComparison clientId={client.user_id} />
        </TabsContent>

        <TabsContent value="measurements" className="space-y-4">
          {/* Progress Charts */}
          {goals.length > 0 && measurements.length > 0 && (
            <div className="space-y-4">
              {goals
                .filter(goal => measurements.some(m => m.goal_id === goal.id))
                .map(goal => (
                  <GoalProgressChart 
                    key={goal.id}
                    goal={goal}
                    measurements={measurements.filter(m => m.goal_id === goal.id)}
                  />
                ))}
            </div>
          )}

          {/* Measurements List */}
          <Card>
            <CardHeader>
              <CardTitle>{t('trainerDashboard:clientDetail.recentMeasurements')}</CardTitle>
              <CardDescription>
                {t('trainerDashboard:clientDetail.last30days')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {measurements.length > 0 ? (
                <div className="space-y-3">
                  {measurements.slice(0, 20).map((measurement) => (
                    <div key={measurement.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{measurement.goal_name}</p>
                          {measurement.source && measurement.source !== 'manual' && (
                            <Badge variant="outline" className="text-xs capitalize">
                              <Wifi className="w-3 h-3 mr-1" />
                              {measurement.source}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(measurement.measurement_date), 'dd.MM.yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {typeof measurement.value === 'number' 
                            ? measurement.value.toFixed(1)
                            : measurement.value
                          } {measurement.unit}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t('trainerDashboard:clientDetail.noMeasurementsMonth')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <HealthDataTabs healthData={healthData} loading={loading} />
        </TabsContent>

        <TabsContent value="health_old" className="space-y-4 hidden">
          {healthData.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  {t('trainerDashboard:clientDetail.noHealthData30')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Шаги - только если есть данные */}
                {healthData.filter(d => d.steps).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-blue-500" />
                          <CardTitle className="text-lg">{t('trainerDashboard:clientDetail.steps')}</CardTitle>
                        </div>
                        {healthData.find(d => d.steps)?.steps_source && (
                          <Badge variant="outline" className="text-xs">
                            {formatSourceName(healthData.find(d => d.steps)?.steps_source || '')}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={healthData.filter(d => d.steps)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => format(new Date(value), 'dd.MM')}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            labelFormatter={(value) => format(new Date(value), 'dd.MM.yyyy')}
                            formatter={(value: any) => [value, t('healthCharts.steps')]}
                          />
                          <Line type="monotone" dataKey="steps" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Вес - только если есть данные */}
                {healthData.filter(d => d.weight).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Weight className="h-5 w-5 text-green-500" />
                          <CardTitle className="text-lg">{t('healthCharts.weight')}</CardTitle>
                        </div>
                        {healthData.find(d => d.weight)?.weight_source && (
                          <Badge variant="outline" className="text-xs">
                            {formatSourceName(healthData.find(d => d.weight)?.weight_source || '')}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={healthData.filter(d => d.weight)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => format(new Date(value), 'dd.MM')}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            labelFormatter={(value) => format(new Date(value), 'dd.MM.yyyy')}
                            formatter={(value: any) => [value, t('healthCharts.kg')]}
                          />
                          <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Пульс - только если есть данные */}
                {healthData.filter(d => d.heart_rate_avg).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Heart className="h-5 w-5 text-red-500" />
                          <CardTitle className="text-lg">{t('healthCharts.heartRate')}</CardTitle>
                        </div>
                        {healthData.find(d => d.heart_rate_avg)?.heart_rate_avg_source && (
                          <Badge variant="outline" className="text-xs">
                            {formatSourceName(healthData.find(d => d.heart_rate_avg)?.heart_rate_avg_source || '')}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={healthData.filter(d => d.heart_rate_avg)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => format(new Date(value), 'dd.MM')}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            labelFormatter={(value) => format(new Date(value), 'dd.MM.yyyy')}
                            formatter={(value: any) => [value, t('healthCharts.bpm')]}
                          />
                          <Line type="monotone" dataKey="heart_rate_avg" stroke="#ef4444" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Recovery Score */}
              {healthData.filter(d => d.recovery_score).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-green-500" />
                        <CardTitle className="text-lg">{t('recoveryMetrics.recoveryScore')}</CardTitle>
                      </div>
                      {healthData.find(d => d.recovery_score)?.recovery_score_source && (
                        <Badge variant="outline" className="text-xs">
                          {formatSourceName(healthData.find(d => d.recovery_score)?.recovery_score_source || '')}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={healthData.filter(d => d.recovery_score)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => format(new Date(value), 'dd.MM')}
                        />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value), 'dd.MM.yyyy')}
                          formatter={(value: any) => [value, '%']}
                        />
                        <Line type="monotone" dataKey="recovery_score" stroke="#22c55e" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Day Strain */}
              {healthData.filter(d => d.day_strain).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-orange-500" />
                        <CardTitle className="text-lg">{t('recoveryMetrics.dayStrain')}</CardTitle>
                      </div>
                      {healthData.find(d => d.day_strain)?.day_strain_source && (
                        <Badge variant="outline" className="text-xs">
                          {formatSourceName(healthData.find(d => d.day_strain)?.day_strain_source || '')}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={healthData.filter(d => d.day_strain)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => format(new Date(value), 'dd.MM')}
                        />
                        <YAxis domain={[0, 21]} tick={{ fontSize: 12 }} />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value), 'dd.MM.yyyy')}
                          formatter={(value: any) => [value, t('healthCharts.strain')]}
                        />
                        <Line type="monotone" dataKey="day_strain" stroke="#f97316" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Sleep Efficiency (Oura/Garmin/Whoop) */}
              {healthData.filter(d => d.sleep_efficiency).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Moon className="h-5 w-5 text-indigo-500" />
                        <CardTitle className="text-lg">{t('healthCharts.sleepEfficiency')}</CardTitle>
                      </div>
                      {healthData.find(d => d.sleep_efficiency)?.sleep_efficiency_source && (
                        <Badge variant="outline" className="text-xs">
                          {formatSourceName(healthData.find(d => d.sleep_efficiency)?.sleep_efficiency_source || '')}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={healthData.filter(d => d.sleep_efficiency)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => format(new Date(value), 'dd.MM')}
                        />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value), 'dd.MM.yyyy')}
                          formatter={(value: any) => [value + '%', t('healthCharts.efficiency')]}
                        />
                        <Line type="monotone" dataKey="sleep_efficiency" stroke="#6366f1" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Sleep Stages (Oura/Garmin) */}
              {healthData.filter(d => d.deep_sleep_duration || d.light_sleep_duration || d.rem_sleep_duration).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Moon className="h-5 w-5 text-purple-500" />
                        <CardTitle className="text-lg">{t('healthCharts.sleepPhases')}</CardTitle>
                      </div>
                      {healthData.find(d => d.deep_sleep_duration || d.light_sleep_duration || d.rem_sleep_duration)?.deep_sleep_duration_source && (
                        <Badge variant="outline" className="text-xs">
                          {formatSourceName(healthData.find(d => d.deep_sleep_duration)?.deep_sleep_duration_source || '')}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={healthData.filter(d => d.deep_sleep_duration || d.light_sleep_duration || d.rem_sleep_duration)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => format(new Date(value), 'dd.MM')}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value), 'dd.MM.yyyy')}
                          formatter={(value: any) => [value ? value.toFixed(1) + 'h' : '0h', '']}
                        />
                        <Legend />
                        <Bar dataKey="deep_sleep_duration" fill="#7c3aed" name={t('healthCharts.deepSleep')} stackId="sleep" />
                        <Bar dataKey="light_sleep_duration" fill="#a78bfa" name={t('healthCharts.lightSleep')} stackId="sleep" />
                        <Bar dataKey="rem_sleep_duration" fill="#ddd6fe" name={t('healthCharts.remSleep')} stackId="sleep" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* HRV (Oura/Garmin) */}
              {healthData.filter(d => d.hrv).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-pink-500" />
                        <CardTitle className="text-lg">{t('healthCharts.hrvVariability')}</CardTitle>
                      </div>
                      {healthData.find(d => d.hrv)?.hrv_source && (
                        <Badge variant="outline" className="text-xs">
                          {formatSourceName(healthData.find(d => d.hrv)?.hrv_source || '')}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={healthData.filter(d => d.hrv)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => format(new Date(value), 'dd.MM')}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value), 'dd.MM.yyyy')}
                          formatter={(value: any) => [value + ' ms', t('healthCharts.hrvRmssd')]}
                        />
                        <Line type="monotone" dataKey="hrv" stroke="#ec4899" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Respiratory Rate (Oura/Garmin) */}
              {healthData.filter(d => d.respiratory_rate).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wind className="h-5 w-5 text-cyan-500" />
                        <CardTitle className="text-lg">{t('healthCharts.respiratoryRate')}</CardTitle>
                      </div>
                      {healthData.find(d => d.respiratory_rate)?.respiratory_rate_source && (
                        <Badge variant="outline" className="text-xs">
                          {formatSourceName(healthData.find(d => d.respiratory_rate)?.respiratory_rate_source || '')}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={healthData.filter(d => d.respiratory_rate)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => format(new Date(value), 'dd.MM')}
                        />
                        <YAxis domain={[10, 20]} tick={{ fontSize: 12 }} />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value), 'dd.MM.yyyy')}
                          formatter={(value: any) => [value.toFixed(1) + ' ' + t('healthCharts.breathsPerMin'), t('healthCharts.rate')]}
                        />
                        <Line type="monotone" dataKey="respiratory_rate" stroke="#06b6d4" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Goal Creation Dialog */}
      <GoalCreateDialog
        open={showGoalDialog}
        onOpenChange={setShowGoalDialog}
        onGoalCreated={() => {
          refetch();
        }}
      />
      
      {/* Assign Training Plan Dialog */}
      <AssignTrainingPlanDialog
        open={showAssignPlanDialog}
        onOpenChange={setShowAssignPlanDialog}
        clientId={client.user_id}
        clientName={client.full_name || client.username}
        onSuccess={() => {
          // Force refresh of assigned plans
        }}
      />
    </div>
  );
}