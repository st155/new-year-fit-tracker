import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Activity, Medal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ChallengeStatsOverviewProps {
  challengeId: string;
}

export function ChallengeStatsOverview({ challengeId }: ChallengeStatsOverviewProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["challenge-stats", challengeId],
    queryFn: async () => {
      // Get participant count
      const { count: participantCount } = await supabase
        .from("challenge_participants")
        .select("*", { count: "exact", head: true })
        .eq("challenge_id", challengeId);

      // Get top 3 participants
      const { data: topParticipants } = await supabase
        .from("challenge_points")
        .select(`
          user_id,
          points,
          posts_count,
          profiles:user_id (
            username,
            avatar_url,
            full_name
          )
        `)
        .eq("challenge_id", challengeId)
        .order("points", { ascending: false })
        .limit(3);

      // Get average progress (from goals)
      const { data: goals } = await supabase
        .from("goals")
        .select("id, target_value, user_id")
        .eq("challenge_id", challengeId);

      let avgProgress = 0;
      if (goals && goals.length > 0) {
        const progressPromises = goals.map(async (goal) => {
          const { data: measurements } = await supabase
            .from("measurements")
            .select("value")
            .eq("goal_id", goal.id)
            .eq("user_id", goal.user_id)
            .order("measurement_date", { ascending: false })
            .limit(1);
          
          if (measurements && measurements[0] && goal.target_value) {
            return Math.min((measurements[0].value / goal.target_value) * 100, 100);
          }
          return 0;
        });

        const progresses = await Promise.all(progressPromises);
        avgProgress = progresses.reduce((sum, p) => sum + p, 0) / progresses.length;
      }

      // Get activity count (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: activityCount } = await supabase
        .from("challenge_posts")
        .select("*", { count: "exact", head: true })
        .eq("challenge_id", challengeId)
        .gte("created_at", sevenDaysAgo.toISOString());

      return {
        participantCount: participantCount || 0,
        topParticipants: topParticipants || [],
        avgProgress: Math.round(avgProgress),
        activityCount: activityCount || 0,
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Participants */}
      <Card className="glass-card hover-lift">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Participants
          </CardTitle>
          <Users className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">{stats?.participantCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Active members</p>
        </CardContent>
      </Card>

      {/* Average Progress */}
      <Card className="glass-card hover-lift">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg. Progress
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-success">{stats?.avgProgress}%</div>
          <p className="text-xs text-muted-foreground mt-1">Challenge completion</p>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card className="glass-card hover-lift">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Activity (7d)
          </CardTitle>
          <Activity className="h-4 w-4 text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-secondary">{stats?.activityCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Posts this week</p>
        </CardContent>
      </Card>

      {/* Top Participants Preview */}
      <Card className="glass-card hover-lift">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Top Members
          </CardTitle>
          <Medal className="h-4 w-4 text-gold" />
        </CardHeader>
        <CardContent>
          <div className="flex -space-x-2">
            {stats?.topParticipants.slice(0, 3).map((participant: any, index) => (
              <Avatar
                key={participant.user_id}
                className="border-2 border-background h-9 w-9"
                style={{ zIndex: 3 - index }}
              >
                <AvatarImage src={participant.profiles?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {participant.profiles?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Leading the challenge</p>
        </CardContent>
      </Card>
    </div>
  );
}
