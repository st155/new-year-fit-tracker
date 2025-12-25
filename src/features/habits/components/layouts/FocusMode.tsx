import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Clock, 
  Play, 
  Pause,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDuration, getTimeBasedTheme } from '@/lib/habit-utils-v3';
import { HabitCelebration } from '../legacy/HabitCelebration';

interface FocusModeProps {
  habits: any[];
  onHabitComplete?: (habitId: string) => void;
  onExit?: () => void;
}

export function FocusMode({ habits, onHabitComplete, onExit }: FocusModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const currentHabit = habits[currentIndex];
  const theme = getTimeBasedTheme(currentHabit?.time_of_day || null);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && currentHabit?.target_duration) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          const targetSeconds = (currentHabit.target_duration || 0) * 60;
          if (prev >= targetSeconds) {
            setIsTimerRunning(false);
            return targetSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, currentHabit]);

  const handleComplete = () => {
    setShowCelebration(true);
    onHabitComplete?.(currentHabit.id);
    
    setTimeout(() => {
      setShowCelebration(false);
      if (currentIndex < habits.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setTimerSeconds(0);
        setIsTimerRunning(false);
      }
    }, 2000);
  };

  const handleNext = () => {
    if (currentIndex < habits.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimerSeconds(0);
      setIsTimerRunning(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setTimerSeconds(0);
      setIsTimerRunning(false);
    }
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setTimerSeconds(0);
    setIsTimerRunning(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const targetSeconds = (currentHabit?.target_duration || 0) * 60;
  const timerProgress = targetSeconds > 0 ? (timerSeconds / targetSeconds) * 100 : 0;

  if (!currentHabit) {
    return (
      <Card className="glass-card p-12 text-center">
        <p className="text-muted-foreground">Нет доступных привычек</p>
        <Button onClick={onExit} className="mt-4">Вернуться</Button>
      </Card>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <HabitCelebration trigger={showCelebration} type="completion" />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentHabit.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-2xl"
        >
          <Card 
            className={cn(
              "glass-card relative overflow-hidden",
              theme.gradient
            )}
          >
            {/* Progress Indicator */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-background/20">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / habits.length) * 100}%` }}
              />
            </div>

            <CardContent className="p-8 md:p-12 space-y-8">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="text-6xl mb-4">{currentHabit.icon || '📌'}</div>
                <h2 className="text-3xl md:text-4xl font-bold">{currentHabit.name}</h2>
                {currentHabit.category && (
                  <Badge variant="secondary" className="text-sm">
                    {currentHabit.category}
                  </Badge>
                )}
              </div>

              {/* Timer Section */}
              {currentHabit.target_duration && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-5xl md:text-6xl font-mono font-bold">
                      {formatTime(timerSeconds)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Цель: {formatDuration(currentHabit.target_duration)}
                    </p>
                  </div>

                  <Progress value={timerProgress} className="h-3" />

                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={toggleTimer}
                      size="lg"
                      className="rounded-full w-16 h-16"
                    >
                      {isTimerRunning ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6" />
                      )}
                    </Button>
                    <Button
                      onClick={resetTimer}
                      variant="outline"
                      size="lg"
                      className="rounded-full w-16 h-16"
                    >
                      <RotateCcw className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Habit Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                {currentHabit.current_streak > 0 && (
                  <div className="glass-card p-4 rounded-lg">
                    <div className="text-2xl font-bold">🔥 {currentHabit.current_streak}</div>
                    <div className="text-xs text-muted-foreground mt-1">Серия</div>
                  </div>
                )}
                {currentHabit.xp_reward && (
                  <div className="glass-card p-4 rounded-lg">
                    <div className="text-2xl font-bold">✨ {currentHabit.xp_reward}</div>
                    <div className="text-xs text-muted-foreground mt-1">XP</div>
                  </div>
                )}
                {currentHabit.completion_rate && (
                  <div className="glass-card p-4 rounded-lg">
                    <div className="text-2xl font-bold">{Math.round(currentHabit.completion_rate)}%</div>
                    <div className="text-xs text-muted-foreground mt-1">Завершено</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  size="lg"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Назад
                </Button>

                <Button
                  onClick={handleComplete}
                  disabled={currentHabit.completed_today}
                  size="lg"
                  className="flex-1 text-lg"
                >
                  <Check className="w-5 h-5 mr-2" />
                  {currentHabit.completed_today ? 'Завершено' : 'Завершить'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={currentIndex === habits.length - 1}
                  size="lg"
                >
                  Далее
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>

              {/* Progress Text */}
              <div className="text-center text-sm text-muted-foreground">
                Привычка {currentIndex + 1} из {habits.length}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
