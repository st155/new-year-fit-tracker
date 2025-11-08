import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DifficultyCardProps {
  level: number;
  icon: string;
  title: string;
  multiplier: string;
  description: string;
  gradient?: string;
  examples: string[];
  selected: boolean;
  onSelect: () => void;
}

export function DifficultyCard({
  level,
  icon,
  title,
  multiplier,
  description,
  gradient,
  examples,
  selected,
  onSelect,
}: DifficultyCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105",
        selected && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={onSelect}
    >
      {gradient && (
        <div
          className={cn(
            "absolute inset-0 opacity-10 bg-gradient-to-br",
            gradient
          )}
        />
      )}
      
      <div className="relative p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-5xl">{icon}</div>
          <div className="text-right">
            <div className="text-2xl font-bold">{multiplier}</div>
            <div className="text-xs text-muted-foreground">множитель</div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Примеры целей:
          </p>
          {examples.map((example, idx) => (
            <div key={idx} className="text-sm flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{example}</span>
            </div>
          ))}
        </div>

        <Button
          variant={selected ? "default" : "outline"}
          className="w-full"
          onClick={onSelect}
        >
          {selected ? "Выбрано" : "Выбрать"}
        </Button>
      </div>
    </Card>
  );
}
