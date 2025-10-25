import { useState } from "react";
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
import { getUserLevel } from "@/lib/gamification";

const Leaderboard = () => {
  const { t } = useTranslation();
  const { leaderboard, loading, userEntry } = useLeaderboard();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overall');

  if (loading) {
    return <PageLoader message="Loading leaderboard..." />;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6 animate-fade-in">
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

                {/* Top 3 Podium */}
                {leaderboard.length >= 3 && (
                  <div className="grid grid-cols-3 gap-4">
                    {/* 2nd Place */}
                    <Card className="mt-8 hover:scale-[1.02] transition-all cursor-pointer" onClick={() => {
                      setSelectedUserId(leaderboard[1].userId);
                      setSelectedUserName(leaderboard[1].username);
                    }}>
                      <CardContent className="p-6 text-center">
                        <div className="flex flex-col items-center gap-3">
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
                      </CardContent>
                    </Card>

                    {/* 1st Place */}
                    <Card className="border-2 border-primary hover:scale-[1.02] transition-all cursor-pointer" onClick={() => {
                      setSelectedUserId(leaderboard[0].userId);
                      setSelectedUserName(leaderboard[0].username);
                    }}>
                      <CardContent className="p-6 text-center">
                        <div className="flex flex-col items-center gap-3">
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
                      </CardContent>
                    </Card>

                    {/* 3rd Place */}
                    <Card className="mt-8 hover:scale-[1.02] transition-all cursor-pointer" onClick={() => {
                      setSelectedUserId(leaderboard[2].userId);
                      setSelectedUserName(leaderboard[2].username);
                    }}>
                      <CardContent className="p-6 text-center">
                        <div className="flex flex-col items-center gap-3">
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
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Full Rankings */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Full Rankings</h3>
                    <div className="space-y-3">
                      {leaderboard.map((item, index) => {
                        const level = getUserLevel(item.totalPoints);
                        return (
                          <div 
                            key={item.userId}
                            onClick={() => {
                              setSelectedUserId(item.userId);
                              setSelectedUserName(item.username);
                            }}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-lg transition-all cursor-pointer hover:bg-accent/50 hover:scale-[1.01]",
                              item.isUser ? "bg-primary/10 border-2 border-primary/30" : "bg-background/50"
                            )}
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-full font-bold shrink-0",
                                `bg-gradient-to-br ${getRankColorClass(index + 1)}`,
                                index > 2 && "text-muted-foreground"
                              )}>
                                {index + 1}
                              </div>

                              <Avatar className="h-12 w-12 shrink-0">
                                <AvatarImage src={item.avatarUrl} />
                                <AvatarFallback>{item.username?.[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>

                              <div className="flex-1 min-w-0">
                                <div className="font-semibold flex items-center gap-2 flex-wrap">
                                  <span className="text-lg" title={level.title}>{level.icon}</span>
                                  <span>{item.username}</span>
                                  {item.isUser && <span className="text-xs text-primary">(You)</span>}
                                </div>
                                
                                {/* Metrics Summary */}
                                <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Flame className="h-3 w-3" />
                                    {item.activeDays} days
                                  </span>
                                  {item.streakDays > 0 && (
                                    <span className="flex items-center gap-1 text-orange-500">
                                      🔥 {item.streakDays} streak
                                    </span>
                                  )}
                                  {item.avgRecovery > 0 && (
                                    <span className="flex items-center gap-1">
                                      ⚡ {item.avgRecovery}%
                                    </span>
                                  )}
                                  {item.avgSleep > 0 && (
                                    <span className="flex items-center gap-1">
                                      😴 {item.avgSleep}h
                                    </span>
                                  )}
                                </div>

                                {/* Badges */}
                                {item.badges.length > 0 && (
                                  <div className="flex gap-1 flex-wrap mt-2">
                                    {item.badges.slice(0, 3).map(badge => (
                                      <Badge 
                                        key={badge.id} 
                                        variant="secondary" 
                                        className="text-xs py-0 px-2"
                                        title={badge.description}
                                      >
                                        {badge.icon} {badge.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-2xl font-bold text-primary">{formatPoints(item.totalPoints)}</div>
                                <div className="text-xs text-muted-foreground">{t('leaderboard.points')}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
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
    </div>
  );
};

export default Leaderboard;
