import { useEffect } from 'react';
import { WhoopIntegration } from '@/components/integrations/WhoopIntegration';
import { TerraIntegration } from '@/components/integrations/TerraIntegration';
import { IntegrationsDataDisplay } from '@/components/integrations/IntegrationsDataDisplay';
import { UnifiedMetricsView } from '@/components/integrations/UnifiedMetricsView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function IntegrationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Background health check on page load
  useEffect(() => {
    const checkTokensHealth = async () => {
      if (!user) return;
      
      const { data: whoopToken } = await supabase
        .from('whoop_tokens')
        .select('is_active, expires_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (whoopToken) {
        const expiresAt = new Date(whoopToken.expires_at);
        const now = new Date();
        
        if (expiresAt < now) {
          console.log('⚠️ Whoop token expired, user should reconnect');
          toast({
            title: 'Whoop требует переподключения',
            description: 'Ваш токен Whoop истёк. Переподключите для продолжения синхронизации.',
            variant: 'destructive',
          });
        }
      }
    };
    
    checkTokensHealth();
  }, [user]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Интеграции</h1>
        <p className="text-muted-foreground mt-2">
          Подключите ваши фитнес-устройства и приложения для автоматической синхронизации данных
        </p>
      </div>

      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="unified">Обзор</TabsTrigger>
          <TabsTrigger value="connections">Подключения</TabsTrigger>
          <TabsTrigger value="data">По устройствам</TabsTrigger>
        </TabsList>
        
        <TabsContent value="unified" className="mt-6">
          <UnifiedMetricsView />
        </TabsContent>
        
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
