import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { terraApi } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TerraDataMonitorProps {
  provider: string;
  terraUserId?: string;
}

export function TerraDataMonitor({ provider, terraUserId }: TerraDataMonitorProps) {
  const [backfillJob, setBackfillJob] = useState<any>(null);
  const [freshness, setFreshness] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load latest backfill job
      const { data: jobs } = await supabase
        .from('terra_backfill_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setBackfillJob(jobs);

      // Load data freshness
      const { data: freshnessData } = await supabase
        .from('data_freshness_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', provider);

      setFreshness(freshnessData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Realtime subscription only for backfill job progress
    const channel = supabase
      .channel(`backfill-progress-${provider}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'terra_backfill_jobs',
        filter: `provider=eq.${provider}`
      }, (payload) => {
        // Update only backfill job state without full reload
        setBackfillJob(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [provider]);

  const startBackfill = async (daysAgo: number) => {
    if (!terraUserId) {
      toast({
        title: 'Ошибка',
        description: 'Terra User ID не найден',
        variant: 'destructive',
      });
      return;
    }

    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await terraApi.backfill({
        userId: user.id,
        provider,
        terraUserId: terraUserId!,
        startDaysAgo: daysAgo,
      });

      if (error) throw error;

      toast({
        title: 'Backfill запущен',
        description: `Загрузка данных за последние ${daysAgo} дней...`,
      });

      // Refresh data
      setTimeout(loadData, 2000);
    } catch (error: any) {
      toast({
        title: 'Ошибка backfill',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const getDataTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'daily': '📊 Дневные метрики',
      'sleep': '😴 Сон',
      'activity': '🏃 Активность',
      'body': '⚖️ Тело',
    };
    return labels[type] || type;
  };

  const getFreshnessColor = (lastReceivedAt: string): "default" | "destructive" | "success" | "secondary" | "outline" => {
    const hoursSince = (Date.now() - new Date(lastReceivedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 1) return 'success';
    if (hoursSince < 24) return 'secondary';
    return 'destructive';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Backfill Job Status */}
      {backfillJob && backfillJob.status !== 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Загрузка исторических данных
            </CardTitle>
            <CardDescription>
              {backfillJob.status === 'processing' ? 'Идет загрузка...' : 'Ожидание'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Прогресс: {backfillJob.processed_days} / {backfillJob.total_days} дней</span>
              <span className="font-semibold">{backfillJob.progress_percentage}%</span>
            </div>
            <Progress value={backfillJob.progress_percentage} />
            {backfillJob.date_being_processed && (
              <p className="text-xs text-muted-foreground">
                Обрабатывается: {backfillJob.date_being_processed}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Freshness */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Актуальность данных
              </CardTitle>
              <CardDescription>
                Последние полученные данные от {provider}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {freshness.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>Нет данных о свежести</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => startBackfill(7)}
                disabled={syncing}
              >
                {syncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Загрузить данные за неделю
              </Button>
            </div>
          ) : (
            freshness.map((item) => (
              <div
                key={item.data_type}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{getDataTypeLabel(item.data_type)}</p>
                    <p className="text-xs text-muted-foreground">
                      Последнее обновление: {formatDistanceToNow(new Date(item.last_received_at), { addSuffix: true, locale: ru })}
                    </p>
                  </div>
                </div>
                <Badge variant={getFreshnessColor(item.last_received_at)}>
                  {item.last_received_date}
                </Badge>
              </div>
            ))
          )}
          
          {freshness.length > 0 && (
            <div className="pt-3 border-t space-y-2">
              <p className="text-sm text-muted-foreground">Загрузить больше исторических данных:</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startBackfill(14)}
                  disabled={syncing}
                >
                  {syncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  14 дней
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startBackfill(30)}
                  disabled={syncing}
                >
                  {syncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  30 дней
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Missing Data Alert */}
      {freshness.some(f => f.consecutive_missing_days > 2) && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Данные не обновляются
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Некоторые данные не обновлялись более 2 дней. Проверьте подключение устройства.
            </p>
            <Button variant="destructive" size="sm" onClick={() => startBackfill(7)}>
              Попробовать синхронизировать
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
