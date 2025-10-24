import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, AlertCircle, CheckCircle, Clock, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface TerraProviderDiagnosticsProps {
  provider: string;
  terraUserId?: string;
  lastSync?: string | null;
  onSyncRequest?: () => void;
}

export function TerraProviderDiagnostics({ 
  provider, 
  terraUserId, 
  lastSync,
  onSyncRequest 
}: TerraProviderDiagnosticsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const { toast } = useToast();

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching diagnostics for', provider);
      
      const { data, error } = await supabase.functions.invoke('terra-diagnostics', {
        body: { provider },
      });

      if (error) throw error;

      console.log('✅ Diagnostics received:', data);
      setDiagnostics(data);
      
      toast({
        title: 'Диагностика завершена',
        description: `Проверено данных за ${data.date_range?.start} - ${data.date_range?.end}`,
      });
    } catch (error: any) {
      console.error('❌ Diagnostics error:', error);
      toast({
        title: 'Ошибка диагностики',
        description: error.message || 'Не удалось получить данные',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!diagnostics) return;
    
    const text = `
📊 Диагностика Terra API - ${provider}
Terra User ID: ${diagnostics.terra_user_id}
Период: ${diagnostics.date_range?.start} - ${diagnostics.date_range?.end}
Последняя синхронизация: ${lastSync || 'N/A'}

✅ Доступно в Terra API:
• Daily: ${diagnostics.available_in_terra?.daily?.length || 0} записей
• Sleep: ${diagnostics.available_in_terra?.sleep?.length || 0} записей
• Activity: ${diagnostics.available_in_terra?.activity?.length || 0} записей
• Body: ${diagnostics.available_in_terra?.body?.length || 0} записей

💾 Сохранено в БД:
• Дат с данными: ${diagnostics.in_database?.dates_with_data?.length || 0}

⚠️ Не синхронизировано:
• Daily: ${diagnostics.missing_in_db?.daily?.length || 0} дат
• Sleep: ${diagnostics.missing_in_db?.sleep?.length || 0} дат
• Activity: ${diagnostics.missing_in_db?.activity?.length || 0} дат
• Body: ${diagnostics.missing_in_db?.body?.length || 0} дат
    `.trim();

    navigator.clipboard.writeText(text);
    toast({
      title: 'Скопировано',
      description: 'Диагностика скопирована в буфер обмена',
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Диагностика Terra API
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-4 space-y-4 border-t pt-4">
        {!diagnostics && !loading && (
          <div className="text-center py-4">
            <Button onClick={fetchDiagnostics} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Проверить данные в Terra API
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Сравнит данные из Terra API с вашей базой данных
            </p>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {diagnostics && !loading && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Результаты диагностики</h4>
                <p className="text-xs text-muted-foreground">
                  {diagnostics.date_range?.start} → {diagnostics.date_range?.end}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-3 w-3 mr-1" />
                Копировать
              </Button>
            </div>

            {/* Available in Terra */}
            <div className="rounded-lg border p-4 bg-success/5 border-success/20">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-success" />
                <h5 className="font-medium">Доступно в Terra API</h5>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Daily:</span>
                  <span className="ml-2 font-semibold">{diagnostics.available_in_terra?.daily?.length || 0} записей</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Sleep:</span>
                  <span className="ml-2 font-semibold">{diagnostics.available_in_terra?.sleep?.length || 0} записей</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Activity:</span>
                  <span className="ml-2 font-semibold">{diagnostics.available_in_terra?.activity?.length || 0} записей</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Body:</span>
                  <span className="ml-2 font-semibold">{diagnostics.available_in_terra?.body?.length || 0} записей</span>
                </div>
              </div>

              {/* Recent Terra Data */}
              {diagnostics.available_in_terra?.daily?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-success/20">
                  <p className="text-xs font-medium mb-2">Последние данные:</p>
                  <div className="space-y-1">
                    {diagnostics.available_in_terra.daily.slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="text-xs flex items-center justify-between">
                        <span className="font-mono">{item.date}</span>
                        <span className="text-muted-foreground">{item.summary}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* In Database */}
            <div className="rounded-lg border p-4 bg-info/5 border-info/20">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-info" />
                <h5 className="font-medium">Сохранено в базе данных</h5>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Дат с данными:</span>
                <span className="ml-2 font-semibold">{diagnostics.in_database?.dates_with_data?.length || 0}</span>
              </div>
              {diagnostics.in_database?.dates_with_data?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {diagnostics.in_database.dates_with_data.slice(0, 7).map((date: string) => (
                    <Badge key={date} variant="outline" className="text-xs font-mono">
                      {date}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Missing Data */}
            {(diagnostics.missing_in_db?.daily?.length > 0 || 
              diagnostics.missing_in_db?.sleep?.length > 0) && (
              <div className="rounded-lg border p-4 bg-warning/5 border-warning/20">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <h5 className="font-medium">Не синхронизировано</h5>
                </div>
                
                {diagnostics.missing_in_db.daily?.length > 0 && (
                  <div className="mb-2">
                    <span className="text-sm text-muted-foreground">Daily за даты:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {diagnostics.missing_in_db.daily.map((date: string) => (
                        <Badge key={date} variant="outline" className="text-xs font-mono bg-warning/10">
                          {date}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {diagnostics.missing_in_db.sleep?.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Sleep за даты:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {diagnostics.missing_in_db.sleep.map((date: string) => (
                        <Badge key={date} variant="outline" className="text-xs font-mono bg-warning/10">
                          {date}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-warning/20">
                  <p className="text-xs text-muted-foreground mb-2">
                    💡 <strong>Совет:</strong> Whoop обычно отправляет данные за "сегодня" только на следующий день после закрытия дня в приложении.
                  </p>
                  {onSyncRequest && (
                    <Button size="sm" variant="outline" onClick={onSyncRequest} className="mt-2">
                      🔄 Запросить синхронизацию
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Webhook History */}
            {diagnostics.webhook_logs?.length > 0 && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4" />
                  <h5 className="font-medium">История webhook событий</h5>
                </div>
                <div className="space-y-2">
                  {diagnostics.webhook_logs.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between text-xs border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <CheckCircle className="h-3 w-3 text-success" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-destructive" />
                        )}
                        <span className="font-mono">{new Date(log.created_at).toLocaleString('ru-RU')}</span>
                      </div>
                      <span className="text-muted-foreground">{log.event_type || 'unknown'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchDiagnostics}
              disabled={loading}
              className="w-full"
            >
              🔄 Обновить диагностику
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
