import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Target, BarChart3, MessageSquare } from "lucide-react";
import { TrainerOverview } from "@/components/trainer/TrainerOverview";
import { ClientGoalsManager } from "@/components/trainer/ClientGoalsManager";
import { TrainerAnalytics } from "@/components/trainer/TrainerAnalytics";
import { ClientDetailView } from "@/components/trainer/ClientDetailView";
import { TrainerAIAssistant } from "@/components/trainer/TrainerAIAssistant";
import { TrainingPlansList } from "@/components/trainer/TrainingPlansList";
import { ClientTasksManager } from "@/components/trainer/ClientTasksManager";
import { TrainerChat } from "@/components/trainer/TrainerChat";
import { TrainerChallengesManager } from "@/components/trainer/TrainerChallengesManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface TrainerClient {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  assigned_at: string;
  active: boolean;
  goals_count?: number;
}

export default function TrainerDashboard() {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState<TrainerClient | null>(null);
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, [user]);

  const loadClients = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trainer_clients')
        .select(`
          id,
          client_id,
          assigned_at,
          active,
          profiles!trainer_clients_client_id_fkey (
            user_id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('trainer_id', user.id)
        .eq('active', true);

      if (error) throw error;

      const formattedClients: TrainerClient[] = (data || []).map((tc: any) => ({
        id: tc.id,
        user_id: tc.profiles.user_id,
        username: tc.profiles.username || '',
        full_name: tc.profiles.full_name || '',
        avatar_url: tc.profiles.avatar_url,
        assigned_at: tc.assigned_at,
        active: tc.active
      }));

      setClients(formattedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Ошибка загрузки клиентов');
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (client: any) => {
    setSelectedClient(client as TrainerClient);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 py-6 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border-b border-border/50">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Тренерский Кабинет
          </h1>
          <p className="text-muted-foreground">
            Управление клиентами, целями и аналитика
          </p>
        </div>
      </div>

      <div className="px-4 max-w-7xl mx-auto mt-6">
        {selectedClient ? (
          <ClientDetailView 
            client={selectedClient} 
            onBack={() => setSelectedClient(null)} 
          />
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-8 bg-muted/50 p-1">
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="clients">Клиенты</TabsTrigger>
              <TabsTrigger value="challenges">Челленджи</TabsTrigger>
              <TabsTrigger value="plans">Планы</TabsTrigger>
              <TabsTrigger value="tasks">Задачи</TabsTrigger>
              <TabsTrigger value="chat">Чат</TabsTrigger>
              <TabsTrigger value="goals">Цели</TabsTrigger>
              <TabsTrigger value="analytics">Аналитика</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <TrainerOverview onClientSelect={handleClientSelect} />
            </TabsContent>

            <TabsContent value="clients">
              <Card>
                <CardHeader>
                  <CardTitle>Мои клиенты</CardTitle>
                  <CardDescription>Список активных подопечных</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
                  ) : clients.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      У вас пока нет клиентов
                    </p>
                  ) : (
                    <div className="grid gap-4">
                      {clients.map((client) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => handleClientSelect(client)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={client.avatar_url} />
                              <AvatarFallback>
                                {client.full_name?.substring(0, 2).toUpperCase() || 'CL'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{client.full_name || client.username}</p>
                              <p className="text-sm text-muted-foreground">@{client.username}</p>
                            </div>
                          </div>
                          <Badge variant="outline">Активен</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="challenges">
              <TrainerChallengesManager />
            </TabsContent>

            <TabsContent value="plans">
              <TrainingPlansList />
            </TabsContent>

            <TabsContent value="tasks">
              <ClientTasksManager />
            </TabsContent>

            <TabsContent value="chat">
              <TrainerChat />
            </TabsContent>

            <TabsContent value="goals">
              <ClientGoalsManager 
                clients={clients}
                selectedClient={selectedClient}
                onSelectClient={setSelectedClient}
              />
            </TabsContent>

            <TabsContent value="analytics">
              <TrainerAnalytics />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <TrainerAIAssistant />
    </div>
  );
}
