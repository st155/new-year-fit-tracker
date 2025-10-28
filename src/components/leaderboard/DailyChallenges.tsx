import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
import { generateDailyChallenges, updateChallengeProgress, type DailyChallenge } from "@/lib/daily-challenges";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTodayMetrics } from "@/hooks/metrics/useTodayMetrics";

export function DailyChallenges() {
  const { user } = useAuth();
  const { metrics: todayMetrics, loading } = useTodayMetrics(user?.id);
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);

  useEffect(() => {
    // Generate base challenges
    const baseChallenges = generateDailyChallenges();
    
    // Update with real data
    const updatedChallenges = baseChallenges.map(challenge => {
      let currentValue = 0;
      
      switch (challenge.type) {
        case 'steps':
          currentValue = todayMetrics.steps;
          break;
        case 'workout':
          currentValue = todayMetrics.workouts;
          break;
        case 'sleep':
          currentValue = todayMetrics.sleepHours;
          break;
        case 'strain':
          currentValue = todayMetrics.strain;
          break;
        case 'recovery':
          currentValue = todayMetrics.recovery;
          break;
      }
      
      return updateChallengeProgress(challenge, currentValue);
    });
    
    setChallenges(updatedChallenges);
  }, [todayMetrics]);

  if (loading) {
    return (
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading challenges...
        </CardContent>
      </Card>
    );
  }

  const completedCount = challenges.filter(c => c.completed).length;
  const totalPoints = challenges.reduce((sum, c) => sum + (c.completed ? c.pointsReward : 0), 0);

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Today's Challenges
          </CardTitle>
          <Badge variant="secondary">
            {completedCount} / {challenges.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {challenges.map((challenge) => {
          const progress = Math.min(100, (challenge.currentValue / challenge.targetValue) * 100);
          
          return (
            <div
              key={challenge.id}
              className={cn(
                "p-4 rounded-lg border-2 transition-all",
                challenge.completed 
                  ? "bg-green-500/10 border-green-500/30" 
                  : "bg-muted/50 border-muted"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{challenge.icon}</span>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {challenge.title}
                      {challenge.completed && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {challenge.description}
                    </div>
                  </div>
                </div>
                <Badge variant={challenge.completed ? "default" : "outline"}>
                  +{challenge.pointsReward} pts
                </Badge>
              </div>

              {!challenge.completed && (
                <div className="space-y-1">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{challenge.currentValue} / {challenge.targetValue} {challenge.unit}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
              )}

              {challenge.completed && (
                <div className="text-sm text-green-600 font-medium">
                  ✅ Completed! +{challenge.pointsReward} points earned
                </div>
              )}
            </div>
          );
        })}

        {completedCount === challenges.length && challenges.length > 0 && (
          <div className="text-center py-4 border-t">
            <div className="text-lg font-bold text-primary mb-1">
              🎉 All Challenges Completed!
            </div>
            <div className="text-sm text-muted-foreground">
              You earned {totalPoints} bonus points today
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
