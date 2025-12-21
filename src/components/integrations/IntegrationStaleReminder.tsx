import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIntegrationHealthAlert } from '@/hooks/useIntegrationHealthAlert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plug, Clock } from 'lucide-react';

const STORAGE_KEY = 'integration_stale_reminder_shown_at';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function IntegrationStaleReminder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { shouldShowAlert, staleIntegrations, isLoading } = useIntegrationHealthAlert();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user || isLoading) return;

    // Delay showing the reminder to avoid interrupting initial load
    const timer = setTimeout(() => {
      checkAndShowReminder();
    }, 3000);

    return () => clearTimeout(timer);
  }, [user, shouldShowAlert, isLoading]);

  const checkAndShowReminder = () => {
    if (!shouldShowAlert) return;

    // Check if we've shown the reminder in the last 24 hours
    const lastShownStr = localStorage.getItem(STORAGE_KEY);
    if (lastShownStr) {
      const lastShown = parseInt(lastShownStr, 10);
      if (Date.now() - lastShown < ONE_DAY_MS) {
        console.log('🔔 [IntegrationStaleReminder] Already shown today, skipping');
        return;
      }
    }

    console.log('🔔 [IntegrationStaleReminder] Showing stale integration reminder');
    setIsOpen(true);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  const handleReconnect = () => {
    setIsOpen(false);
    navigate('/fitness-data?tab=connections');
  };

  const handleDismiss = () => {
    setIsOpen(false);
  };

  const getProviderDisplayName = (provider: string) => {
    const names: Record<string, string> = {
      WHOOP: 'WHOOP',
      GARMIN: 'Garmin',
      WITHINGS: 'Withings',
      OURA: 'Oura',
      GOOGLE: 'Google Fit',
      ULTRAHUMAN: 'Ultrahuman',
    };
    return names[provider] || provider;
  };

  if (!user || staleIntegrations.length === 0) {
    return null;
  }

  const primaryStale = staleIntegrations[0];
  const otherCount = staleIntegrations.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Данные устарели
          </DialogTitle>
          <DialogDescription className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg mt-2">
              <Clock className="h-5 w-5 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">
                  {getProviderDisplayName(primaryStale.provider)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {primaryStale.lastDataDate 
                    ? `Последние данные: ${primaryStale.daysSinceData} дней назад`
                    : 'Нет данных за последнее время'
                  }
                </p>
              </div>
            </div>
            
            {otherCount > 0 && (
              <p className="text-sm text-muted-foreground">
                И ещё {otherCount} {otherCount === 1 ? 'интеграция требует' : 'интеграций требуют'} внимания.
              </p>
            )}
            
            <p className="text-sm">
              Возможно, требуется повторное подключение. Проверьте настройки интеграций.
            </p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleDismiss} className="flex-1">
            Позже
          </Button>
          <Button onClick={handleReconnect} className="flex-1 gap-2">
            <Plug className="h-4 w-4" />
            Проверить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
