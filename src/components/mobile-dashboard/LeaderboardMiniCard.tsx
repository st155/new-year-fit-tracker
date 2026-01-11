import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function LeaderboardMiniCard() {
  const { t } = useTranslation('leaderboard');
  const { user } = useAuth();
  const { leaderboard, loading: isLoading, userEntry } = useLeaderboard();

  const userRank = userEntry ? leaderboard?.findIndex(entry => entry.userId === user?.id) + 1 : null;
  const totalParticipants = leaderboard?.length || 0;
  const userPoints = (userEntry as any)?.points || (userEntry as any)?.score || 0;

  const getRankIcon = () => {
    if (!userRank) return null;
    if (userRank === 1) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (userRank <= 3) return <Medal className="w-4 h-4 text-amber-500" />;
    return null;
  };

  const getRankColor = () => {
    if (!userRank) return 'text-foreground';
    if (userRank === 1) return 'text-yellow-500';
    if (userRank === 2) return 'text-slate-400';
    if (userRank === 3) return 'text-amber-600';
    return 'text-foreground';
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="min-w-[150px] p-3 rounded-2xl bg-card/50 border border-border/50 flex flex-col gap-2"
    >
      <Link to="/goals" className="flex flex-col gap-2 h-full">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-yellow-500" />
          </div>
          <span className="text-xs font-medium text-foreground">{t('miniCard.rating')}</span>
        </div>

        <div className="flex flex-col items-center py-1 flex-1 justify-center">
          {isLoading ? (
            <div className="space-y-2 w-full">
              <div className="h-8 w-12 mx-auto bg-muted/50 animate-pulse rounded" />
              <div className="h-3 w-16 mx-auto bg-muted/50 animate-pulse rounded" />
            </div>
          ) : userRank ? (
            <>
              <div className="flex items-center gap-1">
                {getRankIcon()}
                <span className={cn("text-2xl font-bold", getRankColor())}>
                  #{userRank}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {t('miniCard.outOf', { total: totalParticipants })}
              </span>
              {userPoints > 0 && (
                <span className="text-[10px] text-primary font-medium mt-1">
                  {t('miniCard.points', { points: userPoints.toLocaleString() })}
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground text-center">
              {t('miniCard.joinChallenge')}
            </span>
          )}
        </div>

        <div className="text-[10px] text-primary mt-auto text-center">{t('miniCard.viewTable')}</div>
      </Link>
    </motion.div>
  );
}
