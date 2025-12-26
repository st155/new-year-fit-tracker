import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trophy, Medal, Award, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeaderboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { UserHealthDetailDialog } from "@/components/leaderboard/UserHealthDetailDialog";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { formatPoints, getRankColorClass } from "@/features/challenges/utils";

export function Leaderboard() {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const { leaderboard, loading, error, refresh, challengeTitle } = useLeaderboard({ 
    limit: 5, 
    timePeriod: 'overall',
    autoRefresh: true,
    refreshInterval: 30000
  });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  console.log('🏆 [Leaderboard] Render:', {
    leaderboardLength: leaderboard?.length,
    loading,
    leaderboard: leaderboard
  });

  const handleUserClick = (e: React.MouseEvent, userEntry: any) => {
    e.stopPropagation();
    setSelectedUserId(userEntry.user_id);
    setSelectedUserName(userEntry.fullName || userEntry.username);
  };

  if (loading) {
    return <LeaderboardSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            {t('leaderboard.team')} {t('leaderboard.title')}
          </h3>
        </div>
        <Card className="border-2 border-destructive/20 bg-card/40 backdrop-blur-sm">
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm text-destructive font-medium">
              {t('leaderboard.errorLoading')}
            </p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button onClick={() => refresh()} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-3 w-3" />
              {t('leaderboard.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!loading && leaderboard.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            {t('leaderboard.team')} {t('leaderboard.title')}
          </h3>
        </div>
        <Card className="border-2 border-accent/20 bg-card/40 backdrop-blur-sm">
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('leaderboard.noData')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('leaderboard.noDataDesc')}
            </p>
            <Button onClick={() => refresh()} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-3 w-3" />
              {t('refresh')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 animate-fade-in">
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 cursor-pointer hover:opacity-80 transition-opacity group"
          onClick={() => navigate('/leaderboard')}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                {t('leaderboard.team')} {t('leaderboard.title')}
              </h3>
            </div>
            {challengeTitle && (
              <span className="text-xs text-muted-foreground ml-6">
                {challengeTitle}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            {t('leaderboard.viewFull')} →
          </span>
        </div>

        <Card className="border-2 border-accent/20 bg-card/40 backdrop-blur-sm hover:border-accent/30 transition-all duration-500">
          <CardContent className="p-4">
            <div className="space-y-2 stagger-fade-in">
            {leaderboard.slice(0, 5).map((item, index) => (
              <div 
                key={item.userId}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedUserId(item.userId);
                  setSelectedUserName(item.fullName || item.username);
                }}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl transition-all duration-500 cursor-pointer group",
                  "hover:bg-background/50 hover:scale-[1.02] active:scale-[0.98]",
                  item.isUser ? "bg-primary/10 border-2 border-primary/30" : "bg-background/20"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Rank badge */}
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm transition-all duration-500",
                    "group-hover:scale-110 group-hover:rotate-6",
                    `bg-gradient-to-br ${getRankColorClass(index + 1)}`,
                    index > 2 && "text-muted-foreground"
                  )}>
                    {index === 0 && <Trophy className="h-4 w-4" />}
                    {index === 1 && <Medal className="h-4 w-4" />}
                    {index === 2 && <Award className="h-3.5 w-3.5" />}
                    {index > 2 && (item.rank || index + 1)}
                  </div>

                  {/* Avatar and name */}
                  <Avatar className="h-10 w-10 border-2 border-border/50 transition-all duration-500 group-hover:scale-110">
                    <AvatarImage src={item.avatarUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {item.username?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-sm font-semibold transition-colors",
                        item.isUser ? "text-primary" : "text-foreground"
                      )}>
                        {item.username}
                        {item.isUser && <span className="ml-1.5 text-xs text-primary/70">(You)</span>}
                      </span>
                      {item.activeDays >= 3 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Active tracker - reliable data</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.activeDays} {t('leaderboard.activeDays')} • {item.streakDays > 0 ? `🔥${item.streakDays}` : ''}
                    </span>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">{formatPoints(item.totalPoints)}</div>
                  {item.badges.length > 0 && (
                    <div className="flex gap-0.5 justify-end">
                      {item.badges.slice(0, 3).map(badge => (
                        <span key={badge.id} className="text-xs" title={badge.description}>
                          {badge.icon}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {leaderboard.length > 5 && (
            <button
              onClick={() => navigate('/leaderboard')}
              className="w-full mt-3 py-2 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
            >
              {t('leaderboard.viewFull')} →
            </button>
          )}
        </CardContent>
      </Card>

        {/* User Stats Dialog */}
        <UserHealthDetailDialog
          userId={selectedUserId}
          userName={selectedUserName}
          open={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      </div>
    </TooltipProvider>
  );
}
