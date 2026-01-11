import { Card, CardContent } from "@/components/ui/card";
import { useUserLevel } from "@/hooks/useUserLevel";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getLevelColor, getLevelTitle } from "@/lib/gamification/level-system";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function HabitLevelWidget() {
  const { levelInfo, isLoading } = useUserLevel();
  const navigate = useNavigate();
  const { t } = useTranslation('habits');

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!levelInfo) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4 text-center text-muted-foreground">
          <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t('level.startHabits')}</p>
        </CardContent>
      </Card>
    );
  }

  const color = getLevelColor(levelInfo.level);
  const title = getLevelTitle(levelInfo.level);

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
      onClick={() => navigate('/habits')}
      style={{ borderColor: `${color}30` }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${color}20` }}
            >
              <Trophy 
                className="h-5 w-5" 
                style={{ color }}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('level.habitLevel')}</p>
              <p className="text-sm font-semibold">{t('level.levelNumber', { level: levelInfo.level })}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color }}>
              {levelInfo.totalXP}
            </p>
            <p className="text-xs text-muted-foreground">XP</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{title}</span>
            <span className="font-medium">
              {t('level.xpToNext', { xp: levelInfo.xpToNext })}
            </span>
          </div>
          <Progress 
            value={levelInfo.progressPercent} 
            className="h-2"
            style={{
              // @ts-ignore
              '--progress-background': color,
            } as React.CSSProperties}
          />
          <p className="text-xs text-muted-foreground text-right">
            {levelInfo.progressPercent}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
