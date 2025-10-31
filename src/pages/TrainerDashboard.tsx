import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Target, BarChart3, Sparkles, Home, Trophy, TrendingUp, Calendar, Settings } from "lucide-react";
import { NavigationBreadcrumbs, Breadcrumb } from "@/components/navigation/NavigationBreadcrumbs";
import { GlobalClientSearch } from "@/components/trainer/GlobalClientSearch";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ClientContextProvider, useClientContext } from "@/contexts/ClientContext";
import { TrainerAnalytics } from "@/components/trainer/TrainerAnalytics";
import { ClientDetailView } from "@/components/trainer/ClientDetailView";
import { AIDrawer } from "@/components/trainer/ai";
import { TrainingPlansList } from "@/components/trainer/TrainingPlansList";
import { TrainerChallengesManager } from "@/components/trainer/TrainerChallengesManager";
import { ClientsList } from "@/components/trainer/ClientsList";
import { TrainerCalendar } from "@/components/trainer/calendar/TrainerCalendar";
import { TrainerSettings } from "@/components/trainer/settings/TrainerSettings";
import { Button } from "@/components/ui/button";
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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedClient, setSelectedClient } = useClientContext();
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'clients');
  const [previousTab, setPreviousTab] = useState<string>('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  console.log('👔 [TrainerDashboard] Render', {
    timestamp: new Date().toISOString(),
    pathname: location.pathname,
    userId: user?.id,
    role,
    isTrainer,
    roleLoading,
    clientsCount: clients.length,
    activeTab
  });

  // Check trainer role and redirect if not a trainer
  useEffect(() => {
    console.log('🔐 [TrainerDashboard] Access check effect', {
      roleLoading,
      isTrainer,
      role
    });

    if (!roleLoading && !isTrainer) {
      console.error('🚫 [TrainerDashboard] ACCESS DENIED', { 
        userId: user?.id,
        email: user?.email,
        role, 
        isTrainer,
        redirectingTo: '/profile'
      });
      toast.error('Доступ запрещен. Активируйте тренерскую роль в профиле.');
      navigate('/profile', { replace: true });
    } else if (!roleLoading && isTrainer) {
      console.log('✅ [TrainerDashboard] Access granted');
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
        setSelectedClient(client, { type: 'clients' as const });
      }
    }
  }, [searchParams, clients]);

  const loadClients = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Используем RPC вместо JOIN через foreign key для обхода проблем с RLS
      const { data, error } = await supabase
        .rpc('get_trainer_clients_summary', { p_trainer_id: user.id });

      if (error) throw error;

      const formattedClients: TrainerClient[] = (data || []).map((tc: any) => ({
        id: tc.client_id, // используем client_id как id
        user_id: tc.client_id,
        username: tc.username || '',
        full_name: tc.full_name || '',
        avatar_url: tc.avatar_url,
        assigned_at: new Date().toISOString(), // RPC не возвращает assigned_at
        active: true,
        goals_count: tc.active_goals_count || 0
      }));

      console.log('✅ [TrainerDashboard] Loaded clients:', formattedClients.length);
      setClients(formattedClients);
    } catch (error) {
      console.error('❌ [TrainerDashboard] Error loading clients:', error);
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
    const returnTab = previousTab || 'clients';
    setSearchParams({ tab: returnTab });
    setActiveTab(returnTab);
    setPreviousTab('');
  };

  // Show loading state while checking role
  if (roleLoading) {
    console.log('⏳ [TrainerDashboard] Loading role');
    return <PageLoader message="Проверка доступа тренера..." />;
  }

  // Don't render if not a trainer (will redirect)
  if (!isTrainer) {
    console.log('🚫 [TrainerDashboard] Not a trainer, rendering null during redirect');
    return null;
  }

  console.log('✅ [TrainerDashboard] Rendering trainer dashboard');

  // Build breadcrumbs
  const breadcrumbs: Breadcrumb[] = [
    { label: 'Главная', path: '/', icon: <Home className="h-4 w-4" /> }
  ];

  const tabIcons: Record<string, JSX.Element> = {
    'clients': <Users className="h-4 w-4" />,
    'plans': <TrendingUp className="h-4 w-4" />,
    'calendar': <Calendar className="h-4 w-4" />,
    'challenges': <Trophy className="h-4 w-4" />,
    'analytics': <BarChart3 className="h-4 w-4" />,
    'settings': <Settings className="h-4 w-4" />,
  };

  const tabLabels: Record<string, string> = {
    'clients': 'Клиенты',
    'plans': 'Планы',
    'calendar': 'Календарь',
    'challenges': 'Челленджи',
    'analytics': 'Аналитика',
    'settings': 'Настройки',
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
            <Button
              onClick={() => setAiDrawerOpen(true)}
              className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25"
            >
              <Sparkles className="h-4 w-4" />
              AI Assistant
            </Button>
            <NotificationBell />
          </div>
        </div>
        
        <GlobalClientSearch open={searchOpen} onOpenChange={setSearchOpen} />
        <AIDrawer 
          open={aiDrawerOpen} 
          onOpenChange={setAiDrawerOpen}
          selectedClient={selectedClient}
        />
        
        {selectedClient ? (
          <ClientDetailView 
            client={selectedClient} 
            onBack={handleBackToList} 
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full overflow-x-auto flex flex-nowrap md:grid md:grid-cols-6 bg-slate-900/50 p-1.5 gap-1 rounded-xl border border-slate-800">
              <TabsTrigger 
                value="clients" 
                className="gap-1 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                <Users className="h-4 w-4" />
                Клиенты
              </TabsTrigger>
              <TabsTrigger 
                value="plans" 
                className="gap-1 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                <TrendingUp className="h-4 w-4" />
                Планы
              </TabsTrigger>
              <TabsTrigger 
                value="calendar" 
                className="gap-1 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                <Calendar className="h-4 w-4" />
                Календарь
              </TabsTrigger>
              <TabsTrigger 
                value="challenges" 
                className="gap-1 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                <Trophy className="h-4 w-4" />
                Челленджи
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="gap-1 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                <BarChart3 className="h-4 w-4" />
                Аналитика
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="gap-1 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg transition-all"
              >
                <Settings className="h-4 w-4" />
                Настройки
              </TabsTrigger>
            </TabsList>

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

            <TabsContent value="calendar">
              <TrainerCalendar />
            </TabsContent>

            <TabsContent value="analytics">
              <TrainerAnalytics />
            </TabsContent>

            <TabsContent value="settings">
              <TrainerSettings />
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
