import { cn } from '@/lib/utils';

interface ChallengeMiniProgressProps {
  goals: number;
  completed: number;
  className?: string;
}

export function ChallengeMiniProgress({ goals, completed, className }: ChallengeMiniProgressProps) {
  const progress = (completed / goals) * 100;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
        {completed}/{goals}
      </span>
    </div>
  );
}
