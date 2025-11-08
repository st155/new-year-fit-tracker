import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PreviewPanelProps {
  name: string;
  description: string;
  category: string;
  duration: number;
  weeklyWorkouts: number;
  workoutPreview: Array<{
    day: string;
    name: string;
    exerciseCount: number;
  }>;
}

export const PreviewPanel = ({
  name,
  description,
  category,
  duration,
  weeklyWorkouts,
  workoutPreview,
}: PreviewPanelProps) => {
  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-lg text-foreground mb-2">{name}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary">{category}</Badge>
        <Badge variant="secondary">{duration} weeks</Badge>
        <Badge variant="secondary">{weeklyWorkouts} workouts/week</Badge>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Weekly Schedule Preview</Label>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {workoutPreview.map((workout, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-16">
                  {workout.day}
                </span>
                <span className="text-sm font-medium">{workout.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {workout.exerciseCount} exercises
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

const Label = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={className}>{children}</div>
);
