import { useState, useEffect } from "react";
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
  LayoutDashboard,
  Trophy
} from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { useNavigate } from "react-router-dom";
import { GoalCreateDialog } from "@/components/goals/GoalCreateDialog";
import { NavigationBreadcrumbs, Breadcrumb } from "@/components/navigation/NavigationBreadcrumbs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { TrainerAIAssistant } from "./TrainerAIAssistant";

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
  current_value?: number;
  progress_percentage?: number;
}

interface Measurement {
  id: string;
  value: number;
  measurement_date: string;
  goal_name: string;
  unit: string;
}

interface HealthData {
  date: string;
  steps?: number;
  weight?: number;
  heart_rate_avg?: number;
  active_calories?: number;
  sleep_hours?: number;
}

interface ClientDetailViewProps {
  client: Client;
  onBack: () => void;
}

export function ClientDetailView({ client, onBack }: ClientDetailViewProps) {
  const { navigationSource } = useClientContext();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  useEffect(() => {
    loadClientData();
  }, [client.user_id]);

  const loadClientData = async () => {
    try {
      setLoading(true);

      // Загружаем цели клиента
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', client.user_id);

      if (goalsError) throw goalsError;

      // Для каждой цели получаем последнее измерение
      const goalsWithProgress = await Promise.all(
        (goalsData || []).map(async (goal) => {
          const { data: latestMeasurement } = await supabase
            .from('measurements')
            .select('value, measurement_date')
            .eq('goal_id', goal.id)
            .order('measurement_date', { ascending: false })
            .limit(1)
            .single();

          const currentValue = latestMeasurement?.value || 0;
          const progressPercentage = goal.target_value 
            ? Math.min(100, Math.round((currentValue / goal.target_value) * 100))
            : 0;

          return {
            ...goal,
            current_value: currentValue,
            progress_percentage: progressPercentage
          };
        })
      );

      // Загружаем измерения за последние 30 дней
      const { data: measurementsData, error: measurementsError } = await supabase
        .from('measurements')
        .select(`
          id,
          value,
          measurement_date,
          goals (goal_name, target_unit)
        `)
        .eq('user_id', client.user_id)
        .gte('measurement_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('measurement_date', { ascending: false });

      if (measurementsError) throw measurementsError;

      // Загружаем данные здоровья за последние 30 дней
      const { data: healthSummary, error: healthError } = await supabase
        .from('daily_health_summary')
        .select('*')
        .eq('user_id', client.user_id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (healthError) throw healthError;

      // Load AI history for this client
      const { data: aiLogs, error: aiError } = await supabase
        .from('ai_action_logs')
        .select('*')
        .eq('client_id', client.user_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (aiError) throw aiError;
      setAiHistory(aiLogs || []);

      setGoals(goalsWithProgress);
      setMeasurements(
        (measurementsData || []).map(m => ({
          id: m.id,
          value: m.value,
          measurement_date: m.measurement_date,
          goal_name: m.goals?.goal_name || 'Неизвестная цель',
          unit: m.goals?.target_unit || ''
        }))
      );
      setHealthData(
        (healthSummary || []).map(h => ({
          date: h.date,
          steps: h.steps,
          weight: h.weight,
          heart_rate_avg: h.heart_rate_avg,
          active_calories: h.active_calories,
          sleep_hours: h.sleep_hours
        }))
      );

    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const handleOpenAIHub = () => {
    navigate(`/trainer-dashboard?tab=ai-hub&client=${client.user_id}`);
  };

  // Build breadcrumbs
  const breadcrumbs: Breadcrumb[] = [
    { 
      label: 'Dashboard', 
      path: '/trainer-dashboard?tab=overview',
      icon: <LayoutDashboard className="h-4 w-4 mr-1" />
    }
  ];

  if (navigationSource?.type === 'challenges' && navigationSource.challengeId) {
    breadcrumbs.push({
      label: navigationSource.challengeName || 'Челлендж',
      path: `/trainer-dashboard?tab=challenges&challenge=${navigationSource.challengeId}`,
      icon: <Trophy className="h-4 w-4 mr-1" />
    });
  } else if (navigationSource?.type === 'overview') {
    breadcrumbs.push({
      label: 'Обзор',
      path: '/trainer-dashboard?tab=overview'
    });
  } else if (navigationSource?.type === 'ai-hub') {
    breadcrumbs.push({
      label: 'AI Hub',
      path: '/trainer-dashboard?tab=ai-hub',
      icon: <Sparkles className="h-4 w-4 mr-1" />
    });
  }

  breadcrumbs.push({
    label: client.full_name || client.username
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <NavigationBreadcrumbs items={breadcrumbs} />

      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </div>
        
        {/* Actions Bar */}
        <div className="flex gap-2">
          <Button onClick={() => setShowGoalDialog(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Добавить цель
          </Button>
          <Button onClick={handleOpenAIHub} variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            Спросить AI
          </Button>
        </div>
      </div>

      {/* Challenge Context Alert */}
      {navigationSource?.type === 'challenges' && navigationSource.challengeId && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Клиент участвует в челлендже: <strong>{navigationSource.challengeName}</strong>
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/trainer-dashboard?tab=challenges&challenge=${navigationSource.challengeId}`)}
            >
              Вернуться к челленджу
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
            <div>
              <CardTitle className="text-2xl">{client.full_name || client.username}</CardTitle>
              <CardDescription>@{client.username}</CardDescription>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">{goals.length} целей</Badge>
                <Badge variant="outline">{measurements.length} измерений за месяц</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="goals" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="goals">Цели и прогресс</TabsTrigger>
          <TabsTrigger value="measurements">Измерения</TabsTrigger>
          <TabsTrigger value="health">Данные здоровья</TabsTrigger>
          <TabsTrigger value="ai-history">AI История ({aiHistory.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => (
              <Card key={goal.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{goal.goal_name}</CardTitle>
                    <Badge variant={goal.progress_percentage >= 100 ? "default" : "secondary"}>
                      {goal.progress_percentage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Progress value={goal.progress_percentage} className="h-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Текущее: {goal.current_value} {goal.target_unit}
                      </span>
                      <span className="text-muted-foreground">
                        Цель: {goal.target_value} {goal.target_unit}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="measurements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Последние измерения</CardTitle>
              <CardDescription>
                Данные за последние 30 дней
              </CardDescription>
            </CardHeader>
            <CardContent>
              {measurements.length > 0 ? (
                <div className="space-y-3">
                  {measurements.slice(0, 10).map((measurement) => (
                    <div key={measurement.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{measurement.goal_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(measurement.measurement_date), 'dd.MM.yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {measurement.value} {measurement.unit}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Нет измерений за последний месяц
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Шаги */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg">Шаги</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {healthData.filter(d => d.steps).length > 0 ? (
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
                        formatter={(value: any) => [value, 'Шаги']}
                      />
                      <Line type="monotone" dataKey="steps" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Нет данных</p>
                )}
              </CardContent>
            </Card>

            {/* Вес */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Weight className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-lg">Вес</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {healthData.filter(d => d.weight).length > 0 ? (
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
                        formatter={(value: any) => [value, 'кг']}
                      />
                      <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Нет данных</p>
                )}
              </CardContent>
            </Card>

            {/* Пульс */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  <CardTitle className="text-lg">Пульс</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {healthData.filter(d => d.heart_rate_avg).length > 0 ? (
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
                        formatter={(value: any) => [value, 'уд/мин']}
                      />
                      <Line type="monotone" dataKey="heart_rate_avg" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Нет данных</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI History Tab */}
        <TabsContent value="ai-history" className="space-y-4">
          {aiHistory.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет истории AI действий для этого клиента</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {aiHistory.map((log) => (
                <Card key={log.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={log.success ? "default" : "destructive"}>
                          {log.action_type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      {log.success ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Выполнено
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          Ошибка
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <pre className="text-sm bg-muted p-3 rounded overflow-auto">
                        {JSON.stringify(log.action_details, null, 2)}
                      </pre>
                      {log.error_message && (
                        <p className="text-sm text-destructive">{log.error_message}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Goal Creation Dialog */}
      <GoalCreateDialog
        open={showGoalDialog}
        onOpenChange={setShowGoalDialog}
        onGoalCreated={() => {
          loadClientData();
        }}
      />
      
      <TrainerAIAssistant />
    </div>
  );
}