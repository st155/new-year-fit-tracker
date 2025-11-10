import { Progress } from '@/components/ui/progress';
import { Trophy, Activity, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DisciplineProgress {
  name: string;
  progress: number;
  icon: typeof Trophy;
  color: string;
}

interface ChallengePreviewStatsProps {
  disciplines?: DisciplineProgress[];
  className?: string;
}

const defaultDisciplines: DisciplineProgress[] = [
  { name: 'Body Composition', progress: 67, icon: Activity, color: 'from-purple-500 to-pink-500' },
  { name: 'Endurance', progress: 45, icon: Zap, color: 'from-orange-500 to-red-500' },
  { name: 'Strength', progress: 82, icon: Trophy, color: 'from-green-500 to-emerald-500' },
];

export function ChallengePreviewStats({ 
  disciplines = defaultDisciplines,
  className 
}: ChallengePreviewStatsProps) {
  const topThree = disciplines.slice(0, 3);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-xs font-medium text-muted-foreground mb-3">
        Топ дисциплины
      </div>
      {topThree.map((discipline, idx) => {
        const Icon = discipline.icon;
        return (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-foreground">{discipline.name}</span>
              </div>
              <span className="font-medium text-primary">{discipline.progress}%</span>
            </div>
            <div className="relative">
              <Progress value={discipline.progress} className="h-1.5" />
              <div 
                className={cn(
                  "absolute inset-0 h-1.5 rounded-full bg-gradient-to-r opacity-80",
                  discipline.color
                )}
                style={{ width: `${discipline.progress}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
