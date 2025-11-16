import { motion } from 'framer-motion';
import { Minus, Plus, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WeightSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suggestion?: {
    suggestedWeight: number;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
  } | null;
}

export default function WeightSlider({
  value,
  onChange,
  min = 0,
  max = 200,
  step = 2.5,
  suggestion
}: WeightSliderProps) {
  const handleQuickChange = (delta: number) => {
    const newValue = Math.max(min, Math.min(max, value + delta));
    onChange(newValue);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
    >
      <div className="text-center mb-6">
        <div className="text-6xl font-bold text-primary mb-2">
          {value}<span className="text-3xl text-muted-foreground">kg</span>
        </div>
        <p className="text-sm text-muted-foreground">Weight</p>
        
        {/* Smart Suggestion */}
        {suggestion && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-3">
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer backdrop-blur-xl bg-primary/10 border-primary/30 hover:bg-primary/20 transition-colors"
                  >
                    <Lightbulb className="w-3 h-3 mr-1" />
                    Рекомендуем: {suggestion.suggestedWeight}кг
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{suggestion.reason}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {suggestion && value !== suggestion.suggestedWeight && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(suggestion.suggestedWeight)}
            className="mt-2 text-xs backdrop-blur-xl bg-white/5 hover:bg-white/10"
          >
            Использовать рекомендованный
          </Button>
        )}
      </div>
      
      <Slider
        value={[value]}
        onValueChange={([newValue]) => onChange(newValue)}
        min={min}
        max={max}
        step={step}
        className="mb-6"
      />
      
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickChange(-5)}
          className="backdrop-blur-xl bg-white/5 hover:bg-white/10 border-white/10 min-w-[60px]"
        >
          <Minus className="w-4 h-4 mr-1" />
          5kg
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickChange(-2.5)}
          className="backdrop-blur-xl bg-white/5 hover:bg-white/10 border-white/10 min-w-[70px]"
        >
          <Minus className="w-4 h-4 mr-1" />
          2.5kg
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickChange(2.5)}
          className="backdrop-blur-xl bg-white/5 hover:bg-white/10 border-white/10 min-w-[70px]"
        >
          <Plus className="w-4 h-4 mr-1" />
          2.5kg
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickChange(5)}
          className="backdrop-blur-xl bg-white/5 hover:bg-white/10 border-white/10 min-w-[60px]"
        >
          <Plus className="w-4 h-4 mr-1" />
          5kg
        </Button>
      </div>
    </motion.div>
  );
}
