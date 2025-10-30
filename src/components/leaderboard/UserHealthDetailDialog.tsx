import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useClientDetailData } from "@/hooks/useClientDetailData";
import { HealthDataTabs } from "@/components/trainer/health-data/HealthDataTabs";
import { GoalsProgress } from "@/components/progress/GoalsProgress";
import { Loader2 } from "lucide-react";
import { useBodyComposition } from "@/hooks/useBodyComposition";
import { BodyCompositionHistory } from "@/components/body-composition/BodyCompositionHistory";
import { UserOverviewTab } from "./UserOverviewTab";

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

  const { goals, loading, error } = useClientDetailData(userId);
  const { history: bodyHistory } = useBodyComposition(userId);

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
              <UserOverviewTab userId={userId} />
            </TabsContent>

            <TabsContent value="health" className="space-y-4">
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
