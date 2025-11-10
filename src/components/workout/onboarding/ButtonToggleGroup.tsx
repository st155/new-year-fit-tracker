import { useState } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

interface ButtonToggleGroupProps {
  options: ButtonOption[];
  onSelect: (value: string) => void;
}

export function ButtonToggleGroup({ options, onSelect }: ButtonToggleGroupProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (value: string) => {
    setSelected(value);
    setTimeout(() => onSelect(value), 300);
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      {options.map((option) => {
        const IconComponent = option.icon ? (Icons as any)[option.icon] : null;
        const isSelected = selected === option.value;

        return (
          <motion.button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={cn(
              "relative p-4 rounded-xl border transition-all duration-300",
              "bg-background/50 backdrop-blur-sm",
              "hover:bg-background/80 hover:border-primary/50",
              isSelected && "bg-primary/10 border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              {IconComponent && (
                <div className={cn(
                  "p-2 rounded-lg",
                  isSelected ? "bg-primary/20" : "bg-muted"
                )}>
                  <IconComponent className={cn(
                    "w-5 h-5",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
              )}
              <div className="flex-1 text-left">
                <div className={cn(
                  "font-medium",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {option.label}
                </div>
                {option.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </div>
                )}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
