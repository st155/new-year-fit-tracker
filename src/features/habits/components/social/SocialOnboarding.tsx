import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Sparkles, Users, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ONBOARDING_KEY = 'habits_v3_social_onboarding_shown';

interface SocialOnboardingProps {
  onDismiss?: () => void;
}

export function SocialOnboarding({ onDismiss }: SocialOnboardingProps) {
  const { t } = useTranslation('habits');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if onboarding has been shown before
    const hasShown = localStorage.getItem(ONBOARDING_KEY);
    if (!hasShown) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-6 mb-6 bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-primary/20">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold">{t('socialOnboarding.welcome')}</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-2 -mt-2"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10 mt-0.5">
                <span className="text-lg">✓</span>
              </div>
              <div>
                <p className="font-medium mb-1">{t('socialOnboarding.step1.title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('socialOnboarding.step1.description')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10 mt-0.5">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium mb-1">{t('socialOnboarding.step2.title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('socialOnboarding.step2.description')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10 mt-0.5">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium mb-1">{t('socialOnboarding.step3.title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('socialOnboarding.step3.description')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              className="flex-1"
              onClick={handleDismiss}
            >
              {t('socialOnboarding.gotIt')}
            </Button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
