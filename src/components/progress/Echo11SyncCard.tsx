import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSyncHistoricalData } from '@/hooks/useSyncHistoricalData';
import { CloudUpload, Check, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Echo11SyncCard() {
  const { syncLastNDays, progress, result, reset, isLoading } = useSyncHistoricalData();
  const [days, setDays] = useState(7);

  const handleSync = () => {
    syncLastNDays(days);
  };

  const progressPercent = progress.total > 0 
    ? (progress.current / progress.total) * 100 
    : 0;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CloudUpload className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Echo11 AI Sync</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Отправить данные сна и восстановления в Echo11 для персонализации AI-рекомендаций
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Day selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Период:</span>
          <div className="flex gap-1">
            {[3, 7, 14, 30].map((d) => (
              <Button
                key={d}
                variant={days === d ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setDays(d)}
                disabled={isLoading}
              >
                {d} дн
              </Button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        {(progress.status === 'syncing' || progress.status === 'loading') && (
          <div className="space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {progress.message}
            </p>
          </div>
        )}

        {/* Result display */}
        {progress.status === 'done' && result && (
          <div className={cn(
            "p-3 rounded-lg text-sm",
            result.failed === 0 
              ? "bg-green-500/10 text-green-600 dark:text-green-400"
              : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
          )}>
            <div className="flex items-center gap-2">
              {result.failed === 0 ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>{progress.message}</span>
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-2 text-xs space-y-1 opacity-80">
                {result.errors.slice(0, 3).map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
                {result.errors.length > 3 && (
                  <li>• и ещё {result.errors.length - 3} ошибок...</li>
                )}
              </ul>
            )}
          </div>
        )}

        {/* Error display */}
        {progress.status === 'error' && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{progress.message}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {progress.status === 'done' || progress.status === 'error' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
              <Button
                size="sm"
                onClick={handleSync}
                className="flex-1"
              >
                <CloudUpload className="h-4 w-4 mr-1" />
                Повторить
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={handleSync}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Синхронизация...
                </>
              ) : (
                <>
                  <CloudUpload className="h-4 w-4 mr-1" />
                  Синхронизировать {days} дней
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
