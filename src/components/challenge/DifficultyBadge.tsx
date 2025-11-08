import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DifficultyBadgeProps {
  level: number;
  className?: string;
}

const DIFFICULTY_CONFIG = {
  0: { icon: "🎯", label: "Базовый", color: "bg-blue-500" },
  1: { icon: "🔥", label: "+1 Level", color: "bg-orange-500" },
  2: { icon: "⚡", label: "+2 Level", color: "bg-purple-500" },
  3: { icon: "💀", label: "+3 Level", color: "bg-red-600" },
};

export function DifficultyBadge({ level, className }: DifficultyBadgeProps) {
  if (level === 0) return null;

  const config = DIFFICULTY_CONFIG[level as keyof typeof DIFFICULTY_CONFIG];
  
  if (!config) return null;

  return (
    <Badge
      className={cn(
        "text-white font-semibold",
        config.color,
        className
      )}
    >
      {config.icon} {config.label}
    </Badge>
  );
}
