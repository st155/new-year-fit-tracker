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
import { calculateProgressScore } from "@/lib/challenge-scoring";

const Leaderboard = () => {
  const { user } = useAuth();
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

      // 3. Calculate points for each participant
      const leaderboardPromises = allParticipants.map(async (participant) => {
        const [workoutsData, measurementsData, currentBodyData] = await Promise.all([
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
            .from('inbody_analyses')
            .select('weight, percent_body_fat, skeletal_muscle_mass, test_date')
            .eq('user_id', participant.user_id)
            .order('test_date', { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);

        const workouts = workoutsData.data || [];
        const measurements = measurementsData.data || [];
        const totalCalories = workouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0);

        // Check if baseline exists
        const hasBaseline = 
          participant.baseline_body_fat && 
          (participant.baseline_source === 'inbody' || participant.baseline_source === 'withings');

        if (!hasBaseline) {
          return {
            user_id: participant.user_id,
            username: participant.profiles?.username || participant.profiles?.full_name || 'Anonymous',
            avatar_url: participant.profiles?.avatar_url,
            points: 0,
            hasBaseline: false,
            workouts: workouts.length,
            measurements: measurements.length,
            isUser: participant.user_id === user.id,
          };
        }

        const currentMetrics = currentBodyData.data || null;

        if (!currentMetrics) {
          // No current data - activity only
          const activityOnly = calculateProgressScore(
            {
              body_fat_percentage: participant.baseline_body_fat,
              weight: participant.baseline_weight,
              muscle_mass: participant.baseline_muscle_mass,
              measurement_date: participant.baseline_recorded_at,
              source: participant.baseline_source as any,
            },
            {
              body_fat_percentage: participant.baseline_body_fat,
              weight: participant.baseline_weight,
              muscle_mass: participant.baseline_muscle_mass,
              measurement_date: new Date().toISOString(),
              source: participant.baseline_source as any,
            },
            {
              workouts: workouts.length,
              totalCalories,
              measurements: measurements.length,
              bodyCompEntries: 0,
            }
          );

          return {
            user_id: participant.user_id,
            username: participant.profiles?.username || participant.profiles?.full_name || 'Anonymous',
            avatar_url: participant.profiles?.avatar_url,
            points: activityOnly.totalPoints,
            hasBaseline: true,
            workouts: workouts.length,
            measurements: measurements.length,
            bodyFatStart: participant.baseline_body_fat,
            bodyFatCurrent: participant.baseline_body_fat,
            bodyFatImprovement: 0,
            isUser: participant.user_id === user.id,
          };
        }

        // Calculate score using hybrid formula
        const scoreBreakdown = calculateProgressScore(
          {
            body_fat_percentage: participant.baseline_body_fat,
            weight: participant.baseline_weight,
            muscle_mass: participant.baseline_muscle_mass,
            measurement_date: participant.baseline_recorded_at,
            source: participant.baseline_source as any,
          },
          {
            body_fat_percentage: currentMetrics.percent_body_fat,
            weight: currentMetrics.weight,
            muscle_mass: currentMetrics.skeletal_muscle_mass,
            measurement_date: currentMetrics.test_date,
            source: 'inbody',
          },
          {
            workouts: workouts.length,
            totalCalories,
            measurements: measurements.length,
            bodyCompEntries: 1,
          }
        );

        const fatImprovement = participant.baseline_body_fat - (currentMetrics.percent_body_fat || participant.baseline_body_fat);

        return {
          user_id: participant.user_id,
          username: participant.profiles?.username || participant.profiles?.full_name || 'Anonymous',
          avatar_url: participant.profiles?.avatar_url,
          points: scoreBreakdown.totalPoints,
          hasBaseline: true,
          workouts: workouts.length,
          measurements: measurements.length,
          bodyFatStart: participant.baseline_body_fat,
          bodyFatCurrent: currentMetrics.percent_body_fat || participant.baseline_body_fat,
          bodyFatImprovement: fatImprovement,
          isUser: participant.user_id === user.id,
        };
      });

      const allResults = await Promise.all(leaderboardPromises);
      
      const sortedLeaderboard = allResults
        .sort((a, b) => b.points - a.points)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
          change: Math.floor(Math.random() * 5) - 2
        }));

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
                      <AvatarImage src={leaderboardData[1].avatar_url} />
                      <AvatarFallback>{leaderboardData[1].username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold">{leaderboardData[1].username}</div>
                      <div className="text-2xl font-bold text-primary">{leaderboardData[1].points}</div>
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
                      <AvatarImage src={leaderboardData[0].avatar_url} />
                      <AvatarFallback>{leaderboardData[0].username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold text-lg">{leaderboardData[0].username}</div>
                      <div className="text-3xl font-bold text-primary">{leaderboardData[0].points}</div>
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
                      <AvatarImage src={leaderboardData[2].avatar_url} />
                      <AvatarFallback>{leaderboardData[2].username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold">{leaderboardData[2].username}</div>
                      <div className="text-2xl font-bold text-primary">{leaderboardData[2].points}</div>
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
                    key={item.user_id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg transition-all",
                      item.isUser ? "bg-primary/10 border-2 border-primary/30" : "bg-background/50"
                    )}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full font-bold",
                        index === 0 && "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white",
                        index === 1 && "bg-gradient-to-br from-gray-300 to-gray-500 text-white",
                        index === 2 && "bg-gradient-to-br from-orange-400 to-orange-600 text-white",
                        index > 2 && "bg-muted text-muted-foreground"
                      )}>
                        {item.rank}
                      </div>

                      <Avatar className="h-12 w-12">
                        <AvatarImage src={item.avatar_url} />
                        <AvatarFallback>{item.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="font-semibold">
                          {item.username}
                          {item.isUser && <span className="ml-2 text-xs text-primary">(You)</span>}
                          {!item.hasBaseline && (
                            <Badge variant="outline" className="ml-2 text-xs">Нет baseline</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.workouts} workouts · {item.measurements} measurements
                          {item.bodyFatImprovement !== undefined && item.bodyFatImprovement > 0 && (
                            <span className="ml-2 text-success">
                              • Жир: {item.bodyFatStart?.toFixed(1)}% → {item.bodyFatCurrent?.toFixed(1)}% 
                              (-{item.bodyFatImprovement.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{item.points}</div>
                        <div className="text-xs text-muted-foreground">{t('leaderboard.points')}</div>
                      </div>

                      <div className="flex items-center gap-1">
                        {item.change > 0 && (
                          <>
                            <TrendingUp className="h-4 w-4 text-success" />
                            <span className="text-xs text-success">+{item.change}</span>
                          </>
                        )}
                        {item.change < 0 && (
                          <>
                            <TrendingDown className="h-4 w-4 text-destructive" />
                            <span className="text-xs text-destructive">{item.change}</span>
                          </>
                        )}
                        {item.change === 0 && (
                          <>
                            <Minus className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">0</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
