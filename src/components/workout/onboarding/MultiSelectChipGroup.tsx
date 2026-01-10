import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChipOption {
  value: string;
  label: string;
  icon?: string;
}

interface MultiSelectChipGroupProps {
  options: ChipOption[];
  onSelect: (values: string[]) => void;
}

export function MultiSelectChipGroup({ options, onSelect }: MultiSelectChipGroupProps) {
  const { t } = useTranslation('workouts');
  const [selected, setSelected] = useState<string[]>([]);

  const toggleOption = (value: string) => {
    setSelected(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleContinue = () => {
    if (selected.length > 0) {
      onSelect(selected);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const IconComponent = option.icon ? (Icons as any)[option.icon] : null;
          const isSelected = selected.includes(option.value);

          return (
            <motion.button
              key={option.value}
              onClick={() => toggleOption(option.value)}
              className={cn(
                "px-4 py-2 rounded-full transition-all duration-300",
                "backdrop-blur-sm flex items-center gap-2",
                isSelected 
                  ? "bg-gradient-to-br from-cyan-500 via-primary to-pink-500 border-2 border-cyan-400 shadow-lg shadow-cyan-500/50"
                  : "bg-neutral-800/50 border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/70"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {IconComponent && (
                <IconComponent className={cn(
                  "w-4 h-4",
                  isSelected ? "text-white" : "text-muted-foreground"
                )} />
              )}
              <span className={cn(
                "text-sm transition-colors",
                isSelected ? "text-white font-bold" : "text-foreground font-medium"
              )}>
                {option.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <Button
        onClick={handleContinue}
        disabled={selected.length === 0}
        className="w-full bg-gradient-to-r from-cyan-500 to-primary hover:from-cyan-600 hover:to-primary/90"
      >
        {t('onboarding.continueWithDays', { count: selected.length })}
      </Button>
    </div>
  );
}
