import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DaySelectorProps {
  onSelect: (days: number[]) => void;
}

const DAYS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' }
];

export function DaySelector({ onSelect }: DaySelectorProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => {
      const newDays = prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort();
      return newDays;
    });
  };

  const handleContinue = () => {
    if (selectedDays.length > 0) {
      onSelect(selectedDays);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day) => {
          const isSelected = selectedDays.includes(day.value);
          return (
            <motion.button
              key={day.value}
              onClick={() => toggleDay(day.value)}
              className={cn(
                "aspect-square rounded-lg transition-all duration-300",
                "flex items-center justify-center text-sm font-medium",
                "backdrop-blur-sm",
                isSelected 
                  ? "bg-gradient-to-br from-cyan-500 via-primary to-pink-500 border-2 border-cyan-400 shadow-lg shadow-cyan-500/50"
                  : "bg-neutral-800/50 border border-neutral-700 hover:border-neutral-600"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className={cn(
                "font-bold transition-colors",
                isSelected ? "text-white" : "text-muted-foreground"
              )}>
                {day.label}
              </span>
            </motion.button>
          );
        })}
      </div>
      
      <Button
        onClick={handleContinue}
        disabled={selectedDays.length === 0}
        className="w-full bg-gradient-to-r from-cyan-500 to-primary hover:from-cyan-600 hover:to-primary/90"
      >
        Продолжить ({selectedDays.length} {selectedDays.length === 1 ? 'день' : 'дней'})
      </Button>
    </div>
  );
}
