import { Loader2 } from 'lucide-react';

interface AIStatusIndicatorProps {
  sendingState: 'idle' | 'sending' | 'processing' | 'error' | 'timeout';
  elapsedTime: number;
}

export const AIStatusIndicator = ({ sendingState, elapsedTime }: AIStatusIndicatorProps) => {
  if (sendingState === 'idle') return null;

  return (
    <div className="px-4 py-2 border-t bg-muted/10">
      {sendingState === 'sending' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Отправка...</span>
        </div>
      )}
      {sendingState === 'processing' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>AI думает... {elapsedTime > 0 && `(${elapsedTime}с)`}</span>
        </div>
      )}
      {sendingState === 'error' && (
        <div className="text-sm text-destructive">
          Ошибка отправки сообщения
        </div>
      )}
      {sendingState === 'timeout' && (
        <div className="text-sm text-destructive">
          Превышено время ожидания
        </div>
      )}
    </div>
  );
};
