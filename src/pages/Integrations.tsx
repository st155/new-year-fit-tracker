import { useState, useCallback, useEffect } from 'react';
import { TerraIntegration } from '@/components/integrations/TerraIntegration';
import { IntegrationsDataDisplay } from '@/components/integrations/IntegrationsDataDisplay';
import { UnifiedMetricsView } from '@/components/integrations/UnifiedMetricsView';
import { TerraHealthMonitor } from '@/components/integrations/TerraHealthMonitor';
import { SystemHealthIndicator } from '@/components/integrations/SystemHealthIndicator';
import { AutoRefreshToggle } from '@/components/integrations/AutoRefreshToggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Zap, X, ArrowRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Helper to format relative time
const getRelativeTime = (date: string | null): { text: string; color: string } => {
  if (!date) return { text: 'Никогда', color: 'text-red-500' };
  
  const now = new Date();
  const syncDate = new Date(date);
  const diffMs = now.getTime() - syncDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  let text = '';
  let color = 'text-green-600';
  
  if (diffHours < 1) {
    text = 'менее часа назад';
    color = 'text-green-600';
  } else if (diffHours < 24) {
    text = `${diffHours}ч назад`;
    color = 'text-yellow-600';
  } else if (diffDays === 1) {
    text = 'вчера';
    color = 'text-orange-600';
  } else {
    text = `${diffDays}д назад`;
    color = 'text-red-600';
  }
  
  return { text, color };
};

export default function IntegrationsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [diagnosticData, setDiagnosticData] = useState<any[]>([]);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const [showOnboardingHint, setShowOnboardingHint] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Показать подсказку онбординга для новых пользователей
  useEffect(() => {
    if (isOnboarding && user) {
      setShowOnboardingHint(true);
    }
  }, [isOnboarding, user]);

  const handleCompleteOnboarding = () => {
    if (user) {
      localStorage.setItem(`onboarding_flow_completed_${user.id}`, 'true');
      localStorage.removeItem(`new_user_${user.id}`);
      navigate('/');
    }
  };

  const handleSkipIntegrations = () => {
    setShowOnboardingHint(false);
    handleCompleteOnboarding();
  };

  // Load diagnostic data (terra_tokens for current user)
  useEffect(() => {
    if (!user) return;

    const loadDiagnostics = async () => {
      const { data, error } = await supabase
        .from('terra_tokens')
        .select('provider, terra_user_id, last_sync_date, is_active, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setDiagnosticData(data);
      }
    };

    loadDiagnostics();
  }, [user, refreshKey]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Onboarding Banner */}
      {showOnboardingHint && (
        <Alert className="border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10">
          <Zap className="h-5 w-5 text-primary" />
          <div className="flex items-start justify-between flex-1">
            <div className="flex-1">
              <AlertTitle className="text-lg font-semibold mb-1">
                Подключите ваше фитнес-устройство
              </AlertTitle>
              <AlertDescription className="text-base">
                Автоматический трекинг поможет вам достигать целей быстрее. 
                Подключите Whoop, Garmin, Withings или другие устройства для синхронизации данных.
              </AlertDescription>
              <div className="flex items-center gap-3 mt-4">
                <Button 
                  onClick={() => setShowOnboardingHint(false)}
                  className="gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Подключить сейчас
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleSkipIntegrations}
                  className="gap-2"
                >
                  Пропустить
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 ml-4"
              onClick={handleSkipIntegrations}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Интеграции</h1>
          <p className="text-muted-foreground mt-2">
            Подключите ваши фитнес-устройства и приложения для автоматической синхронизации данных
          </p>
        </div>
        <div className="flex items-center gap-4">
          <AutoRefreshToggle onRefresh={handleRefresh} />
          <SystemHealthIndicator />
        </div>
      </div>

      {/* Diagnostic Panel */}
      {diagnosticData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Диагностика Terra</CardTitle>
            <CardDescription>Статус подключений к Terra API</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {diagnosticData.map((token, idx) => {
                const relativeTime = getRelativeTime(token.last_sync_date);
                const shortId = token.terra_user_id 
                  ? token.terra_user_id.substring(0, 8) + '...' 
                  : 'null';
                
                return (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant={token.is_active ? "default" : "outline"}>
                        {token.provider}
                      </Badge>
                      <div className="flex flex-col gap-1">
                        <span 
                          className="text-xs font-mono text-muted-foreground cursor-help" 
                          title={token.terra_user_id || 'Ожидание подключения'}
                        >
                          ID: {shortId}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className={`text-xs font-medium ${relativeTime.color}`}>
                            {relativeTime.text}
                          </span>
                          {token.last_sync_date && (
                            <span 
                              className="text-xs text-muted-foreground cursor-help"
                              title={new Date(token.last_sync_date).toLocaleString('ru-RU')}
                            >
                              ({new Date(token.last_sync_date).toLocaleDateString('ru-RU')})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="unified">Обзор</TabsTrigger>
          <TabsTrigger value="connections">Подключения</TabsTrigger>
          <TabsTrigger value="health">Мониторинг</TabsTrigger>
          <TabsTrigger value="data">По устройствам</TabsTrigger>
        </TabsList>
        
        <TabsContent value="unified" className="mt-6">
          <UnifiedMetricsView key={`unified-${refreshKey}`} />
        </TabsContent>
        
        <TabsContent value="connections" className="mt-6 space-y-6">
          <TerraIntegration key={`connections-${refreshKey}`} />
        </TabsContent>
        
        <TabsContent value="health" className="mt-6">
          <TerraHealthMonitor key={`health-${refreshKey}`} />
        </TabsContent>
        
        <TabsContent value="data" className="mt-6">
          <IntegrationsDataDisplay key={`data-${refreshKey}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
