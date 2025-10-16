import { useChallengeGoals } from "@/hooks/useChallengeGoals";
import { useAuth } from "@/hooks/useAuth";
import { ChallengeGoalCard } from "@/components/progress/ChallengeGoalCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Target, TrendingUp, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ChallengeProgressDashboardProps {
  challengeId: string;
  onRefresh: () => void;
}

export function ChallengeProgressDashboard({ challengeId, onRefresh }: ChallengeProgressDashboardProps) {
  const { user } = useAuth();
  const { data: goals, isLoading, refetch } = useChallengeGoals(user?.id);

  // Filter goals for this specific challenge AND current user
  const challengeGoals = goals?.filter(g => g.challenge_id === challengeId && !g.is_personal) || [];
  
  // Calculate overall progress
  const overallProgress = challengeGoals.length > 0
    ? challengeGoals.reduce((sum, g) => sum + g.progress_percentage, 0) / challengeGoals.length
    : 0;

  const completedGoals = challengeGoals.filter(g => g.progress_percentage >= 100).length;

  const handleMeasurementAdded = () => {
    refetch();
    onRefresh();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger-fade-in">
      {/* Hero Section - Overall Progress */}
      <Card className="glass-card border-primary/20 hover-lift overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-5" />
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-3 bg-gradient-primary rounded-xl">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Your Challenge Progress</h2>
              <p className="text-sm text-muted-foreground">Track your journey to excellence</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-4 w-4" />
                <span className="text-sm">Overall Progress</span>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">
                  {Math.round(overallProgress)}%
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            </div>

            <div className="glass rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Completed Goals</span>
              </div>
              <div className="text-3xl font-bold text-success">
                {completedGoals} / {challengeGoals.length}
              </div>
            </div>

            <div className="glass rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Active Goals</span>
              </div>
              <div className="text-3xl font-bold text-secondary">
                {challengeGoals.length - completedGoals}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals Grid */}
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Challenge Goals
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {challengeGoals.map((goal) => (
            <ChallengeGoalCard
              key={goal.id}
              goal={goal}
              onMeasurementAdded={handleMeasurementAdded}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
