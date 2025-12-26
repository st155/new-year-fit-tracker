import { motion } from 'framer-motion';
import { Target, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

interface Goal {
  id: string;
  name: string;
  progress: number;
}

export function WeeklyGoalsMiniCard() {
  // TODO: Connect to real goals data
  const goals: Goal[] = [
    { id: '1', name: 'Тренировки', progress: 80 },
    { id: '2', name: 'Сон 8ч', progress: 97 },
  ];

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="min-w-[160px] p-4 rounded-2xl bg-card/50 border border-border/50 flex flex-col gap-3"
    >
      <Link to="/goals" className="flex flex-col gap-3 h-full">
        <div className="flex items-center gap-2 text-amber-500">
          <Target className="h-4 w-4" />
          <span className="text-sm font-medium">Цели недели</span>
        </div>
        
        <div className="flex-1 flex flex-col gap-2">
          {goals.map((goal) => (
            <div key={goal.id} className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground truncate max-w-[100px]">{goal.name}</span>
                <span className="text-foreground font-medium">{goal.progress}%</span>
              </div>
              <Progress value={goal.progress} className="h-1.5" />
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
          <span>Подробнее</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </Link>
    </motion.div>
  );
}
