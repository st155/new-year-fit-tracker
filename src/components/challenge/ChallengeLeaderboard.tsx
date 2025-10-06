import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  points: number;
  posts_count: number;
  comments_count: number;
  likes_received: number;
  streak_days: number;
  profiles: {
    username: string;
    full_name: string;
    avatar_url?: string;
    trainer_role?: boolean;
  };
}

interface ChallengeLeaderboardProps {
  challengeId: string;
}

export const ChallengeLeaderboard = ({ challengeId }: ChallengeLeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [challengeId]);

  const fetchLeaderboard = async () => {
    try {
      // Получаем очки участников
      const { data: pointsData, error: pointsError } = await supabase
        .from('challenge_points')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('points', { ascending: false })
        .limit(10);

      if (pointsError) throw pointsError;
      if (!pointsData || pointsData.length === 0) {
        setLeaderboard([]);
        return;
      }

      // Получаем профили пользователей
      const userIds = pointsData.map(p => p.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, trainer_role')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Объединяем данные
      const combined = pointsData.map(points => {
        const profile = profilesData?.find(p => p.user_id === points.user_id);
        return {
          ...points,
          profiles: profile || { username: 'Unknown', full_name: 'Unknown User', avatar_url: undefined }
        };
      });

      setLeaderboard(combined);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-700" />;
      default:
        return null;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return "from-yellow-500/20 to-orange-500/20 border-yellow-500/50";
      case 2:
        return "from-gray-400/20 to-slate-500/20 border-gray-400/50";
      case 3:
        return "from-amber-700/20 to-amber-900/20 border-amber-700/50";
      default:
        return "from-muted/30 to-muted/10 border-border/30";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">Activity Ranking</CardTitle>
            <CardDescription>Top 10 most active participants</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No activity data yet</p>
            </div>
          ) : (
            leaderboard.map((entry, index) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 bg-gradient-to-r transition-all hover:scale-[1.02] ${getPositionColor(
                  index + 1
                )}`}
              >
                {/* Позиция и медаль */}
                <div className="flex items-center justify-center w-12">
                  {getMedalIcon(index + 1) || (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground font-bold text-sm">
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Аватар */}
                <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                  <AvatarImage src={entry.profiles.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {entry.profiles.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Информация */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground">{entry.profiles.full_name || entry.profiles.username}</p>
                    {entry.profiles.trainer_role && (
                      <Badge variant="secondary" className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        Trainer
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>📝 {entry.posts_count} posts</span>
                    <span>💬 {entry.comments_count} comments</span>
                    <span>❤️ {entry.likes_received} likes</span>
                  </div>
                </div>

                {/* Очки */}
                <div className="text-right">
                  <Badge
                    variant="secondary"
                    className="text-lg font-bold px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  >
                    {entry.points} 
                    <Star className="h-4 w-4 ml-1 inline fill-current" />
                  </Badge>
                  {entry.streak_days > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      🔥 {entry.streak_days} day streak
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Легенда очков */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <p className="text-sm font-semibold mb-2 text-foreground">How to earn points:</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>• Post: <span className="text-purple-500 font-bold">+10</span></div>
            <div>• Comment: <span className="text-blue-500 font-bold">+5</span></div>
            <div>• Like given: <span className="text-pink-500 font-bold">+2</span></div>
            <div>• Like received: <span className="text-green-500 font-bold">+3</span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};