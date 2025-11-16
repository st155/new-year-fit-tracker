import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkoutHistory, WorkoutSource } from "@/hooks/useWorkoutHistory";
import LogbookHeader from "./logbook/LogbookHeader";
import WorkoutHistoryCard from "./logbook/WorkoutHistoryCard";
import EmptyState from "./logbook/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatsDashboardCard } from "./stats/StatsDashboardCard";
import { motion } from "framer-motion";
import { format, isSameMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function Logbook() {
  const [activeFilter, setActiveFilter] = useState<WorkoutSource>('all');
  const [statsPeriod, setStatsPeriod] = useState<'week' | 'month' | 'all'>('all');
  const { workouts, isLoading } = useWorkoutHistory(activeFilter);
  const queryClient = useQueryClient();

  // Pull-to-refresh
  const { containerRef, isRefreshing, pullDistance, isAtThreshold } = usePullToRefresh({
    onRefresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workout-history'] });
      await queryClient.invalidateQueries({ queryKey: ['workout-stats'] });
    },
    threshold: 80
  });

  // Группировка тренировок по месяцам
  const groupedWorkouts = workouts.reduce((groups, workout) => {
    const month = format(new Date(workout.date), 'LLLL yyyy', { locale: ru });
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(workout);
    return groups;
  }, {} as Record<string, typeof workouts>);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LogbookHeader
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        workoutCount={workouts.length}
      />

      {/* Stats Dashboard */}
      <StatsDashboardCard period={statsPeriod} onPeriodChange={setStatsPeriod} />

      {workouts.length === 0 ? (
        <EmptyState filter={activeFilter} />
      ) : (
        <ScrollArea className="h-[calc(100vh-500px)]" ref={containerRef}>
          {/* Pull-to-refresh indicator */}
          {pullDistance > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center py-4"
              style={{
                transform: `translateY(${Math.min(pullDistance, 80)}px)`
              }}
            >
              <Loader2 
                className={cn(
                  "w-6 h-6 text-primary transition-all",
                  isRefreshing && "animate-spin",
                  isAtThreshold && "text-success"
                )}
              />
            </motion.div>
          )}
          <div className="space-y-8 pr-4">
            {Object.entries(groupedWorkouts).map(([month, monthWorkouts], monthIndex) => (
              <motion.div
                key={month}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: monthIndex * 0.1 }}
                className="space-y-4"
              >
                {/* Month header */}
                <h3 className="text-lg font-semibold text-muted-foreground capitalize sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10">
                  {month}
                </h3>
                
                {/* Timeline with workouts */}
                <div className="relative pl-8 space-y-4">
                  {/* Timeline line */}
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500 to-pink-500" />
                  
                  {monthWorkouts.map((workout, index) => (
                    <div key={workout.id} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[26px] top-6 w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 ring-4 ring-background" />
                      
                      <WorkoutHistoryCard
                        workout={workout}
                        index={index}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
