import { useAuth } from "@/hooks/useAuth";
import { useGoals } from "@/hooks/useGoals";
import { useBodyComposition } from "@/hooks/useBodyComposition";
import { GoalsProgress } from "@/components/progress/GoalsProgress";
import { BodyCompositionTimeline } from "@/components/progress/BodyCompositionTimeline";
import { MetricsTrends } from "@/components/progress/MetricsTrends";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Activity, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProgressNew() {
  const { user } = useAuth();
  const { personalGoals, challengeGoals, isLoading: goalsLoading } = useGoals(user?.id);
  const { history, isLoading: bodyLoading } = useBodyComposition(user?.id);

  const isLoading = goalsLoading || bodyLoading;
  const allGoals = [...(personalGoals || []), ...(challengeGoals || [])];

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Progress</h1>
        <p className="text-muted-foreground">Track your fitness journey</p>
      </div>

      <Tabs defaultValue="goals" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="goals">
            <Target className="h-4 w-4 mr-2" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="body">
            <Activity className="h-4 w-4 mr-2" />
            Body
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <GoalsProgress goals={allGoals} />
        </TabsContent>

        <TabsContent value="body">
          <BodyCompositionTimeline history={history} />
        </TabsContent>

        <TabsContent value="trends">
          <MetricsTrends userId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
