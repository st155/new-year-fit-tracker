import { useState, useEffect } from 'react';
import { FitnessCard } from "@/components/ui/fitness-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  id: string;
  name: string;
  totalProgress: number;
  goalsCompleted: number;
  totalGoals: number;
  rank: number;
  avatar?: string;
  isCurrentUser?: boolean;
}


function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Award className="w-5 h-5 text-amber-600" />;
    default:
      return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
  }
}

export function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number>(3);

  useEffect(() => {
    if (user) {
      fetchLeaderboard();
      
      // Автообновление каждые 2 минуты
      const interval = setInterval(() => {
        fetchLeaderboard();
      }, 120000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchLeaderboard = async () => {
    if (!user) return;

    try {
      // Получаем активный челлендж пользователя
      const { data: participantData } = await supabase
        .from('challenge_participants')
        .select(`
          challenge_id,
          challenges!inner (
            id,
            title,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .eq('challenges.is_active', true)
        .limit(1)
        .maybeSingle();

      if (!participantData?.challenge_id) {
        // Генерируем моковые данные если нет активного челленджа
        const mockData = generateMockLeaderboard();
        setLeaderboard(mockData);
        setLoading(false);
        return;
      }

      // Получаем всех участников челленджа
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select(`
          user_id,
          profiles!inner (
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('challenge_id', participantData.challenge_id);

      if (participants) {
        // Для каждого участника получаем прогресс по целям
        const leaderboardData = await Promise.all(
          participants.map(async (participant, index) => {
            const { data: goals } = await supabase
              .from('goals')
              .select('id')
              .eq('user_id', participant.user_id)
              .eq('challenge_id', participantData.challenge_id)
              .eq('is_personal', false);

            const { data: measurements } = await supabase
              .from('measurements')
              .select('goal_id, value')
              .eq('user_id', participant.user_id)
              .in('goal_id', (goals || []).map(g => g.id));

            const goalsCompleted = (goals || []).filter(goal => 
              (measurements || []).some(m => m.goal_id === goal.id)
            ).length;

            const totalGoals = (goals || []).length || 8;
            const totalProgress = totalGoals > 0 ? Math.round((goalsCompleted / totalGoals) * 100) : 0;

            return {
              id: participant.user_id,
              name: participant.user_id === user.id ? 'Ты' : 
                    (participant.profiles.full_name || participant.profiles.username),
              totalProgress,
              goalsCompleted,
              totalGoals,
              rank: 0, // Будет установлен позже
              avatar: participant.profiles.avatar_url,
              isCurrentUser: participant.user_id === user.id
            };
          })
        );

        // Сортируем по прогрессу и устанавливаем ранги
        const sortedData = leaderboardData
          .sort((a, b) => b.totalProgress - a.totalProgress)
          .map((entry, index) => ({
            ...entry,
            rank: index + 1
          }));

        const currentUser = sortedData.find(entry => entry.isCurrentUser);
        if (currentUser) {
          setCurrentUserRank(currentUser.rank);
        }

        setLeaderboard(sortedData);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      // Fallback к моковым данным
      const mockData = generateMockLeaderboard();
      setLeaderboard(mockData);
    } finally {
      setLoading(false);
    }
  };

  const generateMockLeaderboard = (): LeaderboardEntry[] => [
    {
      id: "1",
      name: "Антон С.",
      totalProgress: 92,
      goalsCompleted: 8,
      totalGoals: 10,
      rank: 1,
      isCurrentUser: false
    },
    {
      id: "2", 
      name: "Дмитрий К.",
      totalProgress: 87,
      goalsCompleted: 7,
      totalGoals: 8,
      rank: 2,
      isCurrentUser: false
    },
    {
      id: "3",
      name: "Ты",
      totalProgress: 78,
      goalsCompleted: 6,
      totalGoals: 8,
      rank: 3,
      isCurrentUser: true
    },
    {
      id: "4",
      name: "Михаил Л.",
      totalProgress: 72,
      goalsCompleted: 5,
      totalGoals: 7,
      rank: 4,
      isCurrentUser: false
    },
    {
      id: "5",
      name: "Александр П.",
      totalProgress: 68,
      goalsCompleted: 4,
      totalGoals: 6,
      rank: 5,
      isCurrentUser: false
    }
  ];

  if (loading) {
    return (
      <FitnessCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold">Рейтинг команды</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </FitnessCard>
    );
  }

  const currentUser = leaderboard.find(entry => entry.isCurrentUser);
  const leader = leaderboard.find(entry => entry.rank === 1);
  const progressToLeader = currentUser && leader ? 
    Math.max(0, leader.totalProgress - currentUser.totalProgress) : 14;

  return (
    <FitnessCard className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-bold">Рейтинг команды</h3>
        <Badge variant="outline" className="ml-auto">
          <TrendingUp className="w-3 h-3 mr-1" />
          Живой
        </Badge>
      </div>
      
      <div className="space-y-3">
        {leaderboard.map((entry) => (
          <div 
            key={entry.id}
            className={`p-4 rounded-lg border transition-all hover:shadow-md ${
              entry.isCurrentUser 
                ? 'bg-gradient-primary/10 border-primary/30 shadow-glow' 
                : 'bg-muted/20 border-border/50 hover:border-primary/20'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8">
                {getRankIcon(entry.rank)}
              </div>
              
              <Avatar className="h-10 w-10 border-2 border-primary/30">
                <AvatarImage src={entry.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.name}`} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {entry.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-semibold ${entry.isCurrentUser ? 'text-primary' : ''}`}>
                    {entry.name}
                  </h4>
                  {entry.isCurrentUser && (
                    <Badge variant="default" className="text-xs font-bold">
                      ТЫ
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Общий прогресс</span>
                      <span>{entry.totalProgress}%</span>
                    </div>
                    <Progress value={entry.totalProgress} className="h-2" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{entry.goalsCompleted}/{entry.totalGoals}</div>
                    <div className="text-xs text-muted-foreground">целей</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-muted/30 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">
            До лидера осталось
          </p>
          <p className="text-lg font-bold text-primary">
            {progressToLeader}% прогресса
          </p>
          <p className="text-xs text-muted-foreground">
            Продолжай в том же духе! 💪
          </p>
        </div>
      </div>
    </FitnessCard>
  );
}