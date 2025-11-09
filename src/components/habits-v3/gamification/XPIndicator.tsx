import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface XPIndicatorProps {
  xp: number;
  position?: 'top' | 'center';
  duration?: number;
  onComplete?: () => void;
}

export function XPIndicator({
  xp,
  position = 'center',
  duration = 2000,
  onComplete,
}: XPIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed z-50 pointer-events-none',
        position === 'top' ? 'top-20 left-1/2 -translate-x-1/2' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'animate-fade-up'
      )}
    >
      <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xl">
        <Sparkles className="h-5 w-5 animate-spin" />
        <span className="text-xl font-bold">+{xp} XP</span>
      </div>
    </div>
  );
}
