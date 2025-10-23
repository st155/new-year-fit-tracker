import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/page-loader";
import { useTranslation } from "@/lib/translations";
import { 
  calculateGoalProgress, 
  calculateParticipantScore, 
  isLowerBetterGoal,
  type GoalProgress,
  type ParticipantScore 
} from "@/lib/challenge-scoring-v2";
import { UserHealthDetailDialog } from "@/components/leaderboard/UserHealthDetailDialog";

const Leaderboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<ParticipantScore[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchLeaderboard();
    }
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      if (!user) return;
      setLoading(true);

      // 1. Get active challenge
      const { data: participantData } = await supabase
        .from('challenge_participants')
        .select(`
          challenge_id,
          challenges (
            id,
            title,
            is_active,
            start_date
          )
        `)
        .eq('user_id', user.id);

      let challengeId = null;
      let challengeStartDate = null;
      if (participantData && participantData.length > 0) {
        const activeChallenge = participantData.find(p => 
          p.challenges && p.challenges.is_active
        );
        challengeId = activeChallenge?.challenge_id;
        challengeStartDate = activeChallenge?.challenges?.start_date;
      }

      if (!challengeId || !challengeStartDate) {
        setLeaderboardData([]);
        setLoading(false);
        return;
      }

      // 2. Get all participants with baseline data
      const { data: allParticipants } = await supabase
        .from('challenge_participants')
        .select(`
          user_id,
          baseline_weight,
          baseline_body_fat,
          baseline_muscle_mass,
          baseline_source,
          baseline_recorded_at,
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

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      // 3. Calculate points for each participant based on all their goals
      const leaderboardPromises = allParticipants.map(async (participant) => {
        // Fetch all goals for this participant in the challenge
        const { data: goals } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', participant.user_id)
          .eq('challenge_id', challengeId)
          .eq('is_personal', false);
        
        if (!goals || goals.length === 0) {
          return calculateParticipantScore(
            [],
            participant.user_id,
            participant.profiles?.username || participant.profiles?.full_name || 'Anonymous',
            participant.profiles?.avatar_url
          );
        }
        
        // For each goal, calculate progress
        const goalsProgressPromises = goals.map(async (goal) => {
          // Get baseline
          const { data: baseline } = await supabase
            .from('goal_baselines')
            .select('baseline_value')
            .eq('goal_id', goal.id)
            .eq('user_id', participant.user_id)
            .maybeSingle();
          
          // Get latest measurement from user_metrics
          const { data: metricData } = await supabase
            .from('user_metrics')
            .select('id')
            .eq('user_id', participant.user_id)
            .eq('metric_name', goal.goal_name)
            .maybeSingle();
          
          let currentValue = baseline?.baseline_value || 0;
          
          if (metricData) {
            const { data: latestValue } = await supabase
              .from('metric_values')
              .select('value')
              .eq('metric_id', metricData.id)
              .eq('user_id', participant.user_id)
              .order('measurement_date', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (latestValue) {
              currentValue = latestValue.value;
            }
          }
          
          const baselineValue = baseline?.baseline_value || 0;
          const targetValue = goal.target_value || 0;
          
          if (!baselineValue || !targetValue) {
            return null;
          }
          
          const isLowerBetter = isLowerBetterGoal(goal.goal_name, goal.goal_type);
          
          const progressPercent = calculateGoalProgress(
            baselineValue,
            currentValue,
            targetValue,
            isLowerBetter
          );
          
          const goalProgress: GoalProgress = {
            goalId: goal.id,
            goalName: goal.goal_name,
            goalType: goal.goal_type,
            baseline: baselineValue,
            current: currentValue,
            target: targetValue,
            progressPercent,
            points: 0,
            isCompleted: progressPercent >= 100,
            isOverachieved: progressPercent > 100,
          };
          
          return goalProgress;
        });
        
        const goalsProgress = (await Promise.all(goalsProgressPromises))
          .filter(Boolean) as GoalProgress[];
        
        const participantScore = calculateParticipantScore(
          goalsProgress,
          participant.user_id,
          participant.profiles?.username || participant.profiles?.full_name || 'Anonymous',
          participant.profiles?.avatar_url
        );
        
        return {
          ...participantScore,
          isUser: participant.user_id === user.id,
        };
      });

      const allResults = await Promise.all(leaderboardPromises);
      
      const sortedLeaderboard = allResults
        .sort((a, b) => b.totalPoints - a.totalPoints);

      setLeaderboardData(sortedLeaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader message="Loading leaderboard..." />;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">{t('leaderboard.title')}</h1>
      </div>

      {leaderboardData.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Active Challenge</h3>
            <p className="text-muted-foreground">
              Join a challenge to see the leaderboard and compete with others!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Top 3 Podium */}
          {leaderboardData.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* 2nd Place */}
              <Card className="mt-8">
                <CardContent className="p-6 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white">
                      <Medal className="h-8 w-8" />
                    </div>
                    <Avatar className="h-16 w-16 border-4 border-gray-400">
                      <AvatarImage src={leaderboardData[1].avatarUrl} />
                      <AvatarFallback>{leaderboardData[1].username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold">{leaderboardData[1].username}</div>
                      <div className="text-2xl font-bold text-primary">{leaderboardData[1].totalPoints}</div>
                      <div className="text-xs text-muted-foreground">{t('leaderboard.points')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 1st Place */}
              <Card className="border-2 border-primary">
                <CardContent className="p-6 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white shadow-lg">
                      <Trophy className="h-10 w-10" />
                    </div>
                    <Avatar className="h-20 w-20 border-4 border-yellow-500">
                      <AvatarImage src={leaderboardData[0].avatarUrl} />
                      <AvatarFallback>{leaderboardData[0].username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold text-lg">{leaderboardData[0].username}</div>
                      <div className="text-3xl font-bold text-primary">{leaderboardData[0].totalPoints}</div>
                      <div className="text-xs text-muted-foreground">{t('leaderboard.points')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3rd Place */}
              <Card className="mt-8">
                <CardContent className="p-6 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white">
                      <Award className="h-8 w-8" />
                    </div>
                    <Avatar className="h-16 w-16 border-4 border-orange-500">
                      <AvatarImage src={leaderboardData[2].avatarUrl} />
                      <AvatarFallback>{leaderboardData[2].username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold">{leaderboardData[2].username}</div>
                      <div className="text-2xl font-bold text-primary">{leaderboardData[2].totalPoints}</div>
                      <div className="text-xs text-muted-foreground">{t('leaderboard.points')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Full Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>Full Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboardData.map((item, index) => (
                  <div 
                    key={item.userId}
                    onClick={() => {
                      setSelectedUserId(item.userId);
                      setSelectedUserName(item.username);
                    }}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg transition-all cursor-pointer hover:bg-accent/50",
                      item.isUser ? "bg-primary/10 border-2 border-primary/30" : "bg-background/50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4 flex-1">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full font-bold",
                          index === 0 && "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white",
                          index === 1 && "bg-gradient-to-br from-gray-300 to-gray-500 text-white",
                          index === 2 && "bg-gradient-to-br from-orange-400 to-orange-600 text-white",
                          index > 2 && "bg-muted text-muted-foreground"
                        )}>
                          {index + 1}
                        </div>

                        <Avatar className="h-12 w-12">
                          <AvatarImage src={item.avatarUrl} />
                          <AvatarFallback>{item.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="font-semibold flex items-center gap-2 flex-wrap">
                            {item.username}
                            {item.isUser && <span className="text-xs text-primary">(You)</span>}
                            {item.goalsProgress.length === 0 && (
                              <Badge variant="outline" className="text-xs">Нет целей</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>
                              {item.completedGoalsCount}/{item.goalsProgress.length} целей • 
                              {item.averageProgress}% средний прогресс
                            </div>
                            {item.badges.length > 0 && (
                              <div className="flex gap-1 flex-wrap mt-1">
                                {item.badges.map(badge => (
                                  <Badge key={badge} variant="secondary" className="text-xs py-0 px-1.5">
                                    {badge}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{item.totalPoints}</div>
                        <div className="text-xs text-muted-foreground">{t('leaderboard.points')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
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
