import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeaderboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface LeaderboardUser {
  rank: number;
  name: string;
  points: number;
  change: string;
  isUser?: boolean;
}

export function Leaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchLeaderboard();
    }
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      if (!user) return;

      setLoading(true);

      // Получаем текущий активный челлендж пользователя
      const { data: participantData } = await supabase
        .from('challenge_participants')
        .select(`
          challenge_id,
          challenges (
            id,
            is_active
          )
        `)
        .eq('user_id', user.id);

      let challengeId = null;
      if (participantData && participantData.length > 0) {
        const activeChallenge = participantData.find(p => 
          p.challenges && p.challenges.is_active
        );
        challengeId = activeChallenge?.challenge_id;
      }

      if (!challengeId) {
        setLeaderboardData([]);
        setLoading(false);
        return;
      }

      // Получаем всех участников данного челленджа
      const { data: allParticipants } = await supabase
        .from('challenge_participants')
        .select(`
          user_id,
          profiles (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('challenge_id', challengeId);

      if (!allParticipants || allParticipants.length === 0) {
        setLeaderboardData([]);
        setLoading(false);
        return;
      }

      // Для каждого участника вычисляем активность за последние 30 дней
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      const leaderboardPromises = allParticipants.map(async (participant) => {
        const [workoutsData, measurementsData, bodyCompositionData] = await Promise.all([
          supabase
            .from('workouts')
            .select('id, calories_burned')
            .eq('user_id', participant.user_id)
            .gte('start_time', thirtyDaysAgo.toISOString()),
          supabase
            .from('measurements')
            .select('value')
            .eq('user_id', participant.user_id)
            .gte('measurement_date', thirtyDaysAgo.toISOString().split('T')[0]),
          supabase
            .from('body_composition')
            .select('weight, body_fat_percentage')
            .eq('user_id', participant.user_id)
            .gte('measurement_date', thirtyDaysAgo.toISOString().split('T')[0])
        ]);

        // Вычисляем очки
        let points = 0;
        
        // Очки за тренировки
        const workouts = workoutsData.data || [];
        points += workouts.length * 50; // 50 очков за тренировку
        
        const totalCalories = workouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0);
        points += Math.floor(totalCalories / 10); // 1 очко за 10 ккал
        
        // Очки за измерения
        const measurements = measurementsData.data || [];
        points += measurements.length * 20; // 20 очков за каждое измерение
        
        // Очки за отслеживание состава тела
        const bodyComp = bodyCompositionData.data || [];
        points += bodyComp.length * 30; // 30 очков за измерение состава тела

        return {
          user_id: participant.user_id,
          username: participant.profiles?.username || participant.profiles?.full_name || 'Anonymous',
          avatar_url: participant.profiles?.avatar_url,
          points: points,
          isUser: participant.user_id === user.id
        };
      });

      const allResults = await Promise.all(leaderboardPromises);
      
      // Сортируем по очкам
      const sortedLeaderboard = allResults
        .sort((a, b) => b.points - a.points)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
          change: '+2' // Placeholder для изменения позиции
        }));

      setLeaderboardData(sortedLeaderboard); // Показываем всех участников
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LeaderboardSkeleton />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div 
        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity group"
        onClick={() => navigate('/leaderboard')}
      >
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            {t('leaderboard.team')} {t('leaderboard.title')}
          </h3>
        </div>
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          {t('navigation.selectPage')} →
        </span>
      </div>

      <Card className="border-2 border-accent/20 bg-card/40 backdrop-blur-sm hover:border-accent/30 transition-all duration-500">
        <CardContent className="p-4">
          <div className="space-y-2 stagger-fade-in">
            {leaderboardData.slice(0, 5).map((item, index) => (
              <div 
                key={item.user_id}
                onClick={() => navigate('/leaderboard')}
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
                    index === 0 && "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg",
                    index === 1 && "bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md",
                    index === 2 && "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md",
                    index > 2 && "bg-muted text-muted-foreground"
                  )}>
                    {index === 0 && <Trophy className="h-4 w-4" />}
                    {index === 1 && <Medal className="h-4 w-4" />}
                    {index === 2 && <Award className="h-3.5 w-3.5" />}
                    {index > 2 && item.rank}
                  </div>

                  {/* Avatar and name */}
                  <Avatar className="h-10 w-10 border-2 border-border/50 transition-all duration-500 group-hover:scale-110">
                    <AvatarImage src={item.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {item.username?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col">
                    <span className={cn(
                      "text-sm font-semibold transition-colors",
                      item.isUser ? "text-primary" : "text-foreground"
                    )}>
                      {item.username}
                      {item.isUser && <span className="ml-1.5 text-xs text-primary/70">(You)</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.points} {t('leaderboard.points')}
                    </span>
                  </div>
                </div>

                {/* Change indicator */}
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs transition-all duration-300 group-hover:scale-110",
                    item.change.startsWith('+') 
                      ? "border-success/50 bg-success/10 text-success" 
                      : "border-destructive/50 bg-destructive/10 text-destructive"
                  )}
                >
                  {item.change}
                </Badge>
              </div>
            ))}
          </div>

          {leaderboardData.length > 5 && (
            <button
              onClick={() => navigate('/leaderboard')}
              className="w-full mt-3 py-2 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
            >
              View full leaderboard →
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
