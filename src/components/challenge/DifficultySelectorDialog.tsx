import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DifficultyCard } from "./DifficultyCard";

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

export function DifficultySelectorDialog({
  open,
  onOpenChange,
  onConfirm,
  disciplines = [],
}: DifficultySelectorDialogProps) {
  const [selectedLevel, setSelectedLevel] = useState(0);

  const getExamples = (level: number) => {
    const multiplier = 1.0 + level * 0.3;
    
    if (disciplines.length > 0) {
      return disciplines.slice(0, 3).map((d) => {
        const value = Math.round(d.benchmark_value * multiplier * 10) / 10;
        return `${d.discipline_name}: ${value} ${d.unit}`;
      });
    }

    // Default examples
    return [
      `Шаги: ${Math.round(8000 * multiplier)} в день`,
      `Сон: ${Math.round(7.5 * multiplier * 10) / 10} часов`,
      `Recovery: ${Math.round(70 * multiplier)}%`,
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
