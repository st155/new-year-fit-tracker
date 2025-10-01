import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Trophy, Target } from "lucide-react";


export function WeeklyGoals() {
  const navigate = useNavigate();
  
  const weeklyGoals = [
    {
      title: "Workout Sessions",
      current: 4,
      target: 5,
      unit: "sessions",
      progress: 80,
      icon: <Trophy className="h-3.5 w-3.5 text-primary" />
    },
    {
      title: "Sleep Quality",
      current: 7.8,
      target: 8.0,
      unit: "hrs avg",
      progress: 97.5,
      icon: <Clock className="h-3.5 w-3.5 text-purple-500" />
    },
    {
      title: "Active Minutes",
      current: 245,
      target: 300,
      unit: "min",
      progress: 81.7,
      icon: <Target className="h-3.5 w-3.5 text-green-500" />
    }
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <Calendar className="h-3 w-3 text-primary" />
        <h3 className="text-[10px] font-semibold text-foreground uppercase tracking-wide">
          Weekly Goals
        </h3>
      </div>
      
      <div className="space-y-1.5">
        {weeklyGoals.map((goal, index) => (
          <button 
            key={index}
            className="w-full border border-muted/30 bg-card hover:bg-card/80 hover:border-muted/50 transition-all rounded-lg cursor-pointer text-left"
            onClick={() => navigate('/goals/create')}
          >
            <div className="p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="p-0.5 rounded bg-muted/20">
                    {goal.icon}
                  </div>
                  <span className="text-[11px] font-medium text-foreground">
                    {goal.title}
                  </span>
                </div>
                <Badge variant="outline" className="text-[9px] h-3.5 px-1.5">
                  {Math.round(goal.progress)}%
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="text-[9px] text-muted-foreground">
                  {goal.current} / {goal.target} {goal.unit}
                </div>
                <div className="w-full bg-muted rounded-full h-1">
                  <div 
                    className="bg-primary h-1 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(goal.progress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}