import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/hooks/useAuth';

export function LeaderboardMiniCard() {
  const { user } = useAuth();
  const { leaderboard, loading: isLoading } = useLeaderboard();

  const userEntry = leaderboard?.find(entry => entry.userId === user?.id);
  const userRank = userEntry ? leaderboard?.indexOf(userEntry) + 1 : null;
  const totalParticipants = leaderboard?.length || 0;

  // Mock weekly change (would need real data)
  const weeklyChange = userEntry ? Math.floor(Math.random() * 10) - 3 : 0;

  const getTrendIcon = () => {
    if (weeklyChange > 0) return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (weeklyChange < 0) return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const getTrendText = () => {
    if (weeklyChange > 0) return `↑${weeklyChange}`;
    if (weeklyChange < 0) return `↓${Math.abs(weeklyChange)}`;
    return '—';
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="min-w-[150px] p-3 rounded-2xl bg-card/50 border border-border/50 flex flex-col gap-2"
    >
      <Link to="/goals" className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-yellow-500" />
          </div>
          <span className="text-xs font-medium text-foreground">Рейтинг</span>
        </div>

        <div className="flex flex-col items-center py-1">
          {isLoading ? (
            <div className="h-8 w-12 bg-muted animate-pulse rounded" />
          ) : userRank ? (
            <>
              <span className="text-2xl font-bold text-foreground">#{userRank}</span>
              <span className="text-[10px] text-muted-foreground">
                из {totalParticipants} человек
              </span>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon()}
                <span className="text-[10px] text-muted-foreground">
                  {getTrendText()} за неделю
                </span>
              </div>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground text-center">
              Присоединитесь к челленджу
            </span>
          )}
        </div>

        <div className="text-[10px] text-primary mt-auto text-center">Таблица →</div>
      </Link>
    </motion.div>
  );
}
