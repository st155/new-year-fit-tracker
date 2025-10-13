import { WhoopIntegration } from '@/components/integrations/WhoopIntegration';
import { TerraIntegration } from '@/components/integrations/TerraIntegration';
import { IntegrationsDataDisplay } from '@/components/integrations/IntegrationsDataDisplay';
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connections">Подключения</TabsTrigger>
          <TabsTrigger value="data">Данные устройств</TabsTrigger>
        </TabsList>
        
        <TabsContent value="connections" className="mt-6 space-y-6">
          <WhoopIntegration />
          <TerraIntegration />
        </TabsContent>
        
        <TabsContent value="data" className="mt-6">
          <IntegrationsDataDisplay />
        </TabsContent>
      </Tabs>
    </div>
  );
}
