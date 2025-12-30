import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AIStatusIndicatorProps {
  sendingState: 'idle' | 'sending' | 'processing' | 'error' | 'timeout';
  elapsedTime: number;
}

export const AIStatusIndicator = ({ sendingState, elapsedTime }: AIStatusIndicatorProps) => {
  const { t } = useTranslation('trainer');
  
  if (sendingState === 'idle') return null;

  return (
    <div className="px-4 py-2 border-t bg-muted/10">
      {sendingState === 'sending' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('chat.sending')}</span>
        </div>
      )}
      {sendingState === 'processing' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('chat.aiThinking', { seconds: elapsedTime })}</span>
        </div>
      )}
      {sendingState === 'error' && (
        <div className="text-sm text-destructive">
          {t('chat.sendError')}
        </div>
      )}
      {sendingState === 'timeout' && (
        <div className="text-sm text-destructive">
          {t('chat.timeout')}
        </div>
      )}
    </div>
  );
};
