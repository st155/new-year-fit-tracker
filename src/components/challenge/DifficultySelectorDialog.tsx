import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DifficultyCard } from "./DifficultyCard";
import { 
  BENCHMARK_STANDARDS, 
  AUDIENCE_LEVEL_LABELS
} from '@/lib/benchmark-standards';

interface DifficultySelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (level: number) => void;
  disciplines?: Array<{
    discipline_name: string;
    benchmark_value: number;
    unit: string;
  }>;
}

const DIFFICULTY_LEVELS = [
  {
    level: 0,
    icon: "🎯",
    title: "Базовый",
    multiplier: "1.0x",
    description: "Стандартные цели челленджа",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    level: 1,
    icon: "🔥",
    title: "Повышенный",
    multiplier: "1.3x",
    description: "+30% к каждой цели",
    gradient: "from-orange-500 to-red-500",
  },
  {
    level: 2,
    icon: "⚡",
    title: "Экстремальный",
    multiplier: "1.6x",
    description: "+60% к каждой цели",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    level: 3,
    icon: "💀",
    title: "Нечеловеческий",
    multiplier: "1.9x",
    description: "+90% к каждой цели",
    gradient: "from-red-600 to-black",
  },
];

const DISCIPLINE_TO_STANDARD: Record<string, {
  key: string;
  direction: 'higher' | 'lower' | 'target';
}> = {
  'Шаги': { key: 'steps', direction: 'higher' },
  'Сон': { key: 'sleep', direction: 'target' },
  'Recovery': { key: 'recovery_score', direction: 'higher' },
  'RHR': { key: 'rhr', direction: 'lower' },
  'HRV': { key: 'hrv', direction: 'higher' },
  'VO2 Max': { key: 'vo2max_male', direction: 'higher' },
  '5K Run': { key: 'run_5k', direction: 'lower' },
  'Body Fat': { key: 'bodyfat_male', direction: 'lower' },
};

export function DifficultySelectorDialog({
  open,
  onOpenChange,
  onConfirm,
  disciplines = [],
}: DifficultySelectorDialogProps) {
  const [selectedLevel, setSelectedLevel] = useState(0);

  const getExamples = (level: number) => {
    if (disciplines.length > 0) {
      return disciplines.slice(0, 3).map((d) => {
        const mapping = DISCIPLINE_TO_STANDARD[d.discipline_name];
        
        if (mapping && BENCHMARK_STANDARDS[mapping.key]) {
          // Используем правильные стандарты из benchmark-standards.ts
          const standard = BENCHMARK_STANDARDS[mapping.key];
          const audienceLevel = level; // 0=beginner, 1=intermediate, 2=advanced, 3=elite
          const levelKey = AUDIENCE_LEVEL_LABELS[audienceLevel];
          const range = standard[levelKey];
          
          // Для difficulty используем target значение из соответствующего уровня
          const value = range.target;
          
          return `${d.discipline_name}: ${value} ${d.unit}`;
        }
        
        // Fallback: используем старую логику с ограничениями
        const multiplier = 1.0 + level * 0.3;
        let value = d.benchmark_value * multiplier;
        
        // Применяем ограничения
        if (d.discipline_name.includes('Recovery')) {
          value = Math.min(value, 100); // Максимум 100%
        } else if (d.discipline_name.includes('Сон') || d.discipline_name.includes('Sleep')) {
          value = Math.min(value, 8.5); // Максимум 8.5 часов
        } else if (d.discipline_name.includes('RHR')) {
          value = Math.max(value, 40); // Минимум 40 для elite
        }
        
        value = Math.round(value * 10) / 10;
        return `${d.discipline_name}: ${value} ${d.unit}`;
      });
    }

    // Default examples - используем правильные стандарты
    const audienceLevel = level;
    const levelKey = AUDIENCE_LEVEL_LABELS[audienceLevel];
    const stepsValue = BENCHMARK_STANDARDS.steps[levelKey].target;
    const sleepValue = BENCHMARK_STANDARDS.sleep[levelKey].target;
    const recoveryValue = BENCHMARK_STANDARDS.recovery_score[levelKey].target;
    
    return [
      `Шаги: ${stepsValue} в день`,
      `Сон: ${sleepValue} часов`,
      `Recovery: ${recoveryValue}%`,
    ];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Выберите уровень сложности 💪
          </DialogTitle>
          <DialogDescription>
            Увеличьте свои цели для большего вызова. Каждый уровень увеличивает
            все бенчмарки на 30%.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {DIFFICULTY_LEVELS.map((config) => (
            <DifficultyCard
              key={config.level}
              {...config}
              examples={getExamples(config.level)}
              selected={selectedLevel === config.level}
              onSelect={() => {
                setSelectedLevel(config.level);
                onConfirm(config.level);
              }}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
