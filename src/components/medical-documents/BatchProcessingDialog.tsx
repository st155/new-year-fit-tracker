import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Loader2, X, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProcessingLog {
  id: string;
  documentName: string;
  status: 'processing' | 'completed' | 'error';
  error?: string;
  timestamp: Date;
}

interface BatchProcessingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function BatchProcessingDialog({ open, onOpenChange, onComplete }: BatchProcessingDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(0);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [succeeded, setSucceeded] = useState(0);
  const [failed, setFailed] = useState(0);

  const startProcessing = async () => {
    setIsProcessing(true);
    setLogs([]);
    setProgress(0);
    setCurrent(0);
    setSucceeded(0);
    setFailed(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/batch-process-documents`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to start batch processing');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'start') {
              setTotal(data.total);
            } else if (data.type === 'progress') {
              setCurrent(data.current);
              setProgress((data.current / data.total) * 100);
              setLogs(prev => [...prev, {
                id: data.documentId,
                documentName: data.documentName,
                status: 'processing',
                timestamp: new Date()
              }]);
            } else if (data.type === 'completed') {
              setSucceeded(prev => prev + 1);
              setLogs(prev => prev.map(log =>
                log.id === data.documentId
                  ? { ...log, status: 'completed' as const }
                  : log
              ));
            } else if (data.type === 'error') {
              setFailed(prev => prev + 1);
              setLogs(prev => prev.map(log =>
                log.id === data.documentId
                  ? { ...log, status: 'error' as const, error: data.error }
                  : log
              ));
            } else if (data.type === 'done') {
              setIsProcessing(false);
              toast.success(data.message);
              onComplete();
            }
          }
        }
      }

    } catch (error) {
      console.error('Batch processing error:', error);
      toast.error('Ошибка при обработке документов');
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (open && !isProcessing && logs.length === 0) {
      startProcessing();
    }
  }, [open]);

  const handleClose = () => {
    if (isProcessing) {
      toast.info('Обработка продолжается в фоновом режиме');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl glass-card">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Массовая обработка документов</DialogTitle>
                <DialogDescription>
                  {isProcessing
                    ? `Обработано ${current} из ${total} документов`
                    : `Завершено: ${succeeded} успешно, ${failed} ошибок`
                  }
                </DialogDescription>
              </div>
            </div>
            {!isProcessing && (
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Прогресс</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>✅ Успешно: {succeeded}</span>
              <span>❌ Ошибок: {failed}</span>
            </div>
          </div>

          {/* Processing Log */}
          <ScrollArea className="h-[400px] rounded-lg border border-border/50 p-4">
            <div className="space-y-2">
              {logs.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p>Подготовка к обработке...</p>
                    </div>
                  ) : (
                    <p>Нет данных для отображения</p>
                  )}
                </div>
              )}

              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                >
                  {log.status === 'processing' && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0 mt-0.5" />
                  )}
                  {log.status === 'completed' && (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  )}
                  {log.status === 'error' && (
                    <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.documentName}</p>
                    {log.error && (
                      <p className="text-xs text-destructive mt-1">{log.error}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.timestamp.toLocaleTimeString('ru-RU')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex gap-3">
            {isProcessing ? (
              <Button variant="outline" className="w-full" onClick={handleClose}>
                Скрыть (обработка продолжится)
              </Button>
            ) : (
              <Button className="w-full" onClick={handleClose}>
                Закрыть
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
