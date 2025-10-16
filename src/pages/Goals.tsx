import { useState } from "react";
import { Target, Trophy, Plus, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChallengeGoals } from "@/hooks/useChallengeGoals";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalCreateDialog } from "@/components/goals/GoalCreateDialog";

export default function Goals() {
  const { user } = useAuth();
  const { data: goals, isLoading, refetch } = useChallengeGoals(user?.id);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const personalGoals = goals?.filter(g => g.is_personal) || [];
  const challengeGoals = goals?.filter(g => !g.is_personal) || [];

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Goals</h1>
          <p className="text-muted-foreground">Track your personal and challenge goals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">
            <Target className="h-4 w-4 mr-2" />
            Personal ({personalGoals?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="challenges">
            <Trophy className="h-4 w-4 mr-2" />
            Challenges ({challengeGoals?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          {!personalGoals || personalGoals.length === 0 ? (
            <EmptyState
              icon={<Target className="h-12 w-12" />}
              title="No personal goals yet"
              description="Create your first goal to start tracking your progress"
              action={{
                label: "Create Goal",
                onClick: () => setCreateDialogOpen(true)
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {personalGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onMeasurementAdded={() => refetch()} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="challenges" className="space-y-4">
          {!challengeGoals || challengeGoals.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-12 w-12" />}
              title="No challenge goals"
              description="Join a challenge to get challenge-specific goals"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {challengeGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onMeasurementAdded={() => refetch()} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <GoalCreateDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onGoalCreated={() => refetch()}
      />
    </div>
  );
}
