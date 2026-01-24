import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ 
  title,
  message,
  onRetry,
  className 
}: ErrorStateProps) {
  const { t } = useTranslation('common');
  
  const displayTitle = title ?? t('errors.generic');
  const displayMessage = message ?? t('errors.tryAgain');
  return (
    <Card className={cn("border-destructive/50", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{displayTitle}</h3>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
          {displayMessage}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            {t('actions.retry')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
