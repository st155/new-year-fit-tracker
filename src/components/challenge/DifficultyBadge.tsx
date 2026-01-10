import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DifficultyBadgeProps {
  level: number;
  className?: string;
}

const DIFFICULTY_CONFIG = {
  0: { icon: "🎯", labelKey: "basic", color: "bg-blue-500" },
  1: { icon: "🔥", labelKey: "level1", color: "bg-orange-500" },
  2: { icon: "⚡", labelKey: "level2", color: "bg-purple-500" },
  3: { icon: "💀", labelKey: "level3", color: "bg-red-600" },
};

export function DifficultyBadge({ level, className }: DifficultyBadgeProps) {
  const { t } = useTranslation('challenges');
  
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
      {config.icon} {t(`difficultyBadge.${config.labelKey}`)}
    </Badge>
  );
}
