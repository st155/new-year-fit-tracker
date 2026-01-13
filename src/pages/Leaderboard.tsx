import { useState, useEffect, useMemo } from "react";
import { AnimatedPage } from "@/components/layout/AnimatedPage";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations-v3";
import { HoverBorderGradient } from "@/components/aceternity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Award, Flame, RefreshCw, Info, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/page-loader";
import { useTranslation } from 'react-i18next';
import { UserHealthDetailDialog } from "@/components/leaderboard/UserHealthDetailDialog";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuth } from "@/hooks/useAuth";
import { formatPoints, getRankColorClass } from "@/features/challenges/utils";
import { PersonalStatsCard } from "@/components/leaderboard/PersonalStatsCard";
import { LeaderboardTabs, type RankingType } from "@/components/leaderboard/LeaderboardTabs";
import { AchievementsGallery } from "@/components/leaderboard/AchievementsGallery";
import { FeaturedAchievements } from "@/components/leaderboard/FeaturedAchievements";
import { DailyChallenges } from "@/components/leaderboard/DailyChallenges";
import { LeaderboardCategoryLeaders, CategoryInfo } from "@/components/leaderboard/LeaderboardCategoryLeaders";
import { CategoryLeaderboardDialog } from "@/components/leaderboard/CategoryLeaderboardDialog";
import { LeaderboardUserCard } from "@/components/leaderboard/LeaderboardUserCard";
import { getUserLevel } from "@/lib/gamification";
import { LeaveOtherChallengesButton } from "@/components/leaderboard/LeaveOtherChallengesButton";
import { ChallengeSelector } from "@/components/leaderboard/ChallengeSelector";
import { usePreferredChallengeQuery, type LeaderboardEntry } from "@/features/challenges";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Leaderboard = () => {
  const { t } = useTranslation('leaderboard');
  const { user, loading: authLoading } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overall');
  const [selectedCategory, setSelectedCategory] = useState<CategoryInfo | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  
  // Determine if activeTab is a ranking type or time period
  const isRankingTab = ['activity', 'recovery', 'progress', 'balance'].includes(activeTab);
  const timePeriod = isRankingTab ? 'overall' : (activeTab === 'week' ? 'week' : activeTab === 'month' ? 'month' : 'overall');
  const rankingType = isRankingTab ? activeTab as RankingType : 'overall';
  
  const { 
    challengeId: preferredChallengeId, 
    challenges, 
    setPreferredChallenge,
    isLoading: challengesLoading 
  } = usePreferredChallengeQuery(user?.id);

  const { 
    leaderboard: rawLeaderboard, 
    loading: leaderboardLoading, 
    userEntry, 
    error, 
    refresh, 
    challengeTitle
  } = useLeaderboard({ timePeriod, challengeId: preferredChallengeId });
  
  // Sort leaderboard based on ranking type
  const leaderboard = useMemo(() => {
    if (!rawLeaderboard.length) return rawLeaderboard;
    
    const sorted = [...rawLeaderboard].sort((a, b) => {
      switch (rankingType) {
        case 'activity':
          return (b.activityScore || 0) - (a.activityScore || 0);
        case 'recovery':
          return (b.recoveryScore || 0) - (a.recoveryScore || 0);
        case 'progress':
          return (b.progressScore || 0) - (a.progressScore || 0);
        case 'balance':
          return (b.balanceScore || 0) - (a.balanceScore || 0);
        default:
          return b.totalPoints - a.totalPoints;
      }
    });
    
    // Update ranks after sorting
    return sorted.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }, [rawLeaderboard, rankingType]);
  
  const isLoading = authLoading || leaderboardLoading;

  // Get score for current ranking type
  const getScoreForRankingType = (entry: LeaderboardEntry) => {
    switch (rankingType) {
      case 'activity':
        return entry.activityScore || 0;
      case 'recovery':
        return entry.recoveryScore || 0;
      case 'progress':
        return entry.progressScore || 0;
      case 'balance':
        return entry.balanceScore || 0;
      default:
        return entry.totalPoints;
    }
  };

  // Recalculate points handler
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const { error } = await supabase.functions.invoke('calculate-health-points', {
        body: { recalculate_all: true }
      });
      
      if (error) throw error;
      
      toast.success(t('recalculateSuccess'));
      refresh();
    } catch (err) {
      console.error('Recalculate error:', err);
      toast.error(t('recalculateError'));
    } finally {
      setIsRecalculating(false);
    }
  };

  console.log('[Leaderboard Page] State:', {
    authLoading,
    leaderboardLoading,
    isLoading,
    userId: user?.id,
    timePeriod,
    rankingType,
    leaderboardLength: leaderboard.length
  });

  // Auto-refresh when tab changes
  useEffect(() => {
    if (activeTab !== 'achievements') {
      refresh();
    }
  }, [activeTab]);

  if (isLoading) {
    return <PageLoader message={t('loading')} />;
  }

  return (
    <AnimatedPage className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{t('title')}</h1>
          </div>
          
          <ChallengeSelector
            currentChallengeId={preferredChallengeId}
            challenges={challenges}
            onChallengeChange={setPreferredChallenge}
            isLoading={challengesLoading}
          />
        </div>
        <div className="flex items-center gap-2">
          {user?.id && preferredChallengeId && challengeTitle && (
            <LeaveOtherChallengesButton
              userId={user.id}
              currentChallengeId={preferredChallengeId}
              challengeTitle={challengeTitle}
            />
          )}
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors disabled:opacity-50"
            title={t('recalculate')}
          >
            <Calculator className={cn("h-4 w-4", isRecalculating && "animate-pulse")} />
            <span className="text-sm font-medium hidden sm:inline">{isRecalculating ? t('recalculating') : t('recalculate')}</span>
          </button>
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            <span className="text-sm font-medium hidden sm:inline">{t('refresh')}</span>
          </button>
        </div>
      </div>

      {/* Ranking Type Header */}
      {isRankingTab && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold">{t(`rankings.${rankingType}`)}</h2>
            <p className="text-sm text-muted-foreground">{t(`rankings.${rankingType}Desc`)}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <LeaderboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <AchievementsGallery />
      )}

      {/* Leaderboard Tabs */}
      {activeTab !== 'achievements' && (
        <>
          {error ? (
            <Card>
              <CardContent className="p-12 text-center space-y-4">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-destructive" />
                <h3 className="text-xl font-semibold mb-2">{t('errorLoading')}</h3>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => refresh()} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('retry')}
                </Button>
              </CardContent>
            </Card>
          ) : leaderboard.length === 0 && !isLoading ? (
            <Card>
              <CardContent className="p-12 text-center space-y-4">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">{t('noChallenge')}</h3>
                <p className="text-muted-foreground">
                  {t('noChallengeDesc')}
                </p>
                <Button onClick={() => refresh()} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('refresh')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Stats Card */}
                {userEntry && (
                  <PersonalStatsCard userEntry={userEntry} leaderboard={leaderboard} />
                )}

                {/* Weekly Leaders */}
                {leaderboard.length > 0 && (
                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      Weekly Leaders
                    </h3>
                    <LeaderboardCategoryLeaders 
                      leaderboard={leaderboard}
                      onCategoryClick={setSelectedCategory}
                    />
                  </motion.div>
                )}

                {/* Top 3 Podium */}
                {leaderboard.length >= 3 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Top 3 Podium
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* 2nd Place - Silver */}
                      <HoverBorderGradient
                        containerClassName="mt-8"
                        className="glass-medium p-6 text-center w-full"
                        as="div"
                        duration={1.5}
                        clockwise={false}
                        gradientColors={['#C0C0C0', '#A8A8A8', '#D3D3D3']}
                      >
                        <div 
                          className="flex flex-col items-center gap-3 cursor-pointer"
                          onClick={() => {
                            setSelectedUserId(leaderboard[1].userId);
                            setSelectedUserName(leaderboard[1].fullName || leaderboard[1].username);
                          }}
                        >
                          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white shadow-lg">
                            <Medal className="h-8 w-8" />
                          </div>
                          <Avatar className="h-16 w-16 border-4 border-gray-400">
                            <AvatarImage src={leaderboard[1].avatarUrl} />
                            <AvatarFallback>{leaderboard[1].username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold flex items-center gap-1 justify-center">
                              <span className="text-xl">{getUserLevel(leaderboard[1].totalPoints).icon}</span>
                              <span>{leaderboard[1].username}</span>
                            </div>
                            <div className="text-2xl font-bold text-primary">{formatPoints(leaderboard[1].totalPoints)}</div>
                            <div className="text-xs text-muted-foreground">{t('points')}</div>
                          </div>
                        </div>
                      </HoverBorderGradient>

                      {/* 1st Place - Gold */}
                      <HoverBorderGradient
                        className="glass-medium p-6 text-center border-2 border-primary w-full"
                        as="div"
                        duration={2}
                        gradientColors={['#FFD700', '#FFA500', '#FFFF00']}
                      >
                        <div 
                          className="flex flex-col items-center gap-3 cursor-pointer"
                          onClick={() => {
                            setSelectedUserId(leaderboard[0].userId);
                            setSelectedUserName(leaderboard[0].fullName || leaderboard[0].username);
                          }}
                        >
                          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white shadow-xl animate-pulse">
                            <Trophy className="h-10 w-10" />
                          </div>
                          <Avatar className="h-20 w-20 border-4 border-yellow-500">
                            <AvatarImage src={leaderboard[0].avatarUrl} />
                            <AvatarFallback>{leaderboard[0].username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-lg flex items-center gap-1 justify-center">
                              <span className="text-2xl">{getUserLevel(leaderboard[0].totalPoints).icon}</span>
                              <span>{leaderboard[0].username}</span>
                            </div>
                            <div className="text-3xl font-bold text-primary">{formatPoints(leaderboard[0].totalPoints)}</div>
                            <div className="text-xs text-muted-foreground">{t('points')}</div>
                          </div>
                        </div>
                      </HoverBorderGradient>

                      {/* 3rd Place - Bronze */}
                      <HoverBorderGradient
                        containerClassName="mt-8"
                        className="glass-medium p-6 text-center w-full"
                        as="div"
                        duration={1}
                        gradientColors={['#CD7F32', '#B8860B', '#D2691E']}
                      >
                        <div 
                          className="flex flex-col items-center gap-3 cursor-pointer"
                          onClick={() => {
                            setSelectedUserId(leaderboard[2].userId);
                            setSelectedUserName(leaderboard[2].fullName || leaderboard[2].username);
                          }}
                        >
                          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-lg">
                            <Award className="h-8 w-8" />
                          </div>
                          <Avatar className="h-16 w-16 border-4 border-orange-500">
                            <AvatarImage src={leaderboard[2].avatarUrl} />
                            <AvatarFallback>{leaderboard[2].username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold flex items-center gap-1 justify-center">
                              <span className="text-xl">{getUserLevel(leaderboard[2].totalPoints).icon}</span>
                              <span>{leaderboard[2].username}</span>
                            </div>
                            <div className="text-2xl font-bold text-primary">{formatPoints(leaderboard[2].totalPoints)}</div>
                            <div className="text-xs text-muted-foreground">{t('points')}</div>
                          </div>
                        </div>
                      </HoverBorderGradient>
                    </div>
                  </div>
                )}

                {/* Full Rankings with Cards */}
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  <h3 className="text-xl font-semibold mb-4">Full Rankings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {leaderboard.map((entry, index) => (
                      <motion.div key={entry.userId} variants={staggerItem}>
                        <LeaderboardUserCard
                          user={{
                            userId: entry.userId,
                            username: entry.username,
                            full_name: entry.fullName || null,
                            avatar_url: entry.avatarUrl || null,
                            total_points: entry.totalPoints,
                            steps_last_7d: entry.steps_last_7d,
                            avg_strain_last_7d: entry.avg_strain_last_7d || undefined,
                            avg_sleep_last_7d: entry.avg_sleep_last_7d || undefined,
                            avg_recovery_last_7d: entry.avg_recovery_last_7d || undefined,
                            workouts_last_7d: entry.workouts_last_7d,
                            weekly_consistency: entry.weekly_consistency,
                          }}
                          rank={index + 1}
                          isUser={entry.isUser}
                          onClick={() => {
                            setSelectedUserId(entry.userId);
                            setSelectedUserName(entry.fullName || entry.username);
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Side Panel */}
              <div className="space-y-6">
                <DailyChallenges />
                <FeaturedAchievements />
              </div>
            </div>
          )}
        </>
      )}

      <UserHealthDetailDialog
        userId={selectedUserId}
        userName={selectedUserName}
        open={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />

      <CategoryLeaderboardDialog
        open={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        category={selectedCategory}
        leaderboard={leaderboard}
      />
    </AnimatedPage>
  );
};

export default Leaderboard;
