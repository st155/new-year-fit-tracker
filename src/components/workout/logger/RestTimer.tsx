import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timer, SkipForward, Plus, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRestTimer } from '@/hooks/useRestTimer';
import { requestNotificationPermission } from '@/lib/notification-utils';

interface RestTimerProps {
  duration: number; // in seconds
  onComplete: () => void;
  onSkip: () => void;
}

export default function RestTimer({ duration, onComplete, onSkip }: RestTimerProps) {
  const {
    timeRemaining,
    isRunning,
    progressPercent,
    start,
    pause,
    reset,
    addTime,
    changeDuration,
  } = useRestTimer({
    initialDuration: duration,
    onComplete,
    autoStart: true,
  });

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    changeDuration(duration);
  }, [duration, changeDuration]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="backdrop-blur-xl bg-gradient-to-br from-primary/20 to-success/20 border-2 border-primary/50 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_60px_rgba(6,182,212,0.3)] max-w-md w-full mx-4"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Timer className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Rest Time</h3>
          <p className="text-sm text-muted-foreground">
            Recover before your next set
          </p>
        </div>

        {/* Circular Progress - Simulated */}
        <div className="relative w-48 h-48 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-8 border-primary/20" />
          <svg className="absolute inset-0 -rotate-90 w-48 h-48">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${2 * Math.PI * 88 * (1 - progressPercent / 100)}`}
              className="transition-all duration-1000 ease-linear"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--success))" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <Progress value={progressPercent} className="h-2 mb-6" />

        {/* Control Buttons */}
        <div className="flex gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={isRunning ? pause : start}
            className="flex-1 backdrop-blur-xl bg-white/5 hover:bg-white/10 border-white/10"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            className="flex-1 backdrop-blur-xl bg-white/5 hover:bg-white/10 border-white/10"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => addTime(30)}
            className="flex-1 backdrop-blur-xl bg-white/5 hover:bg-white/10 border-white/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            +30s
          </Button>
          <Button
            onClick={onSkip}
            className="flex-1 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600"
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Skip Rest
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
