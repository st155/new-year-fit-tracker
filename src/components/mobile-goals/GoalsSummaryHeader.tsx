import { motion } from "framer-motion";
import { Target, Trophy } from "lucide-react";
import { getUserLevel, getNextLevel, getLevelProgress } from "@/lib/gamification";
import { Progress } from "@/components/ui/progress";

interface GoalsSummaryHeaderProps {
  activeCount: number;
  completedCount: number;
  totalPoints: number;
}

export function GoalsSummaryHeader({ 
  activeCount, 
  completedCount, 
  totalPoints 
}: GoalsSummaryHeaderProps) {
  const currentLevel = getUserLevel(totalPoints);
  const nextLevel = getNextLevel(totalPoints);
  const progress = getLevelProgress(totalPoints);
  const pointsToNext = nextLevel ? nextLevel.minPoints - totalPoints : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 pt-4 pb-2"
    >
      {/* Level & Stats Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{currentLevel.icon}</span>
          <div>
            <p className="font-semibold text-foreground">{currentLevel.title}</p>
            <p className="text-xs text-muted-foreground">Lv.{currentLevel.level}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-medium">{activeCount}</span>
            <span className="text-muted-foreground">Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-warning" />
            <span className="font-medium">{completedCount}</span>
            <span className="text-muted-foreground">Done</span>
          </div>
        </div>
      </div>

      {/* Level Progress Bar */}
      <div className="space-y-1">
        <Progress 
          value={progress} 
          className="h-2 bg-muted/50"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress}%</span>
          {nextLevel && (
            <span>+{pointsToNext} pts to {nextLevel.title}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
