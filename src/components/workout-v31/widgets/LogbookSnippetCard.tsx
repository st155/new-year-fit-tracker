import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Calendar, Flame, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getWorkoutIcon } from "@/lib/workout-icons";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";

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
  strain?: number;
}

interface LogbookSnippetCardProps {
  entries?: LogEntry[];
  workouts?: WorkoutHistoryItem[];
}

export function LogbookSnippetCard({ entries, workouts }: LogbookSnippetCardProps) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<'recent' | 'strain' | 'duration'>('recent');
  
  // Sort workouts based on selected criteria
  const sortedWorkouts = useMemo(() => {
    if (!workouts) return [];
    
    const sorted = [...workouts];
    
    switch (sortBy) {
      case 'strain':
        return sorted.sort((a, b) => {
          const strainA = a.strain ?? -1;
          const strainB = b.strain ?? -1;
          return strainB - strainA;
        });
        
      case 'duration':
        return sorted.sort((a, b) => b.duration - a.duration);
        
      case 'recent':
      default:
        return sorted.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
  }, [workouts, sortBy]);
  
  // Prepare display data from workouts or fallback to entries
  const displayData = sortedWorkouts
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
      <CardContent className="pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Журнал (Ключевые моменты)</h3>
        
        <div className="flex gap-1 bg-neutral-800/50 rounded-lg p-1">
          <button
            onClick={() => setSortBy('recent')}
            className={`p-2 rounded transition-all ${
              sortBy === 'recent' 
                ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-neutral-700'
            }`}
            title="Recent"
          >
            <Calendar className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setSortBy('strain')}
            className={`p-2 rounded transition-all ${
              sortBy === 'strain' 
                ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-neutral-700'
            }`}
            title="Highest Strain"
          >
            <Flame className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setSortBy('duration')}
            className={`p-2 rounded transition-all ${
              sortBy === 'duration' 
                ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-neutral-700'
            }`}
            title="Longest Duration"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>
      </div>
      
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
      </CardContent>
    </Card>
  );
}
