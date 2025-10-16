import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Loader2, Star, MessageSquare, Heart, FileText, Flame, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ParticipantPodium } from "@/components/challenges/ParticipantPodium";
import { useAuth } from "@/hooks/useAuth";

interface LeaderboardEntry {
  user_id: string;
  points: number;
  posts_count: number;
  comments_count: number;
  likes_received: number;
  streak_days: number;
  profiles?: {
    username: string;
    full_name?: string;
    avatar_url?: string;
    trainer_role?: boolean;
  };
}

interface ChallengeLeaderboardProps {
  challengeId: string;
}

export function ChallengeLeaderboard({ challengeId }: ChallengeLeaderboardProps) {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [challengeId]);

  const fetchLeaderboard = async () => {
    try {
      const { data: pointsData, error: pointsError } = await supabase
        .from('challenge_points')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('points', { ascending: false });

      if (pointsError) throw pointsError;
      if (!pointsData || pointsData.length === 0) {
        setLeaderboard([]);
        return;
      }

      const userIds = pointsData.map(p => p.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, trainer_role')
        .in('user_id', userIds);

      const combined = pointsData.map(points => {
        const profile = profilesData?.find(p => p.user_id === points.user_id);
        return { ...points, profiles: profile };
      });

      setLeaderboard(combined);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const topThree = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);

  return (
    <div className="space-y-6">
      {topThree.length > 0 && (
        <Card className="glass-card border-primary/20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-primary opacity-5" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Топ участники</CardTitle>
                <CardDescription>Лидеры челленджа</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ParticipantPodium topThree={topThree} />
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Все участники
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {restOfLeaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Нет данных об активности</p>
            </div>
          ) : (
            restOfLeaderboard.map((entry, index) => {
              const actualIndex = index + 3;
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 p-4 rounded-lg glass hover-lift ${
                    entry.user_id === user?.id ? "border-2 border-primary" : ""
                  }`}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                    <span className="text-lg font-bold">{actualIndex + 1}</span>
                  </div>

                  <Avatar className="h-12 w-12">
                    <AvatarImage src={entry.profiles?.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {entry.profiles?.username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {entry.profiles?.full_name || entry.profiles?.username}
                        {entry.user_id === user?.id && " (Вы)"}
                      </p>
                      {entry.profiles?.trainer_role && (
                        <Badge className="text-xs bg-gradient-primary text-white">Тренер</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">@{entry.profiles?.username}</p>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{entry.posts_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span>{entry.comments_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <span>{entry.likes_received}</span>
                    </div>
                    {entry.streak_days > 0 && (
                      <div className="flex items-center gap-1">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="font-semibold">{entry.streak_days}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 bg-gradient-primary/20 px-4 py-2 rounded-lg">
                    <Star className="h-5 w-5 text-primary" />
                    <span className="text-lg font-bold">{entry.points}</span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-muted">
        <CardHeader>
          <CardTitle className="text-lg">Как зарабатывать очки</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-semibold">Пост</span>
              </div>
              <p className="text-2xl font-bold text-primary">+10</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-secondary" />
                <span className="font-semibold">Комментарий</span>
              </div>
              <p className="text-2xl font-bold text-secondary">+5</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-destructive" />
                <span className="font-semibold">Лайк дали</span>
              </div>
              <p className="text-2xl font-bold text-destructive">+3</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Лайк поставили</span>
              </div>
              <p className="text-2xl font-bold text-muted-foreground">+2</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
