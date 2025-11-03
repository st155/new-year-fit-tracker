import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageLoader } from '@/components/ui/page-loader';
import { Button } from '@/components/ui/button';

export function TerraWidgetLoader() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const provider = searchParams.get('provider');

  useEffect(() => {
    const loadWidget = async () => {
      try {
        console.log('🔄 Loading Terra widget for provider:', provider);
        
        const { data, error } = await supabase.functions.invoke('terra-integration', {
          body: { action: 'generate-widget-session' },
        });

        if (error) {
          console.error('❌ Terra widget error:', error);
          throw error;
        }
        
        if (!data?.url) {
          console.error('❌ No widget URL received:', data);
          throw new Error('No widget URL received');
        }

        console.log('✅ Redirecting to Terra widget:', data.url);
        // Redirect to Terra widget
        window.location.replace(data.url);
      } catch (err: any) {
        console.error('❌ Widget load error:', err);
        setError(err.message || 'Failed to load Terra widget');
      }
    };

    loadWidget();
  }, [provider]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-6 max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold mb-2">Ошибка загрузки</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.close()}>
            Закрыть окно
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageLoader 
      size="lg" 
      message={provider ? `Подключение ${provider}...` : 'Загружаем Terra Widget...'}
    />
  );
}
