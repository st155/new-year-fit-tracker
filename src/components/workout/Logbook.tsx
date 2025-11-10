import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkoutHistory, WorkoutSource } from "@/hooks/useWorkoutHistory";
import LogbookHeader from "./logbook/LogbookHeader";
import WorkoutHistoryCard from "./logbook/WorkoutHistoryCard";
import EmptyState from "./logbook/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Logbook() {
  const [activeFilter, setActiveFilter] = useState<WorkoutSource>('all');
  const { workouts, isLoading } = useWorkoutHistory(activeFilter);

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

      {workouts.length === 0 ? (
        <EmptyState filter={activeFilter} />
      ) : (
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-4 pr-4">
            {workouts.map((workout, index) => (
              <WorkoutHistoryCard
                key={workout.id}
                workout={workout}
                index={index}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
