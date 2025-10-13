import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TerraIntegration } from '@/components/integrations/TerraIntegration';
import { WithingsIntegration } from '@/components/integrations/WithingsIntegration';
import { AppleHealthIntegration } from '@/components/integrations/AppleHealthIntegration';
import { Activity, Scale, Smartphone } from 'lucide-react';

export default function IntegrationsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Интеграции</h1>
        <p className="text-muted-foreground mt-2">
          Подключите ваши фитнес-устройства и приложения для автоматической синхронизации данных
        </p>
      </div>

      <Tabs defaultValue="terra" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="terra" className="gap-2">
            <Activity className="h-4 w-4" />
            Фитнес-трекеры
          </TabsTrigger>
          <TabsTrigger value="withings" className="gap-2">
            <Scale className="h-4 w-4" />
            Withings
          </TabsTrigger>
          <TabsTrigger value="apple" className="gap-2">
            <Smartphone className="h-4 w-4" />
            Apple Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="terra" className="mt-6">
          <TerraIntegration />
        </TabsContent>

        <TabsContent value="withings" className="mt-6">
          <WithingsIntegration />
        </TabsContent>

        <TabsContent value="apple" className="mt-6">
          <AppleHealthIntegration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
