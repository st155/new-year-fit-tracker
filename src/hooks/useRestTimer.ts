import { useState, useEffect, useCallback, useRef } from 'react';
import { showNotification, playSound, vibrate } from '@/lib/notification-utils';
import i18n from '@/i18n';

interface UseRestTimerOptions {
  initialDuration: number;
  onComplete?: () => void;
  autoStart?: boolean;
}

export function useRestTimer({ 
  initialDuration, 
  onComplete,
  autoStart = false 
}: UseRestTimerOptions) {
  const [duration, setDuration] = useState(initialDuration);
  const [timeRemaining, setTimeRemaining] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeRemaining(duration);
  }, [duration]);

  const addTime = useCallback((seconds: number) => {
    setTimeRemaining(prev => Math.max(0, prev + seconds));
  }, []);

  const changeDuration = useCallback((newDuration: number) => {
    setDuration(newDuration);
    setTimeRemaining(newDuration);
    setIsRunning(false);
  }, []);

  useEffect(() => {
    setTimeRemaining(duration);
  }, [duration]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Timer complete
          playSound(1000, 300);
          vibrate([200, 100, 200]);
          showNotification(i18n.t('workouts:restTimer.completedTitle'), {
            body: i18n.t('workouts:restTimer.completedBody'),
            tag: 'rest-timer',
          });
          
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, onComplete]);

  const progressPercent = ((duration - timeRemaining) / duration) * 100;

  return {
    timeRemaining,
    isRunning,
    progressPercent,
    start,
    pause,
    reset,
    addTime,
    changeDuration,
  };
}
