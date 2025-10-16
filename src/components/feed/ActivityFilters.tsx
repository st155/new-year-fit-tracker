import { Button } from "@/components/ui/button";
import { Moon, Dumbbell, Footprints, CheckCircle, Target, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityFiltersProps {
  currentFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

const filters = [
  { value: null, label: "All", icon: Activity },
  { value: "sleep_recovery", label: "Sleep", icon: Moon },
  { value: "workout", label: "Workouts", icon: Dumbbell },
  { value: "daily_steps", label: "Steps", icon: Footprints },
  { value: "habit", label: "Habits", icon: CheckCircle },
];

export function ActivityFilters({ currentFilter, onFilterChange }: ActivityFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isSelected = currentFilter === filter.value;
        
        return (
          <Button
            key={filter.value || "all"}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              "shrink-0 gap-2",
              !isSelected && "bg-background/50"
            )}
          >
            <Icon className="h-4 w-4" />
            {filter.label}
          </Button>
        );
      })}
    </div>
  );
}
