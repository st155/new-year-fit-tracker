import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, Brain, List, Target, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HabitsV3OnboardingProps {
  open: boolean;
  onComplete: () => void;
}

const TOTAL_STEPS = 5;

export function HabitsV3Onboarding({ open, onComplete }: HabitsV3OnboardingProps) {
  const { t } = useTranslation('habits');
  const [step, setStep] = useState(1);

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <Dialog open={open} onOpenChange={onComplete}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{t('onboarding.title')}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {t('onboarding.step', { step, total: TOTAL_STEPS })}
          </p>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="py-6"
          >
            {step === 1 && <Step1Welcome t={t} />}
            {step === 2 && <Step2TimeOfDay t={t} />}
            {step === 3 && <Step3SwipeGestures t={t} />}
            {step === 4 && <Step4ViewModes t={t} />}
            {step === 5 && <Step5XPLevels t={t} />}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('onboarding.back')}
          </Button>
          
          <div className="flex gap-2">
            {step < TOTAL_STEPS && (
              <Button variant="outline" onClick={handleSkip}>
                {t('onboarding.skip')}
              </Button>
            )}
            <Button onClick={handleNext} className="gap-2">
              {step === TOTAL_STEPS ? t('onboarding.start') : t('onboarding.next')}
              {step < TOTAL_STEPS && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StepProps {
  t: ReturnType<typeof useTranslation>['t'];
}

function Step1Welcome({ t }: StepProps) {
  return (
    <div className="text-center space-y-6">
      <div className="text-7xl">🎯</div>
      <div className="space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
          {t('onboarding.welcome')}
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          {t('onboarding.welcomeDesc')}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-8">
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="text-3xl mb-2">🧠</div>
          <p className="text-sm font-medium">{t('onboarding.smartOrg')}</p>
        </div>
        <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
          <div className="text-3xl mb-2">⚡</div>
          <p className="text-sm font-medium">{t('onboarding.quickGestures')}</p>
        </div>
        <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
          <div className="text-3xl mb-2">✨</div>
          <p className="text-sm font-medium">{t('onboarding.gamification')}</p>
        </div>
      </div>
    </div>
  );
}

function Step2TimeOfDay({ t }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-3">{t('onboarding.smartOrgTitle')}</h3>
        <p className="text-muted-foreground">
          {t('onboarding.smartOrgDesc')}
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          className="p-6 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-4xl mb-3">☀️</div>
          <p className="font-semibold mb-1">{t('onboarding.timeSlots.morning')}</p>
          <p className="text-xs text-muted-foreground">{t('onboarding.timeSlots.morningTime')}</p>
        </motion.div>
        
        <motion.div 
          className="p-6 rounded-xl bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-4xl mb-3">☕</div>
          <p className="font-semibold mb-1">{t('onboarding.timeSlots.afternoon')}</p>
          <p className="text-xs text-muted-foreground">{t('onboarding.timeSlots.afternoonTime')}</p>
        </motion.div>
        
        <motion.div 
          className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-4xl mb-3">🌙</div>
          <p className="font-semibold mb-1">{t('onboarding.timeSlots.evening')}</p>
          <p className="text-xs text-muted-foreground">{t('onboarding.timeSlots.eveningTime')}</p>
        </motion.div>
        
        <motion.div 
          className="p-6 rounded-xl bg-gradient-to-br from-indigo-500/10 to-blue-900/10 border border-indigo-500/20"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-4xl mb-3">🌃</div>
          <p className="font-semibold mb-1">{t('onboarding.timeSlots.night')}</p>
          <p className="text-xs text-muted-foreground">{t('onboarding.timeSlots.nightTime')}</p>
        </motion.div>
      </div>
    </div>
  );
}

function Step3SwipeGestures({ t }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-3">{t('onboarding.gesturesTitle')}</h3>
        <p className="text-muted-foreground">
          {t('onboarding.gesturesDesc')}
        </p>
      </div>
      
      <div className="relative p-8 border-2 border-dashed rounded-xl bg-muted/20">
        <motion.div
          animate={{ 
            x: [0, 30, 0, -30, 0],
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 4,
            ease: "easeInOut"
          }}
          className="p-6 bg-card rounded-xl border-2 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{t('onboarding.gestures.habit')}</p>
              <p className="text-xs text-muted-foreground">{t('onboarding.gestures.swipeHint')}</p>
            </div>
          </div>
        </motion.div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
          <ArrowRight className="h-5 w-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-medium">{t('onboarding.gestures.swipeRight')}</p>
            <p className="text-sm text-muted-foreground">{t('onboarding.gestures.swipeRightDesc')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
          <ArrowLeft className="h-5 w-5 text-orange-500 flex-shrink-0" />
          <div>
            <p className="font-medium">{t('onboarding.gestures.swipeLeft')}</p>
            <p className="text-sm text-muted-foreground">{t('onboarding.gestures.swipeLeftDesc')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <Target className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="font-medium">{t('onboarding.gestures.tap')}</p>
            <p className="text-sm text-muted-foreground">{t('onboarding.gestures.tapDesc')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
          <Target className="h-5 w-5 text-purple-500 flex-shrink-0" />
          <div>
            <p className="font-medium">{t('onboarding.gestures.longPress')}</p>
            <p className="text-sm text-muted-foreground">{t('onboarding.gestures.longPressDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step4ViewModes({ t }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-3">{t('onboarding.viewModesTitle')}</h3>
        <p className="text-muted-foreground">
          {t('onboarding.viewModesDesc')}
        </p>
      </div>
      
      <div className="grid gap-4">
        <motion.div 
          className="p-5 border-2 rounded-xl hover:border-primary/50 transition-colors"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg mb-1">{t('onboarding.viewModes.smart')}</p>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.viewModes.smartDesc')}
              </p>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          className="p-5 border-2 rounded-xl hover:border-blue-500/50 transition-colors"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <List className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg mb-1">{t('onboarding.viewModes.list')}</p>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.viewModes.listDesc')}
              </p>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          className="p-5 border-2 rounded-xl hover:border-purple-500/50 transition-colors"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10">
              <Target className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg mb-1">{t('onboarding.viewModes.focus')}</p>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.viewModes.focusDesc')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Step5XPLevels({ t }: StepProps) {
  return (
    <div className="text-center space-y-6">
      <div className="text-7xl">✨</div>
      <div className="space-y-3">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          {t('onboarding.progressTitle')}
        </h3>
        <p className="text-muted-foreground max-w-xl mx-auto">
          {t('onboarding.progressDesc')}
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
        <div className="p-5 rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
          <Sparkles className="h-8 w-8 mx-auto mb-3 text-yellow-500" />
          <p className="font-semibold mb-2">{t('onboarding.xp.base')}</p>
          <p className="text-sm text-muted-foreground">{t('onboarding.xp.baseDesc')}</p>
        </div>
        
        <div className="p-5 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
          <div className="text-3xl mb-3">🔥</div>
          <p className="font-semibold mb-2">{t('onboarding.xp.streak')}</p>
          <p className="text-sm text-muted-foreground">{t('onboarding.xp.streakDesc')}</p>
        </div>
        
        <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <div className="text-3xl mb-3">💪</div>
          <p className="font-semibold mb-2">{t('onboarding.xp.difficulty')}</p>
          <p className="text-sm text-muted-foreground">{t('onboarding.xp.difficultyDesc')}</p>
        </div>
        
        <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
          <div className="text-3xl mb-3">📈</div>
          <p className="font-semibold mb-2">{t('onboarding.xp.progress')}</p>
          <p className="text-sm text-muted-foreground">{t('onboarding.xp.progressDesc')}</p>
        </div>
      </div>
      
      <div className="p-6 rounded-xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-2 border-primary/20 mt-8">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          {t('onboarding.trackProgress')}
        </p>
        <div className="flex items-center justify-center gap-3">
          <div className="text-2xl font-bold text-primary">{t('onboarding.level', { level: 1 })}</div>
          <Progress value={0} className="w-32" />
          <div className="text-sm text-muted-foreground">{t('onboarding.xpProgress', { current: 0, max: 1000 })}</div>
        </div>
      </div>
    </div>
  );
}
