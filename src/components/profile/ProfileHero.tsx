import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Zap, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserLevel } from '@/hooks/useUserLevel';

interface ProfileHeroProps {
  username: string;
  fullName: string;
  avatarUrl: string;
  userInitials: string;
  totalXP?: number;
  level?: number;
}

export function ProfileHero({
  username,
  fullName,
  avatarUrl,
  userInitials,
}: ProfileHeroProps) {
  const { levelInfo, isLoading } = useUserLevel();

  const getLevelColor = (level: number) => {
    if (level >= 50) return 'from-purple-500 to-pink-500';
    if (level >= 30) return 'from-blue-500 to-purple-500';
    if (level >= 20) return 'from-green-500 to-blue-500';
    if (level >= 10) return 'from-yellow-500 to-green-500';
    return 'from-gray-500 to-blue-500';
  };

  const getLevelTitle = (level: number) => {
    if (level >= 50) return 'Мастер';
    if (level >= 30) return 'Эксперт';
    if (level >= 20) return 'Профессионал';
    if (level >= 10) return 'Продвинутый';
    return 'Новичок';
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 shadow-glow-primary overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10 pointer-events-none" />
      
      <CardContent className="p-6 relative">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Avatar with Level Border */}
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <div 
              className={`absolute inset-0 bg-gradient-to-br ${
                levelInfo ? getLevelColor(levelInfo.level) : 'from-primary to-purple-500'
              } rounded-full blur-xl opacity-50`}
            />
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarImage src={avatarUrl} alt={username} />
                <AvatarFallback className="text-3xl font-bold bg-gradient-primary text-white">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {levelInfo && (
                <Badge 
                  className={`absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r ${getLevelColor(levelInfo.level)} text-white border-0 shadow-lg px-3 py-1`}
                >
                  <Trophy className="h-3 w-3 mr-1" />
                  Уровень {levelInfo.level}
                </Badge>
              )}
            </div>
          </motion.div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {fullName || username}
              </h1>
              <p className="text-muted-foreground mt-1">
                @{username}
              </p>
            </div>

            {/* Level Info */}
            {levelInfo && !isLoading && (
              <div className="flex flex-col sm:flex-row gap-3 items-center md:items-start justify-center md:justify-start">
                <Badge variant="outline" className="gap-2 px-4 py-2 text-sm font-semibold">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  {levelInfo.totalXP} XP
                </Badge>
                <Badge variant="outline" className="gap-2 px-4 py-2 text-sm font-semibold">
                  <Trophy className="h-4 w-4 text-purple-500" />
                  {getLevelTitle(levelInfo.level)}
                </Badge>
                {levelInfo.progressPercent >= 0 && (
                  <Badge variant="outline" className="gap-2 px-4 py-2 text-sm font-semibold">
                    <Flame className="h-4 w-4 text-orange-500" />
                    {levelInfo.progressPercent.toFixed(0)}% до уровня {levelInfo.level + 1}
                  </Badge>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {levelInfo && !isLoading && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Прогресс до следующего уровня</span>
                  <span className="font-semibold">{levelInfo.xpToNext} XP осталось</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${getLevelColor(levelInfo.level)} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${levelInfo.progressPercent}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
