import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Target } from "lucide-react";

interface Goal {
  id: string;
  goal_name: string;
  goal_type?: string;
  target_value: number;
  target_unit: string;
  target_reps?: number | null;
  measurements?: Array<{ value: number; reps?: number | null }>;
}

interface GoalsProgressProps {
  goals: Goal[];
}

export function GoalsProgress({ goals }: GoalsProgressProps) {
  if (!goals || goals.length === 0) {
    return (
      <EmptyState
        icon={<Target className="h-12 w-12" />}
        title="No goals yet"
        description="Create goals to track your progress"
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {goals.map((goal) => {
        const currentValue = goal.measurements?.[0]?.value || 0;
        const progress = Math.min((currentValue / goal.target_value) * 100, 100);

        return (
          <Card key={goal.id}>
            <CardHeader>
              <CardTitle className="text-lg">{goal.goal_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold">{currentValue.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">
                    of {goal.target_reps && (goal.target_unit === 'кг' || goal.target_unit === 'kg')
                      ? (goal.target_reps === 1 
                          ? `${goal.target_value} кг (1RM)` 
                          : `${goal.target_value} кг × ${goal.target_reps}`)
                      : `${goal.target_value} ${goal.target_unit}`}
                  </div>
                </div>
                <div className="text-sm font-medium">{progress.toFixed(0)}%</div>
              </div>
              <Progress value={progress} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
