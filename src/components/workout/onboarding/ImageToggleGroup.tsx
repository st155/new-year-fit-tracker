import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ToggleOption {
  value: string;
  label: string;
  image: string;
}

interface Category {
  name: string;
  label: string;
  options: ToggleOption[];
}

interface ImageToggleGroupProps {
  categories: Category[];
  onSubmit: (values: Record<string, string>) => void;
}

export function ImageToggleGroup({ categories, onSubmit }: ImageToggleGroupProps) {
  const [selected, setSelected] = useState<Record<string, string>>({});

  const handleSelect = (categoryName: string, value: string) => {
    setSelected(prev => ({ ...prev, [categoryName]: value }));
  };

  const handleContinue = () => {
    onSubmit(selected);
  };

  const handleSkip = () => {
    onSubmit({});
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      {categories.map((category) => (
        <div key={category.name} className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {category.label}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {category.options.map((option) => {
              const isSelected = selected[category.name] === option.value;
              return (
                <motion.button
                  key={option.value}
                  onClick={() => handleSelect(category.name, option.value)}
                  className={cn(
                    "relative aspect-square rounded-xl border-2 transition-all duration-300 overflow-hidden",
                    "bg-gradient-to-br from-primary/10 to-secondary/10",
                    isSelected && "border-primary shadow-[0_0_20px_rgba(var(--primary),0.4)]"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn(
                      "text-4xl font-bold",
                      isSelected ? "text-primary" : "text-muted-foreground/30"
                    )}>
                      {option.label.charAt(0)}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-background/80 backdrop-blur-sm">
                    <p className={cn(
                      "text-xs font-medium text-center",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {option.label}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex gap-2 mt-2">
        <Button
          onClick={handleSkip}
          variant="outline"
          className="flex-1"
        >
          Пропустить
        </Button>
        <Button
          onClick={handleContinue}
          className="flex-1 bg-gradient-to-r from-cyan-500 to-primary hover:from-cyan-600 hover:to-primary/90"
        >
          Продолжить
        </Button>
      </div>
    </div>
  );
}
