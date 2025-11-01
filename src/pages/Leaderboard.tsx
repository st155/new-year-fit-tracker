import { useState } from "react";
import { AnimatedPage } from "@/components/layout/AnimatedPage";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { HoverBorderGradient } from "@/components/aceternity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Award, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/page-loader";
import { useTranslation } from "@/lib/translations";
import { UserHealthDetailDialog } from "@/components/leaderboard/UserHealthDetailDialog";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { formatPoints, getRankColorClass } from "@/lib/challenge-scoring-v3";
import { PersonalStatsCard } from "@/components/leaderboard/PersonalStatsCard";
import { LeaderboardTabs } from "@/components/leaderboard/LeaderboardTabs";
import { AchievementsGallery } from "@/components/leaderboard/AchievementsGallery";
import { FeaturedAchievements } from "@/components/leaderboard/FeaturedAchievements";
import { DailyChallenges } from "@/components/leaderboard/DailyChallenges";
import { LeaderboardCategoryLeaders } from "@/components/leaderboard/LeaderboardCategoryLeaders";
import { LeaderboardUserCard } from "@/components/leaderboard/LeaderboardUserCard";
import { getUserLevel } from "@/lib/gamification";

const Leaderboard = () => {
  const { t } = useTranslation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overall');
  
  // Map activeTab to timePeriod for the hook
  const timePeriod = activeTab === 'week' ? 'week' : activeTab === 'month' ? 'month' : 'overall';
  const { leaderboard, loading, userEntry } = useLeaderboard({ timePeriod });

  if (loading) {
    return <PageLoader message="Loading leaderboard..." />;
  }

  return (
    <AnimatedPage className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">{t('leaderboard.title')}</h1>
      </div>

      {/* Tabs */}
      <LeaderboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <AchievementsGallery />
      )}

      {/* Leaderboard Tabs */}
      {activeTab !== 'achievements' && (
        <>
          {leaderboard.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">{t('leaderboard.noChallenge')}</h3>
                <p className="text-muted-foreground">
                  {t('leaderboard.noChallengeDesc')}
                </p>
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
                    <LeaderboardCategoryLeaders leaderboard={leaderboard} />
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
                            <div className="text-xs text-muted-foreground">{t('leaderboard.points')}</div>
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
                            <div className="text-xs text-muted-foreground">{t('leaderboard.points')}</div>
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
                            <div className="text-xs text-muted-foreground">{t('leaderboard.points')}</div>
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
    </AnimatedPage>
  );
};

export default Leaderboard;
