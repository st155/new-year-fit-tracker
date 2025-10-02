import { Lightbulb } from "lucide-react";

export function GlobalTicker() {
  const tips = [
    "Follow your plan and track your growth!",
    "Consistency is key to achieving your fitness goals!",
    "Stay hydrated and track your progress daily!",
    "Push yourself, because no one else is going to do it for you!",
  ];

  return (
    <div className="w-full bg-gradient-to-r from-background via-muted/30 to-background border-b border-border py-3 overflow-hidden">
      <div className="flex items-center gap-3">
        <Lightbulb className="h-5 w-5 text-primary shrink-0 ml-4 animate-pulse" />
        <div className="flex-1 overflow-hidden">
          <div className="flex gap-12 animate-[marquee_30s_linear_infinite] whitespace-nowrap">
            {[...tips, ...tips].map((tip, i) => (
              <span key={i} className="text-sm text-foreground/80 text-glow">
                Pro tip: {tip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
