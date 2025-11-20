import { Sunrise, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupplementTimelineProps {
  times: string[];
  className?: string;
}

export function SupplementTimeline({ times, className }: SupplementTimelineProps) {
  const timeLabels = {
    morning: { icon: Sunrise, label: "Morning", color: "text-amber-500" },
    afternoon: { icon: Sun, label: "Afternoon", color: "text-orange-500" },
    evening: { icon: Moon, label: "Evening", color: "text-indigo-500" },
  };

  return (
    <div className={cn("flex gap-3", className)}>
      {times.map((time) => {
        const timeData = timeLabels[time as keyof typeof timeLabels];
        if (!timeData) return null;

        const Icon = timeData.icon;
        return (
          <div key={time} className="flex items-center gap-1.5">
            <Icon className={cn("h-4 w-4", timeData.color)} />
            <span className="text-xs text-muted-foreground">{timeData.label}</span>
          </div>
        );
      })}
    </div>
  );
}
