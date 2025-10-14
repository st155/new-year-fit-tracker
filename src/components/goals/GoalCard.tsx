import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";
import { useState } from "react";
import { QuickMeasurementDialog } from "./QuickMeasurementDialog";

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  is_personal: boolean;
  measurements?: Array<{ value: number; measurement_date: string }>;
}

interface GoalCardProps {
  goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const [measurementOpen, setMeasurementOpen] = useState(false);

  const latestMeasurement = goal.measurements?.[0];
  const progress = latestMeasurement 
    ? Math.min((latestMeasurement.value / goal.target_value) * 100, 100)
    : 0;

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">{goal.goal_name}</span>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setMeasurementOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">
                {latestMeasurement?.value.toFixed(1) || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                of {goal.target_value} {goal.target_unit}
              </div>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 mr-1" />
              {progress.toFixed(0)}%
            </div>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>

      <QuickMeasurementDialog
        goal={goal}
        isOpen={measurementOpen}
        onOpenChange={setMeasurementOpen}
        onMeasurementAdded={() => {}}
      />
    </>
  );
}
