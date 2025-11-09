import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, Brain, List, Target, Sparkles, X } from 'lucide-react';

interface HabitsV3OnboardingProps {
  open: boolean;
  onComplete: () => void;
}

const TOTAL_STEPS = 5;

export function HabitsV3Onboarding({ open, onComplete }: HabitsV3OnboardingProps) {
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
            <DialogTitle>Привычки 3.0</DialogTitle>
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
            Шаг {step} из {TOTAL_STEPS}
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
            {step === 1 && <Step1Welcome />}
            {step === 2 && <Step2TimeOfDay />}
            {step === 3 && <Step3SwipeGestures />}
            {step === 4 && <Step4ViewModes />}
            {step === 5 && <Step5XPLevels />}
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
            Назад
          </Button>
          
          <div className="flex gap-2">
            {step < TOTAL_STEPS && (
              <Button variant="outline" onClick={handleSkip}>
                Пропустить
              </Button>
            )}
            <Button onClick={handleNext} className="gap-2">
              {step === TOTAL_STEPS ? 'Начать!' : 'Далее'}
              {step < TOTAL_STEPS && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Step1Welcome() {
  return (
    <div className="text-center space-y-6">
      <div className="text-7xl">🎯</div>
      <div className="space-y-3">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
          Добро пожаловать!
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Мощная система отслеживания привычек с умной организацией, 
          геймификацией и социальными функциями
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-8">
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="text-3xl mb-2">🧠</div>
          <p className="text-sm font-medium">Умная организация</p>
        </div>
        <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
          <div className="text-3xl mb-2">⚡</div>
          <p className="text-sm font-medium">Быстрые жесты</p>
        </div>
        <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
          <div className="text-3xl mb-2">✨</div>
          <p className="text-sm font-medium">Геймификация</p>
        </div>
      </div>
    </div>
  );
}

function Step2TimeOfDay() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-3">Умная организация</h3>
        <p className="text-muted-foreground">
          Привычки автоматически группируются по времени суток: утро, день и вечер. 
          Фокусируйтесь на том, что важно прямо сейчас.
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          className="p-6 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-4xl mb-3">☀️</div>
          <p className="font-semibold mb-1">Утренние привычки</p>
          <p className="text-xs text-muted-foreground">6:00 - 12:00</p>
        </motion.div>
        
        <motion.div 
          className="p-6 rounded-xl bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-4xl mb-3">☕</div>
          <p className="font-semibold mb-1">Дневные привычки</p>
          <p className="text-xs text-muted-foreground">12:00 - 18:00</p>
        </motion.div>
        
        <motion.div 
          className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-4xl mb-3">🌙</div>
          <p className="font-semibold mb-1">Вечерние привычки</p>
          <p className="text-xs text-muted-foreground">18:00 - 23:00</p>
        </motion.div>
        
        <motion.div 
          className="p-6 rounded-xl bg-gradient-to-br from-indigo-500/10 to-blue-900/10 border border-indigo-500/20"
          whileHover={{ scale: 1.02 }}
        >
          <div className="text-4xl mb-3">🌃</div>
          <p className="font-semibold mb-1">Ночные привычки</p>
          <p className="text-xs text-muted-foreground">23:00 - 6:00</p>
        </motion.div>
      </div>
    </div>
  );
}

function Step3SwipeGestures() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-3">Быстрые жесты</h3>
        <p className="text-muted-foreground">
          Используйте свайп вправо для мгновенной отметки привычек. 
          Минимум действий - максимум эффективности!
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
              <p className="font-semibold">Привычка</p>
              <p className="text-xs text-muted-foreground">Свайп для действия</p>
            </div>
          </div>
        </motion.div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
          <ArrowRight className="h-5 w-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-medium">Свайп вправо</p>
            <p className="text-sm text-muted-foreground">Быстро отметить выполнение</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
          <ArrowLeft className="h-5 w-5 text-orange-500 flex-shrink-0" />
          <div>
            <p className="font-medium">Свайп влево</p>
            <p className="text-sm text-muted-foreground">Открыть быстрое меню</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <Target className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="font-medium">Нажатие</p>
            <p className="text-sm text-muted-foreground">Просмотр деталей и статистики</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step4ViewModes() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-3">Гибкие режимы просмотра</h3>
        <p className="text-muted-foreground">
          Переключайтесь между режимами: умный вид с группировкой, компактный список, 
          социальная лента, режим фокуса или временная линия.
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
              <p className="font-semibold text-lg mb-1">🧠 Умный вид</p>
              <p className="text-sm text-muted-foreground">
                Организация по времени суток с автоматической группировкой и приоритизацией
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
              <p className="font-semibold text-lg mb-1">📋 Компактный список</p>
              <p className="text-sm text-muted-foreground">
                Плотный список с фильтрацией для быстрого просмотра всех привычек
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
              <p className="font-semibold text-lg mb-1">🎯 Режим фокуса</p>
              <p className="text-sm text-muted-foreground">
                Полноэкранный режим для концентрации на одной привычке с таймером
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Step5XPLevels() {
  return (
    <div className="text-center space-y-6">
      <div className="text-7xl">✨</div>
      <div className="space-y-3">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Система прогресса
        </h3>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Зарабатывайте опыт за каждую выполненную привычку, повышайте уровень 
          и получайте достижения. Превратите привычки в увлекательную игру!
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
        <div className="p-5 rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
          <Sparkles className="h-8 w-8 mx-auto mb-3 text-yellow-500" />
          <p className="font-semibold mb-2">Базовый XP</p>
          <p className="text-sm text-muted-foreground">За каждую выполненную привычку</p>
        </div>
        
        <div className="p-5 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
          <div className="text-3xl mb-3">🔥</div>
          <p className="font-semibold mb-2">Бонус за серию</p>
          <p className="text-sm text-muted-foreground">+20% за стрик от 7 дней</p>
        </div>
        
        <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <div className="text-3xl mb-3">💪</div>
          <p className="font-semibold mb-2">Сложность</p>
          <p className="text-sm text-muted-foreground">Больше XP за сложные привычки</p>
        </div>
        
        <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
          <div className="text-3xl mb-3">📈</div>
          <p className="font-semibold mb-2">Прогресс</p>
          <p className="text-sm text-muted-foreground">Каждые 1000 XP = новый уровень</p>
        </div>
      </div>
      
      <div className="p-6 rounded-xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-2 border-primary/20 mt-8">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Отслеживайте прогресс в режиме реального времени
        </p>
        <div className="flex items-center justify-center gap-3">
          <div className="text-2xl font-bold text-primary">Lvl 1</div>
          <Progress value={0} className="w-32" />
          <div className="text-sm text-muted-foreground">0 / 1000 XP</div>
        </div>
      </div>
    </div>
  );
}
