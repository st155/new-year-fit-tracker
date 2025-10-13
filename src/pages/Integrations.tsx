import { TerraIntegration } from '@/components/integrations/TerraIntegration';

export default function IntegrationsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Интеграции</h1>
        <p className="text-muted-foreground mt-2">
          Подключите ваши фитнес-устройства и приложения для автоматической синхронизации данных
        </p>
      </div>

      <TerraIntegration />
    </div>
  );
}
