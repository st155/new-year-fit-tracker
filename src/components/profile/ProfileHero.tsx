import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trophy, Zap, Flame, Calendar, Plug, Pencil, Settings, LogOut, RotateCcw, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserLevel } from '@/hooks/useUserLevel';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

interface ProfileHeroProps {
  username: string;
  fullName: string;
  avatarUrl: string;
  userInitials: string;
  registeredAt?: string | null;
  activeIntegrationsCount?: number;
  streakDays?: number;
  onEditProfile?: () => void;
  onSignOut?: () => void;
  onResetOnboarding?: () => void;
  userId?: string;
}

export function ProfileHero({
  username,
  fullName,
  avatarUrl,
  userInitials,
  registeredAt,
  activeIntegrationsCount = 0,
  streakDays = 0,
  onEditProfile,
  onSignOut,
  onResetOnboarding,
  userId,
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

  const formatRegistrationDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'LLLL yyyy', { locale: ru });
    } catch {
      return '';
    }
  };

  const handleCopyUserId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      toast.success('User ID скопирован');
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 shadow-glow-primary overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10 pointer-events-none" />
      
      <CardContent className="p-6 relative">
        {/* Action Buttons - Top Right */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {onEditProfile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEditProfile}
              className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {userId && (
                <DropdownMenuItem onClick={handleCopyUserId} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Скопировать User ID
                </DropdownMenuItem>
              )}
              {onResetOnboarding && (
                <DropdownMenuItem onClick={onResetOnboarding} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Сбросить онбординг
                </DropdownMenuItem>
              )}
              {onSignOut && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSignOut} className="gap-2 text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {onSignOut && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onSignOut}
              className="gap-1.5 h-9"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Выйти</span>
            </Button>
          )}
        </div>

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
              <Avatar className="h-28 w-28 md:h-32 md:w-32 border-4 border-background shadow-xl">
                <AvatarImage src={avatarUrl} alt={username} />
                <AvatarFallback className="text-2xl md:text-3xl font-bold bg-gradient-primary text-white">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {levelInfo && (
                <Badge 
                  className={`absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r ${getLevelColor(levelInfo.level)} text-white border-0 shadow-lg px-3 py-1`}
                >
                  <Trophy className="h-3 w-3 mr-1" />
                  Lvl {levelInfo.level}
                </Badge>
              )}
            </div>
          </motion.div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {fullName || username}
              </h1>
              <p className="text-muted-foreground mt-1">
                @{username}
              </p>
            </div>

            {/* Quick Info Badges */}
            <div className="flex flex-wrap gap-2 items-center justify-center md:justify-start">
              {levelInfo && !isLoading && (
                <>
                  <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm font-semibold">
                    <Zap className="h-3.5 w-3.5 text-yellow-500" />
                    {levelInfo.totalXP} XP
                  </Badge>
                  <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm font-semibold">
                    <Trophy className="h-3.5 w-3.5 text-purple-500" />
                    {getLevelTitle(levelInfo.level)}
                  </Badge>
                </>
              )}
              {streakDays > 0 && (
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm font-semibold">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  {streakDays} дн. подряд
                </Badge>
              )}
              {activeIntegrationsCount > 0 && (
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm font-semibold">
                  <Plug className="h-3.5 w-3.5 text-green-500" />
                  {activeIntegrationsCount} интеграций
                </Badge>
              )}
              {registeredAt && (
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  С {formatRegistrationDate(registeredAt)}
                </Badge>
              )}
            </div>

            {/* Progress Bar */}
            {levelInfo && !isLoading && (
              <div className="mt-4 max-w-md mx-auto md:mx-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>До уровня {levelInfo.level + 1}</span>
                  <span className="font-semibold">{levelInfo.xpToNext} XP</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
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
