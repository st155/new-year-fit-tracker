import { useChallengeGoals } from "@/hooks/useChallengeGoals";
import { useAuth } from "@/hooks/useAuth";
import { useDifficultyLevel } from "@/hooks/useDifficultyLevel";
import { ChallengeGoalCard } from "@/components/progress/ChallengeGoalCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Target, TrendingUp, Calendar, Flame } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ChallengeProgressDashboardProps {
  challengeId: string;
  onRefresh: () => void;
}

export function ChallengeProgressDashboard({ challengeId, onRefresh }: ChallengeProgressDashboardProps) {
  const { user } = useAuth();
  const { data: goals, isLoading, refetch } = useChallengeGoals(user?.id);
  const { data: difficultyLevel = 0 } = useDifficultyLevel(challengeId, user?.id);
  const navigate = useNavigate();

  const difficultyConfig = {
    0: { label: "Базовый", multiplier: "1.0x", color: "text-blue-500" },
    1: { label: "Повышенный", multiplier: "1.3x", color: "text-orange-500" },
    2: { label: "Экстремальный", multiplier: "1.6x", color: "text-purple-500" },
    3: { label: "Нечеловеческий", multiplier: "1.9x", color: "text-red-600" },
  };

  // Filter goals for this specific challenge AND current user AND with target_value set
  const challengeGoals = goals?.filter(g => 
    g.challenge_id === challengeId && 
    !g.is_personal && 
    g.target_value !== null
  ) || [];
  
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
      <Card className="glass-card border-primary/20 hover-lift overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-primary opacity-5 pointer-events-none" />
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-3 bg-gradient-primary rounded-xl">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Ваш прогресс по дисциплинам</h2>
              <p className="text-sm text-muted-foreground">
                Отслеживайте текущие результаты по целям. 
                <Button 
                  variant="link" 
                  className="h-auto p-0 ml-1 text-sm"
                  onClick={() => navigate('/goals?tab=challenges')}
                >
                  Изменить цели →
                </Button>
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {difficultyLevel > 0 && (
              <div className="glass rounded-xl p-4 space-y-2 border-2 border-orange-500/50">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-bold text-orange-500">Difficulty Level</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-3xl font-bold ${difficultyConfig[difficultyLevel as keyof typeof difficultyConfig]?.color || "text-primary"}`}>
                    +{difficultyLevel}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {difficultyConfig[difficultyLevel as keyof typeof difficultyConfig]?.label}
                    <br />
                    ({difficultyConfig[difficultyLevel as keyof typeof difficultyConfig]?.multiplier})
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Goals Grid */}
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Challenge Goals
        </h3>
        {challengeGoals.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
            <Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Цели не установлены</h3>
            <p className="text-muted-foreground mb-6">
              Перейдите в раздел Goals и установите персональные цели для челленджа
            </p>
            <Button onClick={() => navigate('/goals?tab=challenges')}>
              Установить цели
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {challengeGoals.map((goal) => (
              <ChallengeGoalCard
                key={goal.id}
                goal={goal}
                onMeasurementAdded={handleMeasurementAdded}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
