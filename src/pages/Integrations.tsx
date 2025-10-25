import { TerraIntegration } from '@/components/integrations/TerraIntegration';
import { IntegrationsDataDisplay } from '@/components/integrations/IntegrationsDataDisplay';
import { UnifiedMetricsView } from '@/components/integrations/UnifiedMetricsView';
import { TerraHealthMonitor } from '@/components/integrations/TerraHealthMonitor';
import { SystemHealthIndicator } from '@/components/integrations/SystemHealthIndicator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function IntegrationsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Интеграции</h1>
          <p className="text-muted-foreground mt-2">
            Подключите ваши фитнес-устройства и приложения для автоматической синхронизации данных
          </p>
        </div>
        <SystemHealthIndicator />
      </div>

      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="unified">Обзор</TabsTrigger>
          <TabsTrigger value="connections">Подключения</TabsTrigger>
          <TabsTrigger value="health">Мониторинг</TabsTrigger>
          <TabsTrigger value="data">По устройствам</TabsTrigger>
        </TabsList>
        
        <TabsContent value="unified" className="mt-6">
          <UnifiedMetricsView />
        </TabsContent>
        
        <TabsContent value="connections" className="mt-6 space-y-6">
          <TerraIntegration />
        </TabsContent>
        
        <TabsContent value="health" className="mt-6">
          <TerraHealthMonitor />
        </TabsContent>
        
        <TabsContent value="data" className="mt-6">
          <IntegrationsDataDisplay />
        </TabsContent>
      </Tabs>
    </div>
  );
}
