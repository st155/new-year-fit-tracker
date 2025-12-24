import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Calendar, Flame, Clock, Dumbbell, Activity, Heart, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { getWorkoutIcon } from "@/lib/workout-icons";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  isLoading?: boolean;
}

// Categorize workouts
const WORKOUT_CATEGORIES: Record<string, { label: string; icon: React.ReactNode; types: string[] }> = {
  strength: {
    label: 'Силовые',
    icon: <Dumbbell className="w-4 h-4" />,
    types: ['Weightlifting', 'Силовая тренировка', 'Powerlifting', 'Пауэрлифтинг', 'Functional Fitness', 'Кроссфит', 'CrossFit']
  },
  cardio: {
    label: 'Кардио',
    icon: <Activity className="w-4 h-4" />,
    types: ['Running', 'Бег', 'Cycling', 'Велосипед', 'Swimming', 'Плавание', 'Walking', 'Прогулка', 'Hiking', 'Хайкинг', 'HIIT', 'Elliptical', 'Эллипсоид', 'Spin', 'Сайкл']
  },
  recovery: {
    label: 'Восстановление',
    icon: <Heart className="w-4 h-4" />,
    types: ['Yoga', 'Йога', 'Meditation', 'Медитация', 'Stretching', 'Растяжка', 'Pilates', 'Пилатес', 'Massage', 'Массаж']
  },
  wellness: {
    label: 'Wellness',
    icon: <span>🧖</span>,
    types: ['Sauna', 'Сауна', 'Ice Bath', 'Ледяная ванна', 'Air Compression', 'Воздушная компрессия', 'Percussive Massage', 'Перкуссионный массаж']
  }
};

function getWorkoutCategory(name: string): string {
  for (const [category, data] of Object.entries(WORKOUT_CATEGORIES)) {
    if (data.types.some(type => name.toLowerCase().includes(type.toLowerCase()))) {
      return category;
    }
  }
  return 'other';
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Сегодня';
  if (isYesterday(date)) return 'Вчера';
  return format(date, 'dd MMMM', { locale: ru });
}

function LogbookSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="w-3 h-3 rounded" />
            <Skeleton className="h-4 w-20" />
            <div className="flex-1 h-px bg-neutral-800" />
          </div>
          <div className="space-y-2 pl-2">
            <div className="border-l-2 border-neutral-700 pl-4 py-2">
              <div className="flex items-center gap-2 mb-1">
                <Skeleton className="w-6 h-6 rounded" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16 ml-auto" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LogbookSnippetCard({ entries, workouts, isLoading }: LogbookSnippetCardProps) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<'recent' | 'strain' | 'duration'>('recent');
  const [categoryFilters, setCategoryFilters] = useState<Record<string, boolean>>({
    strength: true,
    cardio: true,
    recovery: true,
    wellness: false, // Hide wellness by default
    other: true,
  });
  
  // Filter and sort workouts
  const filteredAndSortedWorkouts = useMemo(() => {
    if (!workouts) return [];
    
    // Filter by category
    const filtered = workouts.filter(w => {
      const category = getWorkoutCategory(w.name);
      return categoryFilters[category] !== false;
    });
    
    // Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'strain':
        return sorted.sort((a, b) => (b.strain ?? -1) - (a.strain ?? -1));
      case 'duration':
        return sorted.sort((a, b) => b.duration - a.duration);
      case 'recent':
      default:
        return sorted.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
  }, [workouts, sortBy, categoryFilters]);
  
  // Group by date
  const groupedWorkouts = useMemo(() => {
    const groups: Record<string, typeof filteredAndSortedWorkouts> = {};
    
    filteredAndSortedWorkouts.slice(0, 10).forEach(w => {
      const dateKey = format(startOfDay(w.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(w);
    });
    
    return groups;
  }, [filteredAndSortedWorkouts]);
  
  const activeFiltersCount = Object.values(categoryFilters).filter(Boolean).length;
  
  return (
    <Card className="bg-neutral-900 border border-neutral-800">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Журнал</h3>
          
          <div className="flex items-center gap-2">
            {/* Category filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-neutral-700">
                  <Filter className="w-4 h-4 mr-1" />
                  {activeFiltersCount < 5 && <Badge variant="secondary" className="ml-1 px-1.5 py-0">{activeFiltersCount}</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {Object.entries(WORKOUT_CATEGORIES).map(([key, { label, icon }]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={categoryFilters[key] !== false}
                    onCheckedChange={(checked) => 
                      setCategoryFilters(prev => ({ ...prev, [key]: checked }))
                    }
                  >
                    <span className="flex items-center gap-2">
                      {icon}
                      {label}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuCheckboxItem
                  checked={categoryFilters.other !== false}
                  onCheckedChange={(checked) => 
                    setCategoryFilters(prev => ({ ...prev, other: checked }))
                  }
                >
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Другое
                  </span>
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Sort buttons */}
            <div className="flex gap-1 bg-neutral-800/50 rounded-lg p-1">
              <button
                onClick={() => setSortBy('recent')}
                className={`p-2 rounded transition-all ${
                  sortBy === 'recent' 
                    ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-neutral-700'
                }`}
                title="Недавние"
              >
                <Calendar className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setSortBy('strain')}
                className={`p-2 rounded transition-all ${
                  sortBy === 'strain' 
                    ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-neutral-700'
                }`}
                title="По нагрузке"
              >
                <Flame className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setSortBy('duration')}
                className={`p-2 rounded transition-all ${
                  sortBy === 'duration' 
                    ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-neutral-700'
                }`}
                title="По длительности"
              >
                <Clock className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <LogbookSkeleton />
        ) : Object.keys(groupedWorkouts).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Нет тренировок с выбранными фильтрами
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedWorkouts).map(([dateKey, dayWorkouts]) => {
              const date = new Date(dateKey);
              
              return (
                <div key={dateKey}>
                  {/* Date header */}
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {formatDateLabel(date)}
                    </span>
                    <div className="flex-1 h-px bg-neutral-800" />
                  </div>
                  
                  {/* Workouts for this date */}
                  <div className="space-y-2 pl-2">
                    {dayWorkouts.map((workout) => {
                      const hasPR = workout.volume ? workout.volume > 5000 : false;
                      const category = getWorkoutCategory(workout.name);
                      const categoryData = WORKOUT_CATEGORIES[category];
                      
                      return (
                        <div 
                          key={workout.id}
                          onClick={() => navigate(`/workouts/${workout.id}`)}
                          className="border-l-2 border-neutral-700 pl-4 py-2 cursor-pointer hover:bg-neutral-800/50 transition-colors rounded-r-md"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{getWorkoutIcon(workout.workoutType || workout.name)}</span>
                            <span className="font-semibold text-foreground flex-1 truncate">{workout.name}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {workout.sourceLabel}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{workout.duration} мин</span>
                            <span>{workout.calories} ккал</span>
                            {workout.distance && <span>{workout.distance.toFixed(1)} км</span>}
                            {workout.strain && (
                              <span className="text-orange-400 flex items-center gap-1">
                                <Flame className="w-3 h-3" />
                                {workout.strain.toFixed(1)}
                              </span>
                            )}
                          </div>
                          
                          {hasPR && (
                            <div className="mt-2 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
                              <Trophy className="w-4 h-4 text-amber-500" />
                              <span className="text-sm text-amber-500 font-medium">
                                PR: Объём {workout.volume?.toFixed(0)} кг
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
