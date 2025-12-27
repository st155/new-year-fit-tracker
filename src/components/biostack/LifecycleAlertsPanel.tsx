import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { useLifecycleAlerts } from '@/hooks/biostack';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface LifecycleAlertsPanelProps {
  userId: string;
}

export function LifecycleAlertsPanel({ userId }: LifecycleAlertsPanelProps) {
  const { t, i18n } = useTranslation('biostack');
  const { alerts, isLoading, markAsRead, dismissAlert, unreadCount } = useLifecycleAlerts(userId);
  const navigate = useNavigate();
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  const handleScheduleRetest = (alertId: string) => {
    markAsRead(alertId);
    navigate('/health/lab-work');
  };

  const handleDismiss = (alertId: string) => {
    dismissAlert(alertId);
  };

  // Don't render if no alerts
  if (!isLoading && unreadCount === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="p-6 border-warning/30 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-5 w-5 text-warning" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-warning/40 bg-gradient-to-br from-warning/5 via-background/95 to-background/95 backdrop-blur-sm shadow-[0_0_25px_rgba(234,179,8,0.2)] hover:shadow-[0_0_35px_rgba(234,179,8,0.3)] transition-all duration-300">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="relative"
              >
                <Bell className="h-5 w-5 text-warning" />
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-3 w-3 bg-warning rounded-full border border-background"
                  />
                )}
              </motion.div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                {t('alerts.title')}
              </h3>
            </div>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-3 py-1 rounded-full bg-warning/20 border border-warning/40"
              >
                <span className="text-sm font-semibold text-warning">
                  {t('alerts.newCount', { count: unreadCount })}
                </span>
              </motion.div>
            )}
          </div>

          {/* Alert Cards */}
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg bg-background/60 border border-warning/30 hover:border-warning/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(234,179,8,0.15)]"
              >
                {/* Alert Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {alert.alert_type === 'retest_prompt' ? (
                      <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    )}
                    <div>
                      <h4 className="font-semibold text-sm">
                        {alert.alert_type === 'retest_prompt' 
                          ? t('alerts.retestPrompt')
                          : t('alerts.protocolComplete')}
                        : {alert.protocol?.stack_name || t('alerts.unknownProtocol')}
                      </h4>
                      {alert.protocol?.supplement_products && (
                        <p className="text-xs text-muted-foreground">
                          {alert.protocol.supplement_products.name}
                          {alert.protocol.supplement_products.brand && 
                            ` (${alert.protocol.supplement_products.brand})`
                          }
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: dateLocale })}
                  </span>
                </div>

                {/* Alert Message */}
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {alert.message}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => handleScheduleRetest(alert.id)}
                    className="bg-warning/20 hover:bg-warning/30 text-warning border-warning/40 hover:border-warning/60"
                    variant="outline"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    {t('alerts.scheduleRetest')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(alert.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t('alerts.dismiss')}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty State (shown when alerts exist but all are read/dismissed) */}
          {alerts.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">{t('alerts.noNew')}</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
