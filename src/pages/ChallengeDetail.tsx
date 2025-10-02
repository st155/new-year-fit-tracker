import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Calendar, Users, Target, Trophy, ArrowLeft, TrendingDown, Scale } from "lucide-react";
import { Loader2 } from "lucide-react";
import { ChallengeFeed } from "@/components/challenge/ChallengeFeed";
import { ChallengeLeaderboard } from "@/components/challenge/ChallengeLeaderboard";
import { ChallengeChat } from "@/components/challenge/ChallengeChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface ChallengeParticipant {
  user_id: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  progress?: number;
  latestMeasurement?: number;
  startWeight?: number;
}

const ChallengeDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<any>(null);
  const [participants, setParticipants] = useState<ChallengeParticipant[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchChallengeDetails = async () => {
      if (!id || !user) return;

      try {
        // Загружаем информацию о челлендже
        const { data: challengeData } = await supabase
          .from('challenges')
          .select('*')
          .eq('id', id)
          .single();

        setChallenge(challengeData);

        // Загружаем участников
        const { data: participantsData } = await supabase
          .from('challenge_participants')
          .select(`
            user_id,
            profiles (
              username,
              full_name,
              avatar_url
            )
          `)
          .eq('challenge_id', id);

        // Загружаем цели челленджа
        const { data: goalsData } = await supabase
          .from('goals')
          .select('*')
          .eq('challenge_id', id)
          .eq('is_personal', false);

        // Дедупликация целей по имени
        const uniqueGoals = goalsData 
          ? Array.from(new Map(goalsData.map(g => [g.goal_name, g])).values())
          : [];
        setGoals(uniqueGoals);

        // Для каждого участника вычисляем прогресс
        if (participantsData && goalsData) {
          const weightGoal = goalsData.find(g => g.goal_type === 'weight_loss');
          
          const participantsWithProgress = await Promise.all(
            participantsData.map(async (participant) => {
              let progress = 0;
              let latestMeasurement = 0;
              let startWeight = 0;

              if (weightGoal) {
                // Получаем измерения участника для цели похудения
                const { data: measurements } = await supabase
                  .from('measurements')
                  .select('value, measurement_date')
                  .eq('user_id', participant.user_id)
                  .eq('goal_id', weightGoal.id)
                  .order('measurement_date', { ascending: true });

                if (measurements && measurements.length >= 2) {
                  startWeight = measurements[0].value;
                  latestMeasurement = measurements[measurements.length - 1].value;
                  const weightLoss = startWeight - latestMeasurement;
                  progress = Math.min(100, Math.max(0, (weightLoss / weightGoal.target_value) * 100));
                }
              }

              return {
                ...participant,
                progress,
                latestMeasurement,
                startWeight
              };
            })
          );

          // Сортируем по прогрессу
          participantsWithProgress.sort((a, b) => (b.progress || 0) - (a.progress || 0));
          setParticipants(participantsWithProgress);
        }
      } catch (error) {
        console.error('Error fetching challenge details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChallengeDetails();
  }, [id, user]);

  // Обновляем время каждую минуту для актуального счетчика
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Обновляем каждую минуту

    return () => clearInterval(timer);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    // Устанавливаем время конца дня для более точного расчета
    end.setHours(23, 59, 59, 999);
    
    // Используем текущее время для точного расчета
    const today = currentTime;
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Challenge not found</p>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(challenge.end_date);
  const weightGoal = goals.find(g => g.goal_type === 'weight_loss');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Хедер с кнопкой назад */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/challenges')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Challenges
          </Button>
        </div>

        {/* Информация о челлендже */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl text-foreground flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-primary" />
                  {challenge.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  {challenge.description}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {daysRemaining} days left
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Start: {formatDate(challenge.start_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>End: {formatDate(challenge.end_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Participants: {participants.length}</span>
              </div>
            </div>

            {/* Цели челленджа */}
            {goals.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Challenge Goals:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Target className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">{goal.goal_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Target: {goal.target_value} {goal.target_unit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Лидерборд участников */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Participants Leaderboard
            </CardTitle>
            <CardDescription>
              Participant progress towards challenge goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {participants.map((participant, index) => (
                <div 
                  key={participant.user_id} 
                  className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg"
                >
                  {/* Позиция */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {index + 1}
                  </div>

                  {/* Аватар и имя */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={participant.profiles.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.profiles.username}`} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {participant.profiles.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="font-semibold text-foreground">
                      {participant.profiles.full_name || participant.profiles.username}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      @{participant.profiles.username}
                    </div>
                  </div>

                  {/* Прогресс по весу */}
                  {weightGoal && participant.progress !== undefined && (
                    <div className="flex-1 max-w-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {participant.startWeight > 0 && participant.latestMeasurement > 0 
                            ? `${participant.startWeight} → ${participant.latestMeasurement} kg`
                            : 'No data'
                          }
                        </span>
                      </div>
                      <Progress value={participant.progress} className="h-2" />
                      <div className="text-xs text-muted-foreground mt-1">
                        {participant.progress.toFixed(1)}% of goal
                      </div>
                    </div>
                  )}

                  {/* Значок потери веса */}
                  {participant.startWeight > 0 && participant.latestMeasurement > 0 && participant.startWeight > participant.latestMeasurement && (
                    <Badge variant="secondary" className="text-green-600">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      -{(participant.startWeight - participant.latestMeasurement).toFixed(1)} kg
                    </Badge>
                  )}
                </div>
              ))}

              {participants.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Participants
                  </h3>
                  <p className="text-muted-foreground">
                    No one has joined this challenge yet
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Рейтинг активности */}
        <div className="mb-8">
          <ChallengeLeaderboard challengeId={id!} />
        </div>

        {/* Социальная секция с табами */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="feed" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="feed">Feed</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
              </TabsList>
              
              <TabsContent value="feed">
                <ChallengeFeed challengeId={id!} />
              </TabsContent>
              
              <TabsContent value="chat">
                <ChallengeChat challengeId={id!} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChallengeDetail;