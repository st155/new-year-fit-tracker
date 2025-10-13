import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WhoopIntegration } from '@/components/integrations/WhoopIntegration';
import { IntegrationsDataDisplay } from '@/components/integrations/IntegrationsDataDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function IntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const handleWhoopCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        toast({
          title: 'Ошибка авторизации',
          description: 'Не удалось подключить Whoop',
          variant: 'destructive',
        });
        setSearchParams({});
        return;
      }

      if (code && state && user && state === user.id) {
        try {
          const { error: exchangeError } = await supabase.functions.invoke('whoop-integration', {
            body: { action: 'exchange-code', code },
          });

          if (exchangeError) throw exchangeError;

          toast({
            title: 'Whoop подключен',
            description: 'Устройство успешно подключено',
          });

          setSearchParams({});
          window.location.reload();
        } catch (error: any) {
          console.error('Whoop callback error:', error);
          toast({
            title: 'Ошибка',
            description: error.message,
            variant: 'destructive',
          });
          setSearchParams({});
        }
      }
    };

    handleWhoopCallback();
  }, [searchParams, user]);

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
        
        <TabsContent value="connections" className="mt-6">
          <WhoopIntegration />
        </TabsContent>
        
        <TabsContent value="data" className="mt-6">
          <IntegrationsDataDisplay />
        </TabsContent>
      </Tabs>
    </div>
  );
}
