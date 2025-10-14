import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGoals } from "@/hooks/useGoals";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalCreateDialog } from "@/components/goals/GoalCreateDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Trophy, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Goals() {
  const { user } = useAuth();
  const { personalGoals, challengeGoals, isLoading } = useGoals(user?.id);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </Button>
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
                <GoalCard key={goal.id} goal={goal} />
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
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <GoalCreateDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
