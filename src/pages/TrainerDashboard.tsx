import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Target, BarChart3, MessageSquare, Sparkles, Home, Trophy, TrendingUp } from "lucide-react";
import { NavigationBreadcrumbs, Breadcrumb } from "@/components/navigation/NavigationBreadcrumbs";
import { GlobalClientSearch } from "@/components/trainer/GlobalClientSearch";
import { NotificationBell } from "@/components/notifications/NotificationBell";
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
import { ClientAliasesManager } from "@/components/trainer/ClientAliasesManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/page-loader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
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
  const { role, isTrainer, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedClient, setSelectedClient } = useClientContext();
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'ai-hub');
  const [previousTab, setPreviousTab] = useState<string>('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Check trainer role and redirect if not a trainer
  useEffect(() => {
    if (!roleLoading && !isTrainer) {
      console.log('🚫 Trainer access denied:', { 
        userId: user?.id, 
        role, 
        isTrainer 
      });
      toast.error('Доступ запрещен. Активируйте тренерскую роль в профиле.');
      navigate('/profile', { replace: true });
    }
  }, [isTrainer, roleLoading, navigate, user?.id, role]);

  useEffect(() => {
    loadClients();
  }, [user]);

  // Handle URL parameters for client selection and plan selection
  useEffect(() => {
    const clientId = searchParams.get('client');
    const planId = searchParams.get('plan');
    const tab = searchParams.get('tab');
    
    if (tab) {
      setActiveTab(tab);
    }
    
    // Handle plan parameter for direct navigation to plan details
    if (planId && tab === 'plans') {
      setSelectedPlanId(planId);
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

      // Get all client user IDs
      const clientUserIds = (data || []).map((tc: any) => tc.profiles.user_id);
      
      // Fetch goals count for all clients in one query
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('user_id')
        .in('user_id', clientUserIds);
      
      if (goalsError) throw goalsError;
      
      // Count goals for each client
      const goalsCountMap = (goalsData || []).reduce((acc: Record<string, number>, goal: any) => {
        acc[goal.user_id] = (acc[goal.user_id] || 0) + 1;
        return acc;
      }, {});

      const formattedClients: TrainerClient[] = (data || []).map((tc: any) => ({
        id: tc.id,
        user_id: tc.profiles.user_id,
        username: tc.profiles.username || '',
        full_name: tc.profiles.full_name || '',
        avatar_url: tc.profiles.avatar_url,
        assigned_at: tc.assigned_at,
        active: tc.active,
        goals_count: goalsCountMap[tc.profiles.user_id] || 0
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
    setPreviousTab(activeTab);
    setSelectedClient(client as TrainerClient, source as any);
    setSearchParams({ tab: 'clients', client: client.user_id });
  };

  const handleBackToList = () => {
    setSelectedClient(null);
    const returnTab = previousTab || 'overview';
    setSearchParams({ tab: returnTab });
    setActiveTab(returnTab);
    setPreviousTab('');
  };

  // Show loading state while checking role
  if (roleLoading) {
    return <PageLoader message="Проверка доступа..." />;
  }

  // Don't render if not a trainer (will redirect)
  if (!isTrainer) {
    return null;
  }

  // Build breadcrumbs
  const breadcrumbs: Breadcrumb[] = [
    { label: 'Главная', path: '/', icon: <Home className="h-4 w-4" /> }
  ];

  const tabIcons: Record<string, JSX.Element> = {
    'ai-hub': <Sparkles className="h-4 w-4" />,
    'overview': <Home className="h-4 w-4" />,
    'clients': <Users className="h-4 w-4" />,
    'challenges': <Trophy className="h-4 w-4" />,
    'plans': <TrendingUp className="h-4 w-4" />,
    'tasks': <Target className="h-4 w-4" />,
    'chat': <MessageSquare className="h-4 w-4" />,
    'goals': <Target className="h-4 w-4" />,
    'analytics': <BarChart3 className="h-4 w-4" />,
  };

  const tabLabels: Record<string, string> = {
    'ai-hub': 'AI Ассистент',
    'overview': 'Обзор',
    'clients': 'Клиенты',
    'challenges': 'Челленджи',
    'plans': 'Планы',
    'tasks': 'Задачи',
    'chat': 'Чат',
    'goals': 'Цели',
    'analytics': 'Аналитика',
  };

  if (!selectedClient) {
    breadcrumbs.push({
      label: tabLabels[activeTab] || 'Тренер',
      icon: tabIcons[activeTab],
    });
  } else {
    if (previousTab) {
      breadcrumbs.push({
        label: tabLabels[previousTab] || 'Тренер',
        icon: tabIcons[previousTab],
      });
    }
    breadcrumbs.push({
      label: selectedClient.full_name || selectedClient.username,
      icon: <Users className="h-4 w-4" />,
    });
  }

  return (
    <div className="min-h-screen bg-trainer-bg pb-24">
      <div className="px-4 max-w-7xl mx-auto mt-6">
        <div className="flex items-center justify-between mb-4">
          <NavigationBreadcrumbs items={breadcrumbs} />
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>
        
        <GlobalClientSearch open={searchOpen} onOpenChange={setSearchOpen} />
        
        {selectedClient && activeTab !== 'ai-hub' ? (
          <ClientDetailView 
            client={selectedClient} 
            onBack={handleBackToList} 
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full overflow-x-auto flex flex-nowrap md:grid md:grid-cols-10 bg-slate-900/50 p-1.5 gap-1 rounded-xl border border-slate-800">
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
              <TabsTrigger 
                value="aliases" 
                className="whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                Псевдонимы
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
                  try {
                    if (!user) return;
                    
                    const { error } = await supabase
                      .from('trainer_clients')
                      .insert({
                        trainer_id: user.id,
                        client_id: clientUserId,
                        active: true
                      });
                    
                    if (error) throw error;
                    
                    await loadClients();
                  } catch (error: any) {
                    console.error('Error adding client:', error);
                    throw error;
                  }
                }}
                onRefresh={() => loadClients()}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="challenges">
              <TrainerChallengesManager />
            </TabsContent>

            <TabsContent value="plans">
              <TrainingPlansList initialPlanId={selectedPlanId} />
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

            <TabsContent value="aliases">
              <ClientAliasesManager />
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
