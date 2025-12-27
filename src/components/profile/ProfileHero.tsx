import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Trophy, Zap, Flame, Calendar, Plug, Pencil, Settings, LogOut, RotateCcw, Copy, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserLevel } from '@/hooks/useUserLevel';
import { format, parseISO } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
  trainerMode?: boolean;
  onTrainerModeChange?: (value: boolean) => void;
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
  trainerMode = false,
  onTrainerModeChange,
}: ProfileHeroProps) {
  const { t, i18n } = useTranslation('profile');
  const { levelInfo, isLoading } = useUserLevel();

  const getLevelColor = (level: number) => {
    if (level >= 50) return 'from-purple-500 to-pink-500';
    if (level >= 30) return 'from-blue-500 to-purple-500';
    if (level >= 20) return 'from-green-500 to-blue-500';
    if (level >= 10) return 'from-yellow-500 to-green-500';
    return 'from-gray-500 to-blue-500';
  };

  const getLevelTitle = (level: number) => {
    if (level >= 50) return t('hero.levels.master');
    if (level >= 30) return t('hero.levels.expert');
    if (level >= 20) return t('hero.levels.professional');
    if (level >= 10) return t('hero.levels.advanced');
    return t('hero.levels.beginner');
  };

  const formatRegistrationDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      const locale = i18n.language === 'ru' ? ru : enUS;
      return format(parseISO(dateStr), 'LLLL yyyy', { locale });
    } catch {
      return '';
    }
  };

  const handleCopyUserId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      toast.success(t('hero.userIdCopied'));
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 shadow-glow-primary overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10 pointer-events-none" />
      
      <CardContent className="p-6 relative">
        {/* Action Buttons - Top Right */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {/* Trainer Mode Toggle - Most Prominent */}
          {onTrainerModeChange && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    className={`flex items-center gap-2 px-3 py-2 rounded-full cursor-pointer transition-all ${
                      trainerMode 
                        ? 'bg-green-500/20 border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                        : 'bg-muted/80 border border-border/50 backdrop-blur-sm hover:bg-muted'
                    }`}
                    animate={trainerMode ? { 
                      boxShadow: ['0 0 15px rgba(34,197,94,0.3)', '0 0 25px rgba(34,197,94,0.5)', '0 0 15px rgba(34,197,94,0.3)']
                    } : {}}
                    transition={trainerMode ? { duration: 2, repeat: Infinity } : {}}
                    onClick={() => onTrainerModeChange(!trainerMode)}
                  >
                    <Target className={`h-4 w-4 ${trainerMode ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-semibold hidden sm:inline ${trainerMode ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {t('hero.trainer')}
                    </span>
                    <Switch 
                      checked={trainerMode} 
                      onCheckedChange={onTrainerModeChange}
                      className="data-[state=checked]:bg-green-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-sm">{t('hero.trainerTooltip')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

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
                  {t('hero.copyUserId')}
                </DropdownMenuItem>
              )}
              {onResetOnboarding && (
                <DropdownMenuItem onClick={onResetOnboarding} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {t('hero.resetOnboarding')}
                </DropdownMenuItem>
              )}
              {onSignOut && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSignOut} className="gap-2 text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" />
                    {t('hero.signOut')}
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
              <span className="hidden sm:inline">{t('hero.signOut')}</span>
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
              {(levelInfo || trainerMode) && (
                <Badge 
                  className={`absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r ${
                    trainerMode 
                      ? 'from-green-500 to-emerald-600' 
                      : getLevelColor(levelInfo?.level || 1)
                  } text-white border-0 shadow-lg px-3 py-1`}
                >
                  {trainerMode ? (
                    <>
                      <Target className="h-3 w-3 mr-1" />
                      {t('hero.trainer')}
                    </>
                  ) : (
                    <>
                      <Trophy className="h-3 w-3 mr-1" />
                      {t('hero.level', { level: levelInfo?.level })}
                    </>
                  )}
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
                  {trainerMode ? (
                    <Badge 
                      variant="outline" 
                      className="gap-1.5 px-3 py-1.5 text-sm font-semibold border-green-500/50 bg-green-500/10"
                    >
                      <Target className="h-3.5 w-3.5 text-green-500" />
                      {t('hero.trainer')}
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm font-semibold">
                        <Zap className="h-3.5 w-3.5 text-yellow-500" />
                        {t('hero.xp', { xp: levelInfo.totalXP })}
                      </Badge>
                      <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm font-semibold">
                        <Trophy className="h-3.5 w-3.5 text-purple-500" />
                        {getLevelTitle(levelInfo.level)}
                      </Badge>
                    </>
                  )}
                </>
              )}
              {streakDays > 0 && (
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm font-semibold">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  {t('hero.streakDays', { count: streakDays })}
                </Badge>
              )}
              {activeIntegrationsCount > 0 && (
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm font-semibold">
                  <Plug className="h-3.5 w-3.5 text-green-500" />
                  {t('hero.integrations', { count: activeIntegrationsCount })}
                </Badge>
              )}
              {registeredAt && (
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {t('hero.memberSince', { date: formatRegistrationDate(registeredAt) })}
                </Badge>
              )}
            </div>

            {/* Progress Bar */}
            {levelInfo && !isLoading && (
              <div className="mt-4 max-w-md mx-auto md:mx-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{t('hero.toLevel', { level: levelInfo.level + 1 })}</span>
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
