import { motion } from 'framer-motion';
import { Heart, Thermometer, Activity, Moon, Droplets, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RecoveryModeReason, overrideRecoveryModeToday } from '@/hooks/useRecoveryMode';
import { useTranslation } from 'react-i18next';

interface RecoveryModeOverlayProps {
  metrics: {
    rhr: number;
    recovery: number;
    hrv: number;
  };
  reason: RecoveryModeReason;
  onDismiss: () => void;
}

const reasonIcons = {
  high_rhr: Heart,
  low_recovery: Activity,
  low_hrv: Activity,
  combined: Thermometer,
};

const reasonColors = {
  high_rhr: 'text-red-500',
  low_recovery: 'text-orange-500',
  low_hrv: 'text-yellow-500',
  combined: 'text-red-500',
};

export function RecoveryModeOverlay({ metrics, reason, onDismiss }: RecoveryModeOverlayProps) {
  const { t } = useTranslation('health');
  const Icon = reason ? reasonIcons[reason] : Heart;
  const iconColor = reason ? reasonColors[reason] : 'text-red-500';

  const handleOverride = () => {
    overrideRecoveryModeToday();
    onDismiss();
  };

  const recommendations = [
    { icon: Moon, text: t('recovery.rest') },
    { icon: Droplets, text: t('recovery.hydrate') },
    { icon: Thermometer, text: t('recovery.temperature') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-background via-background/98 to-primary/5 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-md"
      >
        <Card className="p-6 space-y-6 border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
          {/* Pulse Animation */}
          <div className="flex justify-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className={`w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center`}
            >
              <Icon className={`w-10 h-10 ${iconColor}`} />
            </motion.div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {t('recovery.title')}
            </h2>
            <p className="text-muted-foreground">
              {t('recovery.subtitle')}
            </p>
          </div>

          {/* Metrics Display */}
          <div className="grid grid-cols-3 gap-3">
            {metrics.rhr > 0 && (
              <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="text-2xl font-bold text-red-500">{Math.round(metrics.rhr)}</div>
                <div className="text-xs text-muted-foreground">RHR (bpm)</div>
              </div>
            )}
            {metrics.recovery > 0 && (
              <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="text-2xl font-bold text-orange-500">{Math.round(metrics.recovery)}%</div>
                <div className="text-xs text-muted-foreground">{t('recovery.score')}</div>
              </div>
            )}
            {metrics.hrv > 0 && (
              <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="text-2xl font-bold text-yellow-500">{Math.round(metrics.hrv)}</div>
                <div className="text-xs text-muted-foreground">HRV (ms)</div>
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('recovery.recommendations')}
            </h3>
            {recommendations.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              >
                <rec.icon className="w-5 h-5 text-primary" />
                <span className="text-sm">{rec.text}</span>
              </motion.div>
            ))}
          </div>

          {/* Override Button */}
          <Button
            variant="outline"
            onClick={handleOverride}
            className="w-full gap-2"
          >
            <X className="w-4 h-4" />
            {t('recovery.feelBetter')}
          </Button>
        </Card>
      </motion.div>
    </motion.div>
  );
}
