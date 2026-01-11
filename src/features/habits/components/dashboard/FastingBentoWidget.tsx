/**
 * FastingBentoWidget - виджет интервального голодания в стиле Bento
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Utensils, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFastingWindow } from '@/hooks/useFastingWindow';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface FastingBentoWidgetProps {
  habit: any;
  userId: string;
}

const FASTING_MODES = [
  { value: '16:8', label: '16:8', fastingHours: 16, eatingHours: 8 },
  { value: '18:6', label: '18:6', fastingHours: 18, eatingHours: 6 },
  { value: '20:4', label: '20:4', fastingHours: 20, eatingHours: 4 },
  { value: 'OMAD', label: 'OMAD', fastingHours: 23, eatingHours: 1 },
];

export function FastingBentoWidget({ habit, userId }: FastingBentoWidgetProps) {
  const { t } = useTranslation('habits');
  const {
    status,
    startEating,
    endEating,
    startFasting,
    isStarting,
    isEnding,
    isFastingStarting,
  } = useFastingWindow(habit.id, userId);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMode, setSelectedMode] = useState('16:8');

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isLoading = isStarting || isEnding || isFastingStarting;
  const mode = FASTING_MODES.find(m => m.value === selectedMode) || FASTING_MODES[0];
  
  // Calculate progress - duration is in minutes, convert to ms
  const durationMs = status.duration * 60 * 1000;
  const targetHours = status.isFasting ? mode.fastingHours : mode.eatingHours;
  const elapsedHours = durationMs ? durationMs / (1000 * 60 * 60) : 0;
  const progress = Math.min((elapsedHours / targetHours) * 100, 100);

  // Format duration
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleToggle = () => {
    if (status.isFasting) {
      startEating();
    } else if (status.isEating) {
      endEating();
    } else {
      startFasting();
    }
  };

  // SVG Circle progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      className={cn(
        "col-span-2 p-4 rounded-2xl",
        "bg-gradient-to-br from-card/80 to-card/40",
        "backdrop-blur-xl border border-border/30",
        "shadow-lg"
      )}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="flex items-center gap-4">
        {/* Circular Progress */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
              opacity="0.3"
            />
            {/* Progress circle */}
            <motion.circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={status.isFasting ? 'hsl(var(--primary))' : 'hsl(142, 76%, 45%)'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
          {status.isFasting || status.isEating ? (
              <>
                <span className="text-lg font-bold font-mono">
                  {formatDuration(durationMs)}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase">
                  {status.isFasting ? 'Fasting' : 'Eating'}
                </span>
              </>
            ) : (
              <>
                <Clock className="w-6 h-6 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mt-1">Ready</span>
              </>
            )}
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex-1 space-y-3">
          {/* Status text */}
          <div>
            <h3 className="font-semibold text-sm">
              {status.isFasting ? t('fasting.statusFasting') : status.isEating ? t('fasting.statusEating') : t('fasting.intermittentFasting')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {status.isFasting 
                ? t('fasting.goalHours', { hours: mode.fastingHours })
                : status.isEating
                ? t('fasting.remainingHours', { hours: Math.max(0, mode.eatingHours - elapsedHours).toFixed(1) })
                : t('fasting.pressToStart')}
            </p>
          </div>

          {/* Mode selector */}
          <Select value={selectedMode} onValueChange={setSelectedMode}>
            <SelectTrigger className="h-8 text-xs bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FASTING_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label} ({m.fastingHours}:{m.eatingHours})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action button */}
          <Button
            onClick={handleToggle}
            disabled={isLoading}
            size="sm"
            className={cn(
              "w-full gap-2",
              status.isFasting && "bg-green-600 hover:bg-green-700",
              status.isEating && "bg-orange-600 hover:bg-orange-700"
            )}
          >
            {status.isFasting ? (
              <>
                <Utensils className="w-4 h-4" />
                {t('fastingControl.eatingWindow')}
              </>
            ) : status.isEating ? (
              <>
                <Pause className="w-4 h-4" />
                {t('fastingControl.endEating')}
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                {t('fastingControl.startFasting')}
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
