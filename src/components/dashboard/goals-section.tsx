import { FitnessCard } from "@/components/ui/fitness-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Trophy, Timer, Zap } from "lucide-react";

interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  progress: number;
  category: "strength" | "endurance" | "body";
  icon: React.ReactNode;
}

const goalIcons = {
  strength: <Zap className="w-4 h-4" />,
  endurance: <Timer className="w-4 h-4" />,
  body: <Target className="w-4 h-4" />
};

const goalColors = {
  strength: "bg-gradient-accent",
  endurance: "bg-gradient-primary", 
  body: "bg-gradient-success"
};

interface GoalsSectionProps {
  userRole: "participant" | "trainer";
}

export function GoalsSection({ userRole }: GoalsSectionProps) {
  const sampleGoals: Goal[] = [
    {
      id: "1",
      title: "Подтягивания",
      current: 18,
      target: 25,
      unit: "раз",
      progress: 72,
      category: "strength",
      icon: goalIcons.strength
    },
    {
      id: "2", 
      title: "Бег 1км",
      current: 4.2,
      target: 3.5,
      unit: "мин",
      progress: 60,
      category: "endurance",
      icon: goalIcons.endurance
    },
    {
      id: "3",
      title: "Процент жира",
      current: 12.5,
      target: 10,
      unit: "%",
      progress: 80,
      category: "body", 
      icon: goalIcons.body
    },
    {
      id: "4",
      title: "Жим лёжа",
      current: 95,
      target: 105,
      unit: "кг",
      progress: 90,
      category: "strength",
      icon: goalIcons.strength
    }
  ];

  if (userRole === "trainer") {
    return (
      <FitnessCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold">Общий прогресс команды</h3>
          </div>
          <Button variant="outline" size="sm">
            Посмотреть всех
          </Button>
        </div>
        
        <div className="space-y-4">
          {["Антон С.", "Дмитрий К.", "Михаил Л.", "Александр П."].map((name, index) => (
            <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold">
                  {name[0]}
                </div>
                <span className="font-medium">{name}</span>
                <Badge variant="outline" className="text-xs">
                  {4 - index} цели
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={85 - index * 5} className="w-20" />
                <span className="text-sm font-medium w-12">{85 - index * 5}%</span>
              </div>
            </div>
          ))}
        </div>
      </FitnessCard>
    );
  }

  return (
    <FitnessCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold">Мои цели</h3>
        </div>
        <Button variant="fitness" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Добавить
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sampleGoals.map((goal) => (
          <div key={goal.id} className="p-4 rounded-lg bg-muted/20 border border-border/50 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {goal.icon}
                <h4 className="font-semibold">{goal.title}</h4>
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs font-semibold ${goalColors[goal.category]} text-white border-none`}
              >
                {goal.progress}%
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Текущий:</span>
                <span className="font-medium">{goal.current} {goal.unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Цель:</span>
                <span className="font-medium text-primary">{goal.target} {goal.unit}</span>
              </div>
              <Progress value={goal.progress} className="h-2" />
            </div>
          </div>
        ))}
      </div>
    </FitnessCard>
  );
}