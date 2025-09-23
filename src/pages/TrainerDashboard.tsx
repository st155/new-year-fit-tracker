import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Target, TrendingUp, Calendar, Plus, Settings, MessageSquare, Mail, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { ClientGoalsManager } from "@/components/trainer/ClientGoalsManager";
import { ClientAnalytics } from "@/components/trainer/ClientAnalytics";
import { ClientsList } from "@/components/trainer/ClientsList";
import { TrainerPosts } from "@/components/trainer/TrainerPosts";
import { TrainerBroadcasts } from "@/components/trainer/TrainerBroadcasts";
import { TrainerAnalytics } from "@/components/trainer/TrainerAnalytics";

interface Client {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  assigned_at: string;
  active: boolean;
  goals_count?: number;
  last_measurement?: string;
}

export default function TrainerDashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTrainer, setIsTrainer] = useState(false);

  useEffect(() => {
    if (user) {
      checkTrainerRole();
      loadClients();
    }
  }, [user]);

  const checkTrainerRole = async () => {
    if (!user) return;

    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['trainer', 'admin']);

    if (!error && roles && roles.length > 0) {
      setIsTrainer(true);
    } else {
      // Проверяем старый способ
      const { data: profile } = await supabase
        .from('profiles')
        .select('trainer_role')
        .eq('user_id', user.id)
        .single();

      if (profile?.trainer_role) {
        setIsTrainer(true);
      }
    }
  };

  const loadClients = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: trainerClients, error } = await supabase
        .from('trainer_clients')
        .select(`
          id,
          client_id,
          assigned_at,
          active,
          profiles (
            user_id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('trainer_id', user.id)
        .eq('active', true);

      if (error) throw error;

      // Получаем дополнительную статистику для каждого клиента
      const clientsWithStats = await Promise.all(
        (trainerClients || []).map(async (tc: any) => {
          const profile = tc.profiles;
          
          // Подсчитываем количество целей
          const { count: goalsCount } = await supabase
            .from('goals')
            .select('*', { count: 'exact' })
            .eq('user_id', profile.user_id);

          // Получаем последнее измерение
          const { data: lastMeasurement } = await supabase
            .from('measurements')
            .select('measurement_date')
            .eq('user_id', profile.user_id)
            .order('measurement_date', { ascending: false })
            .limit(1)
            .single();

          return {
            id: tc.id,
            user_id: profile.user_id,
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            assigned_at: tc.assigned_at,
            active: tc.active,
            goals_count: goalsCount || 0,
            last_measurement: lastMeasurement?.measurement_date
          };
        })
      );

      setClients(clientsWithStats);
    } catch (error: any) {
      console.error('Error loading clients:', error);
      toast.error('Ошибка загрузки подопечных');
    } finally {
      setLoading(false);
    }
  };

  const addClient = async (clientUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('trainer_clients')
        .insert({
          trainer_id: user.id,
          client_id: clientUserId
        });

      if (error) throw error;

      toast.success('Подопечный добавлен');
      loadClients();
    } catch (error: any) {
      console.error('Error adding client:', error);
      toast.error('Ошибка добавления подопечного');
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Требуется авторизация</CardTitle>
            <CardDescription>Войдите в систему для доступа к панели тренера</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isTrainer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Доступ запрещен</CardTitle>
            <CardDescription>У вас нет прав тренера для доступа к этой странице</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Панель тренера</h1>
          <p className="text-muted-foreground">Управление подопечными и их прогрессом</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Тренер
        </Badge>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего подопечных</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных целей</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.reduce((sum, client) => sum + (client.goals_count || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Недавние измерения</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.filter(c => c.last_measurement && 
                new Date(c.last_measurement) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">за неделю</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients">Подопечные</TabsTrigger>
          <TabsTrigger value="goals">Управление целями</TabsTrigger>
          <TabsTrigger value="posts">Посты и задания</TabsTrigger>
          <TabsTrigger value="broadcasts">Email-рассылки</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <ClientsList 
            clients={clients}
            onSelectClient={setSelectedClient}
            onAddClient={addClient}
            onRefresh={loadClients}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="goals">
          <ClientGoalsManager 
            clients={clients}
            selectedClient={selectedClient}
            onSelectClient={setSelectedClient}
          />
        </TabsContent>

        <TabsContent value="posts">
          <TrainerPosts />
        </TabsContent>

        <TabsContent value="broadcasts">
          <TrainerBroadcasts />
        </TabsContent>

        <TabsContent value="analytics">
          <TrainerAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}