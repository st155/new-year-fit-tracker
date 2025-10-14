import { Button } from "@/components/ui/button";

interface ActivityFiltersProps {
  currentFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

const filters = [
  { label: "All", value: null },
  { label: "Workouts", value: "workouts" },
  { label: "Measurements", value: "measurements" },
  { label: "Goals", value: "goals" },
  { label: "Habits", value: "habit_completions" },
];

export function ActivityFilters({ currentFilter, onFilterChange }: ActivityFiltersProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((filter) => (
        <Button
          key={filter.label}
          variant={currentFilter === filter.value ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}
