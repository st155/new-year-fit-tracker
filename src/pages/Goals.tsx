import { useEffect, useState } from "react";
import { Target, Trophy, Plus, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChallengeGoals } from "@/hooks/useChallengeGoals";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalCreateDialog } from "@/components/goals/GoalCreateDialog";
import { useSearchParams } from "react-router-dom";

export default function Goals() {
  const { user } = useAuth();
  const { data: goals, isLoading, refetch } = useChallengeGoals(user?.id);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') === 'challenges') ? 'challenges' : 'personal';
  const [activeTab, setActiveTab] = useState<'personal' | 'challenges'>(initialTab as any);
  
  const personalGoals = goals?.filter(g => g.is_personal) || [];
  const challengeGoals = goals?.filter(g => !g.is_personal) || [];

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'challenges' || tab === 'personal') {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'personal' && personalGoals.length === 0 && challengeGoals.length > 0) {
      setActiveTab('challenges');
      setSearchParams({ tab: 'challenges' });
    }
  }, [activeTab, personalGoals.length, challengeGoals.length, setSearchParams]);
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

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setSearchParams({ tab: v }); }} className="space-y-4">
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
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4">
            <p className="text-sm text-muted-foreground">
              Дисциплины челленджа определяются тренером. 
              Отслеживайте прогресс по каждой дисциплине в разделе <strong>Challenge Progress</strong>.
            </p>
          </div>
          
          {!challengeGoals || challengeGoals.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-12 w-12" />}
              title="Нет целей челленджа"
              description="Присоединитесь к челленджу, чтобы получить цели автоматически"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {challengeGoals.map((goal) => (
                <GoalCard 
                  key={goal.id} 
                  goal={goal} 
                  onMeasurementAdded={() => refetch()}
                  readonly={true}
                />
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
