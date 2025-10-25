import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Lock, Check } from "lucide-react";
import type { Achievement } from "@/lib/achievements";
import { getRarityBadgeVariant } from "@/lib/achievements";

interface AchievementCardProps {
  achievement: Achievement;
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const progress = achievement.progress || 0;
  const isUnlocked = achievement.unlocked;
  const progressPercent = Math.min(100, (progress / achievement.requirement) * 100);

  return (
    <Card 
      className={cn(
        "transition-all duration-300 hover:scale-[1.02] cursor-pointer relative overflow-hidden",
        isUnlocked && "border-2",
        achievement.rarity === 'legendary' && isUnlocked && "animate-pulse"
      )}
      style={{
        borderColor: isUnlocked ? achievement.color : undefined,
        boxShadow: isUnlocked && achievement.rarity === 'legendary' 
          ? `0 0 20px ${achievement.glowColor}` 
          : undefined
      }}
    >
      <CardContent className="p-4 space-y-3">
        {/* Icon and Rarity */}
        <div className="flex items-start justify-between">
          <div 
            className={cn(
              "text-4xl flex items-center justify-center h-16 w-16 rounded-full",
              isUnlocked ? "bg-primary/10" : "bg-muted"
            )}
          >
            {isUnlocked ? achievement.icon : <Lock className="h-6 w-6 text-muted-foreground" />}
          </div>
          <Badge variant={getRarityBadgeVariant(achievement.rarity)} className="text-xs">
            {achievement.rarity}
          </Badge>
        </div>

        {/* Title and Description */}
        <div>
          <h3 className={cn(
            "font-bold text-lg mb-1",
            !isUnlocked && "text-muted-foreground"
          )}>
            {achievement.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {achievement.description}
          </p>
        </div>

        {/* Progress */}
        {!isUnlocked && (
          <div className="space-y-1">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress} / {achievement.requirement}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
          </div>
        )}

        {/* Unlocked Status */}
        {isUnlocked && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Check className="h-4 w-4" />
              <span>Unlocked</span>
            </div>
            {achievement.unlockedAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(achievement.unlockedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
