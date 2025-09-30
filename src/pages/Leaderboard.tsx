import { useState, useEffect } from "react";
import { Trophy, TrendingUp, TrendingDown, Award, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChallenges();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChallenge) {
      fetchLeaderboard();
    }
  }, [selectedChallenge, user]);

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

  const fetchLeaderboard = async () => {
    if (!user || !selectedChallenge) return;

    setLoading(true);
    try {
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select(`
          user_id,
          profiles!inner(username, full_name, avatar_url)
        `)
        .eq('challenge_id', selectedChallenge);

      if (!participants) {
        setLeaderboardData([]);
        setLoading(false);
        return;
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

      setLeaderboardData(sortedLeaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank: number, isCurrentUser: boolean) => {
    if (rank === 1) {
      return "bg-gradient-to-br from-yellow-500 via-yellow-600 to-amber-700 border-yellow-400/50 shadow-[0_0_30px_rgba(234,179,8,0.4)]";
    }
    if (rank === 2) {
      return "bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 border-gray-400/50 shadow-[0_0_30px_rgba(156,163,175,0.4)]";
    }
    if (isCurrentUser) {
      return "bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.4)]";
    }
    return "glass border-white/10";
  };

  const getRankIconColor = (rank: number) => {
    if (rank === 1) return "text-yellow-300";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-orange-400";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
          TEAM LEADERBOARD
        </h1>
        <p className="text-muted-foreground text-sm">
          Отслеживайте прогресс команды и сразитесь за место на вершине!
        </p>
      </div>

      {/* Challenge Filter Buttons */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {challenges.map((challenge) => (
          <button
            key={challenge.id}
            onClick={() => setSelectedChallenge(challenge.id)}
            className={cn(
              "px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap flex items-center gap-2",
              selectedChallenge === challenge.id
                ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-[0_0_20px_rgba(234,179,8,0.5)]"
                : "glass border border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {selectedChallenge === challenge.id && <Trophy className="w-4 h-4" />}
            {challenge.title}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass rounded-2xl p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboardData.map((userEntry) => {
            const isTopTwo = userEntry.rank <= 2;
            const isCompact = !isTopTwo && !userEntry.isCurrentUser;

            return (
              <div
                key={`${userEntry.userId}-${userEntry.rank}`}
                className={cn(
                  "rounded-2xl border-2 transition-all duration-300 overflow-hidden",
                  getRankStyle(userEntry.rank, userEntry.isCurrentUser || false),
                  isTopTwo || userEntry.isCurrentUser ? "p-6" : "p-4"
                )}
              >
                {isTopTwo ? (
                  // Large cards for Gold & Silver
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        {userEntry.rank === 1 ? (
                          <Award className="w-12 h-12 text-yellow-300" />
                        ) : (
                          <Medal className="w-12 h-12 text-gray-300" />
                        )}
                        <span className="text-xs font-bold text-white/80 mt-1">
                          {userEntry.rank === 1 ? '1st' : '2nd'}
                        </span>
                      </div>
                      <Avatar className="w-16 h-16 border-4 border-white/30">
                        <AvatarImage src={userEntry.avatarUrl} />
                        <AvatarFallback className="text-lg font-bold">
                          {userEntry.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold text-white">{userEntry.name}</h3>
                        <p className="text-white/70 text-sm">{userEntry.points} очков</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {userEntry.trend > 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-300" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-300" />
                      )}
                      <span className="text-sm font-semibold text-white/90">
                        {userEntry.trend > 0 ? '+' : ''}{userEntry.trend}%
                      </span>
                    </div>
                  </div>
                ) : userEntry.isCurrentUser ? (
                  // Highlighted card for current user
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">{userEntry.rank}</span>
                      </div>
                      <Avatar className="w-14 h-14 border-4 border-white/30">
                        <AvatarImage src={userEntry.avatarUrl} />
                        <AvatarFallback className="text-lg font-bold">
                          {userEntry.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-bold text-white">{userEntry.name}</h3>
                        <p className="text-white/70 text-sm">{userEntry.points} очков</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {userEntry.trend > 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-300" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-300" />
                      )}
                      <span className="text-sm font-semibold text-white">
                        {userEntry.trend > 0 ? '+' : ''}{userEntry.trend}%
                      </span>
                    </div>
                  </div>
                ) : (
                  // Compact cards for others
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full glass-strong flex items-center justify-center">
                        <span className={cn("text-sm font-bold", getRankIconColor(userEntry.rank))}>
                          {userEntry.rank}
                        </span>
                      </div>
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={userEntry.avatarUrl} />
                        <AvatarFallback className="text-sm font-semibold">
                          {userEntry.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{userEntry.name}</h3>
                        <p className="text-xs text-muted-foreground">{userEntry.points} очков</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {userEntry.trend > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-xs font-medium text-muted-foreground">
                        {userEntry.trend > 0 ? '+' : ''}{userEntry.trend}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {leaderboardData.length === 0 && !loading && (
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
