import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Trophy, Target } from "lucide-react";

export function WeeklyGoals() {
  const weeklyGoals = [
    {
      title: "Workout Sessions",
      current: 4,
      target: 5,
      unit: "sessions",
      progress: 80,
      icon: <Trophy className="h-4 w-4 text-primary" />
    },
    {
      title: "Sleep Quality",
      current: 7.8,
      target: 8.0,
      unit: "hrs avg",
      progress: 97.5,
      icon: <Clock className="h-4 w-4 text-purple-500" />
    },
    {
      title: "Active Minutes",
      current: 245,
      target: 300,
      unit: "min",
      progress: 81.7,
      icon: <Target className="h-4 w-4 text-green-500" />
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Weekly Goals
        </h3>
      </div>
      
      <div className="space-y-3">
        {weeklyGoals.map((goal, index) => (
          <Card key={index} className="border-2 border-muted/50 bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-muted/20">
                    {goal.icon}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {goal.title}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {Math.round(goal.progress)}%
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{goal.current} / {goal.target} {goal.unit}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(goal.progress, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}