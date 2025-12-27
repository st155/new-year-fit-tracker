import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReprocessAllDocuments } from '@/hooks/medical-documents/useReprocessAllDocuments';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RefreshCw, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

export const ReprocessAllDocumentsDialog = () => {
  const { t } = useTranslation('medicalDocs');
  const [open, setOpen] = useState(false);
  const [forceReprocess, setForceReprocess] = useState(false);
  const { progress, events, startReprocessing, reset } = useReprocessAllDocuments();

  const handleStart = async () => {
    try {
      await startReprocessing(forceReprocess);
      toast.success(t('reprocess.completed'), {
        description: t('reprocess.stats', { succeeded: progress.succeeded, failed: progress.failed }),
      });
    } catch (error) {
      toast.error(t('reprocess.error'), {
        description: error instanceof Error ? error.message : t('reprocess.unknownError'),
      });
    }
  };

  const handleClose = () => {
    if (!progress.isProcessing) {
      reset();
      setOpen(false);
    }
  };

  const progressPercent = progress.total > 0 
    ? (progress.current / progress.total) * 100 
    : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('reprocess.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('reprocess.title')}</DialogTitle>
          <DialogDescription>
            {t('reprocess.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {!progress.isProcessing && progress.total === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center whitespace-pre-line">
                {t('reprocess.instruction')}
              </p>
              
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox 
                  id="force-reprocess" 
                  checked={forceReprocess}
                  onCheckedChange={(checked) => setForceReprocess(checked as boolean)}
                />
                <Label 
                  htmlFor="force-reprocess" 
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  {t('reprocess.forceLabel')}
                </Label>
              </div>

              <Button onClick={handleStart} size="lg" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {t('reprocess.start')}
              </Button>
            </div>
          )}

          {(progress.isProcessing || progress.total > 0) && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progress.isProcessing ? t('reprocess.processing') : t('reprocess.done')}
                  </span>
                  <span className="font-medium">
                    {t('reprocess.progress', { current: progress.current, total: progress.total })}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                
                {progress.currentDocument && (
                  <p className="text-xs text-muted-foreground truncate">
                    {t('reprocess.current', { filename: progress.currentDocument })}
                  </p>
                )}

                <div className="flex gap-4 text-sm pt-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t('reprocess.succeeded')} {progress.succeeded}</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span>{t('reprocess.failed')} {progress.failed}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <h4 className="text-sm font-medium mb-2">{t('reprocess.results')}</h4>
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <div className="space-y-2">
                    {events.map((event, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-2 text-sm p-2 rounded ${
                          event.error
                            ? 'bg-red-500/10 text-red-600'
                            : 'bg-green-500/10 text-green-600'
                        }`}
                      >
                        {event.error ? (
                          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          {event.error ? (
                            <>
                              <p className="font-medium truncate">{event.fileName}</p>
                              <p className="text-xs opacity-80">{event.error}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium truncate">
                                {event.oldFileName} → {event.newFileName}
                              </p>
                              <p className="text-xs opacity-80">
                                {t('reprocess.category', { name: event.category })}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={progress.isProcessing}
          >
            {progress.isProcessing ? t('reprocess.processing') : t('reprocess.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
