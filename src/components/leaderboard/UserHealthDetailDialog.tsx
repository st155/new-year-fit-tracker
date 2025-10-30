import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useClientDetailData } from "@/hooks/useClientDetailData";
import { HealthDataTabs } from "@/components/trainer/health-data/HealthDataTabs";
import { Loader2 } from "lucide-react";
import { useBodyComposition } from "@/hooks/useBodyComposition";
import { BodyCompositionHistory } from "@/components/body-composition/BodyCompositionHistory";
import { UserOverviewTab } from "./UserOverviewTab";
import { useChallengeGoals } from "@/hooks/useChallengeGoals";
import { ChallengeGoalCard } from "@/components/progress/ChallengeGoalCard";

interface UserHealthDetailDialogProps {
  userId: string | null;
  userName: string;
  open: boolean;
  onClose: () => void;
}

export function UserHealthDetailDialog({ 
  userId, 
  userName, 
  open, 
  onClose 
}: UserHealthDetailDialogProps) {
  if (!userId) return null;

  const { healthData, loading, error } = useClientDetailData(userId);
  const { history: bodyHistory } = useBodyComposition(userId);
  const { data: challengeGoals, isLoading: goalsLoading, refetch: refetchGoals } = useChallengeGoals(userId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{userName} - Health Profile</DialogTitle>
        </DialogHeader>

        {loading || goalsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-muted-foreground">
            Unable to load health data
          </div>
        ) : (
          <Tabs defaultValue="health" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="health">Health Data</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="body">Body Composition</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
            </TabsList>

            <TabsContent value="health" className="space-y-4">
              <HealthDataTabs healthData={healthData || []} loading={loading} />
            </TabsContent>

            <TabsContent value="overview" className="space-y-4">
              <UserOverviewTab userId={userId} />
            </TabsContent>

            <TabsContent value="body" className="space-y-4">
              {bodyHistory && bodyHistory.length > 0 ? (
                <BodyCompositionHistory userId={userId} />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No body composition data available
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="goals" className="space-y-4">
              {challengeGoals && challengeGoals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {challengeGoals.map((goal) => (
                    <ChallengeGoalCard
                      key={goal.id}
                      goal={goal}
                      onMeasurementAdded={() => refetchGoals()}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No goals set yet
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
