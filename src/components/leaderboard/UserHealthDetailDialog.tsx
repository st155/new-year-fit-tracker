import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientDetailData } from "@/hooks/useClientDetailData";
import { HealthDataTabs } from "@/components/trainer/health-data/HealthDataTabs";
import { GoalsProgress } from "@/components/progress/GoalsProgress";
import { Loader2, Target, Scale, Dumbbell } from "lucide-react";
import { useBodyComposition } from "@/hooks/useBodyComposition";
import { BodyCompositionHistory } from "@/components/body-composition/BodyCompositionHistory";

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

  const { healthData, goals, loading, error } = useClientDetailData(userId);
  const { current: currentBodyComp, history: bodyHistory } = useBodyComposition(userId);

  // Get latest health data
  const latestData = healthData?.[0] || null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{userName} - Health Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-muted-foreground">
            Unable to load health data
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="health">Health Data</TabsTrigger>
              <TabsTrigger value="body">Body Composition</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {goals?.length || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current Weight</CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {currentBodyComp?.weight ? `${currentBodyComp.weight} kg` : 'N/A'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Body Fat</CardTitle>
                    <Dumbbell className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {currentBodyComp?.body_fat_percentage ? `${currentBodyComp.body_fat_percentage}%` : 'N/A'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {latestData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Latest Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {latestData.steps && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Steps</span>
                        <span className="font-medium">{latestData.steps.toLocaleString()}</span>
                      </div>
                    )}
                    {latestData.distance && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Distance</span>
                        <span className="font-medium">{(latestData.distance / 1000).toFixed(2)} km</span>
                      </div>
                    )}
                    {latestData.active_calories && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active Calories</span>
                        <span className="font-medium">{latestData.active_calories} kcal</span>
                      </div>
                    )}
                    {latestData.heart_rate_avg && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Heart Rate</span>
                        <span className="font-medium">{latestData.heart_rate_avg} bpm</span>
                      </div>
                    )}
                    {latestData.sleep_hours && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sleep</span>
                        <span className="font-medium">{latestData.sleep_hours.toFixed(1)} hours</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="health" className="space-y-4">
              <HealthDataTabs healthData={healthData || []} />
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
              {goals && goals.length > 0 ? (
                <GoalsProgress goals={goals} />
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
