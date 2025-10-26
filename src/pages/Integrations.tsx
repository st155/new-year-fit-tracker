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
import { useToast } from '@/hooks/use-toast';

export default function IntegrationsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [diagnosticData, setDiagnosticData] = useState<any[]>([]);
  const { user } = useAuth();

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

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
              {diagnosticData.map((token, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant={token.is_active ? "success" : "outline"}>
                      {token.provider}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      terra_user_id: {token.terra_user_id || 'null (ожидание)'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {token.last_sync_date 
                      ? `Синхронизация: ${new Date(token.last_sync_date).toLocaleString('ru-RU')}`
                      : 'Не синхронизировано'}
                  </div>
                </div>
              ))}
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
