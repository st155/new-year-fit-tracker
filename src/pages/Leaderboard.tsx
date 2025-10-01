import { useState, useEffect, useCallback } from "react";
import { Trophy, TrendingUp, Award, Medal, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProgressCache } from "@/hooks/useProgressCache";
import { Button } from "@/components/ui/button";
import { SimpleVirtualList } from "@/components/ui/virtualized-list";
import { useIsMobile } from "@/hooks/use-mobile";

interface LeaderboardUser {
  rank: number;
  userId: string;
  name: string;
  avatarUrl?: string;
  points: number;
  trend: number;
  isCurrentUser?: boolean;
}

interface Challenge {
  id: string;
  title: string;
  icon?: string;
}

const LeaderboardPage = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    if (user) {
      fetchChallenges();
    }
  }, [user]);

  const fetchChallenges = async () => {
    if (!user) return;

    try {
      const { data: participations } = await supabase
        .from('challenge_participants')
        .select('challenge_id, challenges!inner(id, title)')
        .eq('user_id', user.id);

      if (participations && participations.length > 0) {
        const challengeList = participations.map((p: any) => ({
          id: p.challenge_id,
          title: p.challenges.title,
        }));
        setChallenges(challengeList);
        setSelectedChallenge(challengeList[0].id);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    }
  };

  const fetchLeaderboardData = useCallback(async () => {
    if (!user || !selectedChallenge) return [];

    try {
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select(`
          user_id,
          profiles!inner(username, full_name, avatar_url)
        `)
        .eq('challenge_id', selectedChallenge);

      if (!participants) {
        return [];
      }

      const leaderboard = await Promise.all(
        participants.map(async (participant: any) => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const [workoutsData, measurementsData] = await Promise.all([
            supabase
              .from('workouts')
              .select('calories_burned, duration_minutes')
              .eq('user_id', participant.user_id)
              .gte('start_time', thirtyDaysAgo.toISOString()),
            supabase
              .from('measurements')
              .select('value')
              .eq('user_id', participant.user_id)
              .gte('measurement_date', thirtyDaysAgo.toISOString().split('T')[0]),
          ]);

          let points = 0;

          const workouts = workoutsData.data || [];
          points += workouts.length * 50;

          const totalCalories = workouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0);
          points += Math.floor(totalCalories / 10);

          const totalMinutes = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
          points += Math.floor(totalMinutes / 5);

          const measurements = measurementsData.data || [];
          points += measurements.length * 20;

          const name = participant.profiles?.full_name || participant.profiles?.username || 'Пользователь';
          const isCurrentUser = participant.user_id === user.id;

          return {
            userId: participant.user_id,
            name: isCurrentUser ? 'Вы' : name,
            avatarUrl: participant.profiles?.avatar_url,
            points,
            trend: Math.floor(Math.random() * 30) - 10,
            isCurrentUser,
          };
        })
      );

      const sortedLeaderboard = leaderboard
        .sort((a, b) => b.points - a.points)
        .map((entry, index) => ({
          rank: index + 1,
          ...entry,
        }));

      return sortedLeaderboard;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }, [user, selectedChallenge]);

  const { data: leaderboardData, loading, fromCache, refetch } = useProgressCache(
    `leaderboard_${selectedChallenge}`,
    fetchLeaderboardData,
    [selectedChallenge]
  );

  const getRankStyle = (rank: number, isCurrentUser: boolean) => {
    if (rank === 1) {
      return "bg-gradient-to-br from-yellow-600 via-orange-600 to-orange-800 border-orange-500/30 shadow-[0_0_40px_rgba(234,179,8,0.5)]";
    }
    if (rank === 2) {
      return "bg-gradient-to-br from-slate-500 via-slate-600 to-slate-800 border-slate-400/30 shadow-[0_0_40px_rgba(148,163,184,0.5)]";
    }
    if (rank === 3) {
      return "bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 border-amber-600/30 shadow-[0_0_40px_rgba(217,119,6,0.5)]";
    }
    if (isCurrentUser) {
      return "bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-700 border-cyan-400/30 shadow-[0_0_40px_rgba(6,182,212,0.5)]";
    }
    return "bg-card/40 backdrop-blur-sm border-border/30";
  };

  const renderLeaderboardItem = (userEntry: LeaderboardUser, index: number) => {
    const isTopThree = userEntry.rank <= 3;
    const isCurrentUser = userEntry.isCurrentUser || false;

    return (
      <div
        className={cn(
          "rounded-3xl border-2 transition-all duration-300 overflow-hidden",
          getRankStyle(userEntry.rank, isCurrentUser),
          isTopThree || isCurrentUser ? "p-6" : "p-4"
        )}
      >
        {isTopThree ? (
          // Large cards for top 3
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="flex flex-col items-center min-w-[60px]">
                <div className="relative">
                  {userEntry.rank === 1 ? (
                    <Award className="w-14 h-14 text-yellow-200 drop-shadow-lg" />
                  ) : userEntry.rank === 2 ? (
                    <Medal className="w-14 h-14 text-slate-200 drop-shadow-lg" />
                  ) : (
                    <Medal className="w-14 h-14 text-amber-300 drop-shadow-lg" />
                  )}
                </div>
                <span className="text-3xl font-black text-white/90 mt-1">
                  {userEntry.rank}
                </span>
              </div>
              <Avatar className="w-16 h-16 border-4 border-white/40 shadow-xl">
                <AvatarImage src={userEntry.avatarUrl} />
                <AvatarFallback className="text-2xl font-bold bg-white/20">
                  {userEntry.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-2xl font-bold text-white drop-shadow-md">{userEntry.name}</h3>
                <p className="text-white/80 text-base font-medium">{userEntry.points} очков</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-green-500/90 px-4 py-2 rounded-full">
              <TrendingUp className="w-5 h-5 text-white" />
              <span className="text-base font-bold text-white">
                +{Math.abs(userEntry.trend)}
              </span>
            </div>
          </div>
        ) : isCurrentUser ? (
          // Highlighted card for current user
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center border-2 border-white/50">
                <span className="text-2xl font-black text-white">{userEntry.rank}</span>
              </div>
              <Avatar className="w-16 h-16 border-4 border-white/40">
                <AvatarImage src={userEntry.avatarUrl} />
                <AvatarFallback className="text-xl font-bold bg-white/20">
                  {userEntry.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold text-white">{userEntry.name}</h3>
                <p className="text-white/80 text-sm">{userEntry.points} очков</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-green-500/90 px-3 py-1.5 rounded-full">
              <TrendingUp className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white">
                +{Math.abs(userEntry.trend)}
              </span>
            </div>
          </div>
        ) : (
          // Compact cards for others
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-muted/50 backdrop-blur-sm flex items-center justify-center border border-border/50">
                <span className="text-base font-bold text-foreground">{userEntry.rank}</span>
              </div>
              <Avatar className="w-12 h-12 border-2 border-border/30">
                <AvatarImage src={userEntry.avatarUrl} />
                <AvatarFallback className="text-sm font-semibold">
                  {userEntry.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-base font-semibold text-foreground">{userEntry.name}</h3>
                <p className="text-sm text-muted-foreground">{userEntry.points} очков</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-green-500/80 px-3 py-1 rounded-full">
              <span className="text-sm font-bold text-white">
                +{Math.abs(userEntry.trend)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-8 overflow-y-auto bg-gradient-to-b from-background via-background to-background/80">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h1 className="text-4xl font-bold tracking-tight">TEAM LEADERBOARD</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          Отслеживайте прогресс команды и соревнуйтесь за место на вершина! {fromCache && '(кэш)'}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={loading && !fromCache}
          className="mt-2 h-8 w-8 p-0"
        >
          <RefreshCw className={cn("h-4 w-4", loading && !fromCache && "animate-spin")} />
        </Button>
      </div>

      {/* Challenge Filter Buttons */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 justify-center">
        {challenges.map((challenge) => (
          <button
            key={challenge.id}
            onClick={() => setSelectedChallenge(challenge.id)}
            className={cn(
              "px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap flex items-center gap-2 border-2",
              selectedChallenge === challenge.id
                ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-yellow-400/50 shadow-[0_0_25px_rgba(234,179,8,0.6)]"
                : "bg-card/50 backdrop-blur-sm border-border/50 text-muted-foreground hover:border-border hover:bg-card/80"
            )}
          >
            {selectedChallenge === challenge.id && <Trophy className="w-4 h-4" />}
            {challenge.title}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="max-w-3xl mx-auto">
        {loading && !fromCache ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-3xl p-4 h-24 animate-pulse bg-card/50" />
            ))}
          </div>
        ) : (
          <>
            {/* Use virtualization for long lists on mobile */}
            {isMobile && (leaderboardData || []).length > 20 ? (
              <SimpleVirtualList
                items={leaderboardData || []}
                renderItem={(userEntry, index) => renderLeaderboardItem(userEntry, index)}
                threshold={10}
              />
            ) : (
              <div className="space-y-4">
                {(leaderboardData || []).map((userEntry, index) => (
                  <div key={`${userEntry.userId}-${userEntry.rank}`}>
                    {renderLeaderboardItem(userEntry, index)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {(!leaderboardData || leaderboardData.length === 0) && !loading && (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Нет данных по участникам челленджа
          </p>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
