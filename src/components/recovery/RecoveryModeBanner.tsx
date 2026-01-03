import { motion } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { overrideRecoveryModeToday } from '@/hooks/useRecoveryMode';
import { useTranslation } from 'react-i18next';

interface RecoveryModeBannerProps {
  onDismiss: () => void;
}

export function RecoveryModeBanner({ onDismiss }: RecoveryModeBannerProps) {
  const { t } = useTranslation('health');

  const handleOverride = () => {
    overrideRecoveryModeToday();
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full p-4 rounded-lg bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border border-red-500/20 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Heart className="w-5 h-5 text-red-500" />
        </motion.div>
        <div>
          <p className="font-medium text-foreground">
            {t('recovery.bannerTitle', 'Режим восстановления активен')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('recovery.bannerSubtitle', 'Рекомендуем отдохнуть сегодня')}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOverride}
        className="shrink-0"
      >
        <X className="w-4 h-4 mr-1" />
        {t('recovery.dismiss', 'Отключить')}
      </Button>
    </motion.div>
  );
}
