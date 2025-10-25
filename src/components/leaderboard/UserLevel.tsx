import { Progress } from "@/components/ui/progress";
import { getUserLevel, getNextLevel, getLevelProgress } from "@/lib/gamification";
import { cn } from "@/lib/utils";

interface UserLevelProps {
  totalPoints: number;
  compact?: boolean;
}

export function UserLevel({ totalPoints, compact = false }: UserLevelProps) {
  const currentLevel = getUserLevel(totalPoints);
  const nextLevel = getNextLevel(totalPoints);
  const progress = getLevelProgress(totalPoints);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xl" title={currentLevel.title}>{currentLevel.icon}</span>
        <span className="text-sm font-medium">{currentLevel.title}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center text-2xl",
              `bg-gradient-to-br ${currentLevel.gradient} shadow-lg`
            )}
          >
            {currentLevel.icon}
          </div>
          <div>
            <div className="font-bold text-lg">{currentLevel.title}</div>
            <div className="text-sm text-muted-foreground">Level {currentLevel.level}</div>
          </div>
        </div>
        {nextLevel && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Next: {nextLevel.title}</div>
            <div className="text-sm font-medium">{nextLevel.minPoints - totalPoints} pts</div>
          </div>
        )}
      </div>
      
      {nextLevel && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{currentLevel.minPoints} pts</span>
            <span>{progress}%</span>
            <span>{nextLevel.minPoints} pts</span>
          </div>
        </div>
      )}
      
      {!nextLevel && (
        <div className="text-center py-2">
          <div className="text-sm font-medium text-primary">🎉 Max Level Reached!</div>
        </div>
      )}
    </div>
  );
}
