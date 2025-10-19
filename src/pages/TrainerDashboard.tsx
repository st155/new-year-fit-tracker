import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Target, BarChart3, MessageSquare, Sparkles, Home, Trophy, TrendingUp } from "lucide-react";
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
import { AIQuickActionsPanel } from "@/components/trainer/AIQuickActionsPanel";
import { ClientsList } from "@/components/trainer/ClientsList";
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedClient, setSelectedClient } = useClientContext();
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'ai-hub');

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
        // Set navigation source based on tab
        const source = tab === 'ai-hub' ? { type: 'ai-hub' as const } : { type: 'clients' as const };
        setSelectedClient(client, source);
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

  const topNavItems = [
    { icon: Home, label: "Тренерский кабинет", color: "orange" },
    { icon: Trophy, label: "Челленджи", color: "green" },
    { icon: TrendingUp, label: "Мой прогресс", color: "blue" },
    { icon: Target, label: "Мои цели", color: "purple" },
  ];

  return (
    <div className="min-h-screen bg-trainer-bg pb-24">
      {/* Top Navigation */}
      <div className="px-4 py-6 bg-trainer-bg border-b border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="hidden md:flex gap-6 mb-6">
            {topNavItems.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div className={`
                  h-14 w-14 rounded-full flex items-center justify-center
                  ${item.color === 'orange' ? 'bg-trainer-orange/10 group-hover:bg-trainer-orange/20' : ''}
                  ${item.color === 'green' ? 'bg-trainer-green/10 group-hover:bg-trainer-green/20' : ''}
                  ${item.color === 'blue' ? 'bg-trainer-blue/10 group-hover:bg-trainer-blue/20' : ''}
                  ${item.color === 'purple' ? 'bg-purple-500/10 group-hover:bg-purple-500/20' : ''}
                  transition-all duration-300
                `}>
                  <item.icon className={`
                    h-6 w-6
                    ${item.color === 'orange' ? 'text-trainer-orange' : ''}
                    ${item.color === 'green' ? 'text-trainer-green' : ''}
                    ${item.color === 'blue' ? 'text-trainer-blue' : ''}
                    ${item.color === 'purple' ? 'text-purple-500' : ''}
                  `} />
                </div>
                <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-2">
            Тренерский Кабинет
          </h1>
          <p className="text-slate-400">
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
            <TabsList className="w-full overflow-x-auto flex flex-nowrap md:grid md:grid-cols-9 bg-slate-900/50 p-1.5 gap-1 rounded-xl border border-slate-800">
              <TabsTrigger 
                value="ai-hub" 
                className="gap-1 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                <Sparkles className="h-4 w-4" />
                AI Hub
              </TabsTrigger>
              <TabsTrigger 
                value="overview" 
                className="whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                Обзор
              </TabsTrigger>
              <TabsTrigger 
                value="clients" 
                className="whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                Клиенты
              </TabsTrigger>
              <TabsTrigger 
                value="challenges" 
                className="whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                Челленджи
              </TabsTrigger>
              <TabsTrigger 
                value="plans" 
                className="whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                Планы
              </TabsTrigger>
              <TabsTrigger 
                value="tasks" 
                className="whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                Задачи
              </TabsTrigger>
              <TabsTrigger 
                value="chat" 
                className="whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                Чат
              </TabsTrigger>
              <TabsTrigger 
                value="goals" 
                className="whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                Цели
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                Аналитика
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai-hub">
              <TrainerAIHub selectedClient={selectedClient} />
            </TabsContent>

            <TabsContent value="overview">
              <TrainerOverview onClientSelect={handleClientSelect} />
            </TabsContent>

            <TabsContent value="clients">
              <ClientsList 
                clients={clients as any}
                onSelectClient={(client) => handleClientSelect(client)}
                onAddClient={async (clientUserId) => {
                  await loadClients();
                }}
                onRefresh={() => loadClients()}
                loading={loading}
              />
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
          </Tabs>
        )}
      </div>
      
      <AIQuickActionsPanel />
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
