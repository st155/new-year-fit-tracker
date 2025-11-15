import { Card } from "@tremor/react";
import { Trophy, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getWorkoutIcon } from "@/lib/workout-icons";
import { Badge } from "@/components/ui/badge";

interface LogEntry {
  id?: string;
  date: string;
  workout: string;
  hasPR: boolean;
  prDetails?: string;
}

interface WorkoutHistoryItem {
  id: string;
  date: Date;
  name: string;
  duration: number;
  calories: number;
  volume?: number;
  distance?: number;
  source: string;
  sourceLabel: string;
  workoutType?: string;
}

interface LogbookSnippetCardProps {
  entries?: LogEntry[];
  workouts?: WorkoutHistoryItem[];
}

export function LogbookSnippetCard({ entries, workouts }: LogbookSnippetCardProps) {
  const navigate = useNavigate();
  
  // Prepare display data from workouts or fallback to entries
  const displayData = workouts 
    ? workouts.slice(0, 5).map(w => {
        const hasPR = w.volume ? w.volume > 5000 : false;
        
        // Format metrics line
        const metrics = [];
        metrics.push(`${w.duration} мин`);
        metrics.push(`${w.calories} ккал`);
        if (w.distance) {
          metrics.push(`${w.distance.toFixed(1)} км`);
        }
        
        return {
          id: w.id,
          date: format(new Date(w.date), 'dd MMM', { locale: ru }),
          workoutName: w.name,
          workoutIcon: getWorkoutIcon(w.workoutType || w.name),
          metrics: metrics.join(' • '),
          source: w.sourceLabel,
          hasPR,
          prDetails: hasPR ? `Объём ${w.volume?.toFixed(0)} кг` : undefined
        };
      })
    : entries || [];
  
  return (
    <Card className="bg-neutral-900 border border-neutral-800">
      <h3 className="text-lg font-semibold mb-4">Журнал (Ключевые моменты)</h3>
      
      <div className="space-y-2">
        {displayData.map((entry, idx) => (
          <div 
            key={entry.id || idx}
            onClick={() => entry.id && navigate(`/workouts/${entry.id}`)}
            className="border-l-2 border-neutral-700 pl-4 py-2 cursor-pointer hover:bg-neutral-800/50 transition-colors rounded-r-md"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="w-3 h-3" />
              {'date' in entry ? entry.date : entry.date}
            </div>
            
            {'workoutName' in entry ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{entry.workoutIcon}</span>
                  <span className="font-semibold text-foreground">{entry.workoutName}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {entry.source}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">{entry.metrics}</div>
              </>
            ) : (
              <div className="font-medium text-foreground">{'workout' in entry ? entry.workout : ''}</div>
            )}
            
            {entry.hasPR && entry.prDetails && (
              <div className="mt-2 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-amber-500 font-medium">
                  PR: {entry.prDetails}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
