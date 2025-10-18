import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Target, BarChart3, MessageSquare, Sparkles } from "lucide-react";
import { ClientContextProvider, useClientContext } from "@/contexts/ClientContext";
import { TrainerOverview } from "@/components/trainer/TrainerOverview";
import { ClientGoalsManager } from "@/components/trainer/ClientGoalsManager";
import { TrainerAnalytics } from "@/components/trainer/TrainerAnalytics";
import { ClientDetailView } from "@/components/trainer/ClientDetailView";
import { TrainerAIHub } from "@/components/trainer/TrainerAIHub";
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

function TrainerDashboardContent() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedClient, setSelectedClient } = useClientContext();
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

  useEffect(() => {
    loadClients();
  }, [user]);

  // Handle URL parameters for client selection
  useEffect(() => {
    const clientId = searchParams.get('client');
    const tab = searchParams.get('tab');
    
    if (tab) {
      setActiveTab(tab);
    }
    
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.user_id === clientId);
      if (client) {
        setSelectedClient(client, { type: 'clients' });
      }
    }
  }, [searchParams, clients]);

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

  const handleClientSelect = (client: any, source?: { type: string; challengeId?: string; challengeName?: string }) => {
    setSelectedClient(client as TrainerClient, source as any);
    setSearchParams({ tab: 'clients', client: client.user_id });
  };

  const handleBackToList = () => {
    setSelectedClient(null);
    const currentTab = searchParams.get('tab') || 'overview';
    setSearchParams({ tab: currentTab });
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
        {selectedClient && activeTab !== 'ai-hub' ? (
          <ClientDetailView 
            client={selectedClient} 
            onBack={handleBackToList} 
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full overflow-x-auto flex flex-nowrap md:grid md:grid-cols-9 bg-muted/50 p-1 gap-1">
              <TabsTrigger value="overview" className="whitespace-nowrap flex-shrink-0">Обзор</TabsTrigger>
              <TabsTrigger value="clients" className="whitespace-nowrap flex-shrink-0">Клиенты</TabsTrigger>
              <TabsTrigger value="challenges" className="whitespace-nowrap flex-shrink-0">Челленджи</TabsTrigger>
              <TabsTrigger value="plans" className="whitespace-nowrap flex-shrink-0">Планы</TabsTrigger>
              <TabsTrigger value="tasks" className="whitespace-nowrap flex-shrink-0">Задачи</TabsTrigger>
              <TabsTrigger value="chat" className="whitespace-nowrap flex-shrink-0">Чат</TabsTrigger>
              <TabsTrigger value="goals" className="whitespace-nowrap flex-shrink-0">Цели</TabsTrigger>
              <TabsTrigger value="analytics" className="whitespace-nowrap flex-shrink-0">Аналитика</TabsTrigger>
              <TabsTrigger value="ai-hub" className="gap-1 whitespace-nowrap flex-shrink-0">
                <Sparkles className="h-4 w-4" />
                AI Hub
              </TabsTrigger>
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
                selectedClient={selectedClient as any}
                onSelectClient={(client) => setSelectedClient(client, { type: 'goals' })}
              />
            </TabsContent>

            <TabsContent value="analytics">
              <TrainerAnalytics />
            </TabsContent>

            <TabsContent value="ai-hub">
              <TrainerAIHub selectedClient={selectedClient} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

export default function TrainerDashboard() {
  return (
    <ClientContextProvider>
      <TrainerDashboardContent />
    </ClientContextProvider>
  );
}
