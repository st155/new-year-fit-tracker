import { WhoopIntegration } from '@/components/integrations/WhoopIntegration';
import { TerraIntegration } from '@/components/integrations/TerraIntegration';
import { IntegrationsDataDisplay } from '@/components/integrations/IntegrationsDataDisplay';
import { MetricsComparison } from '@/components/integrations/MetricsComparison';
import { SourcePrioritySettings } from '@/components/integrations/SourcePrioritySettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function IntegrationsPage() {

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Интеграции</h1>
        <p className="text-muted-foreground mt-2">
          Подключите ваши фитнес-устройства и приложения для автоматической синхронизации данных
        </p>
      </div>

      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connections">Подключения</TabsTrigger>
          <TabsTrigger value="data">Данные устройств</TabsTrigger>
          <TabsTrigger value="comparison">Сравнение</TabsTrigger>
          <TabsTrigger value="settings">Приоритет</TabsTrigger>
        </TabsList>
        
        <TabsContent value="connections" className="mt-6 space-y-6">
          <WhoopIntegration />
          <TerraIntegration />
        </TabsContent>
        
        <TabsContent value="data" className="mt-6">
          <IntegrationsDataDisplay />
        </TabsContent>
        
        <TabsContent value="comparison" className="mt-6">
          <MetricsComparison />
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6">
          <SourcePrioritySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
