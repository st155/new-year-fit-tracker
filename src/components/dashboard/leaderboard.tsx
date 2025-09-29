import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award } from "lucide-react";

interface LeaderboardUser {
  rank: number;
  name: string;
  points: number;
  change: string;
  isUser?: boolean;
}

export function Leaderboard() {
  const { user } = useAuth();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [user]);

  const fetchLeaderboard = async () => {
    if (!user) return;

    try {
      // Получаем активный челлендж пользователя
      const { data: challengeParticipant } = await supabase
        .from('challenge_participants')
        .select(`
          challenge_id,
          challenges!inner(id, title, is_active)
        `)
        .eq('user_id', user.id)
        .eq('challenges.is_active', true)
        .limit(1)
        .single();

      if (!challengeParticipant) {
        setLeaderboardData([]);
        setLoading(false);
        return;
      }

      const challengeId = challengeParticipant.challenge_id;

      // Получаем всех участников челленджа с их профилями
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select(`
          user_id,
          profiles!inner(username, full_name)
        `)
        .eq('challenge_id', challengeId);

      if (!participants) {
        setLeaderboardData([]);
        setLoading(false);
        return;
      }

      // Вычисляем очки для каждого участника на основе их активности
      const leaderboard = await Promise.all(
        participants.map(async (participant) => {
          // Получаем метрики и измерения участника за последние 30 дней
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const [workoutsData, measurementsData, bodyCompData] = await Promise.all([
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
          
          const totalMinutes = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
          points += Math.floor(totalMinutes / 5); // 1 очко за 5 минут тренировки
          
          // Очки за измерения
          const measurements = measurementsData.data || [];
          points += measurements.length * 20; // 20 очков за измерение
          
          // Очки за обновления состава тела
          const bodyComp = bodyCompData.data || [];
          points += bodyComp.length * 30; // 30 очков за обновление состава тела

          const name = participant.profiles?.full_name || 
                      participant.profiles?.username || 
                      'Пользователь';
          
          const isCurrentUser = participant.user_id === user.id;

          return {
            user_id: participant.user_id,
            name: isCurrentUser ? 'Вы' : name,
            points,
            isUser: isCurrentUser
          };
        })
      );

      // Сортируем по очкам и добавляем ранги и изменения
      const sortedLeaderboard = leaderboard
        .sort((a, b) => b.points - a.points)
        .map((entry, index) => ({
          rank: index + 1,
          name: entry.name,
          points: entry.points,
          change: `+${Math.floor(Math.random() * 20)}`, // Пока что случайное изменение
          isUser: entry.isUser
        }));

      setLeaderboardData(sortedLeaderboard.slice(0, 5)); // Показываем топ-5
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Team Leaderboard
          </h3>
        </div>
        <Card className="border-2 border-accent/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Team Leaderboard
        </h3>
      </div>
      
      <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-background">
        <CardContent className="p-4">
          {leaderboardData.length === 0 ? (
            <div className="text-center py-6">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Нет активного челленджа или участников
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboardData.map((user) => (
                <div 
                  key={user.rank}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    user.isUser 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      user.rank === 1 ? 'bg-yellow-500 text-white' :
                      user.rank === 2 ? 'bg-gray-400 text-white' :
                      user.rank === 3 ? 'bg-orange-500 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {user.rank}
                    </div>
                    <span className={`text-sm font-medium ${user.isUser ? 'text-primary' : 'text-foreground'}`}>
                      {user.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {user.points}
                    </span>
                    <Badge 
                      variant={user.change.startsWith('-') ? "destructive" : "default"}
                      className="text-xs"
                    >
                      {user.change}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}