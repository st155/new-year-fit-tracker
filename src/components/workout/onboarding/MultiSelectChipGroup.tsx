import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
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
                "px-4 py-2 rounded-full border transition-all duration-300",
                "bg-background/50 backdrop-blur-sm",
                "hover:bg-background/80 hover:border-primary/50",
                "flex items-center gap-2",
                isSelected && "bg-primary/10 border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {IconComponent && (
                <IconComponent className={cn(
                  "w-4 h-4",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
              )}
              <span className={cn(
                "text-sm font-medium",
                isSelected ? "text-primary" : "text-foreground"
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
        Продолжить ({selected.length})
      </Button>
    </div>
  );
}
