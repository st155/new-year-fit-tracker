import { Calendar } from "lucide-react";
import { WorkoutSource } from "@/hooks/useWorkoutHistory";

interface LogbookHeaderProps {
  activeFilter: WorkoutSource;
  onFilterChange: (filter: WorkoutSource) => void;
  workoutCount: number;
}

export default function LogbookHeader({ activeFilter, onFilterChange, workoutCount }: LogbookHeaderProps) {
  const filters: { value: WorkoutSource; label: string }[] = [
    { value: 'all', label: 'Все' },
    { value: 'manual', label: 'Мои тренировки' },
    { value: 'tracker', label: 'Импортированные' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Журнал тренировок
        </h2>
        <button className="p-2 rounded-lg bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-colors">
          <Calendar className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${
                activeFilter === filter.value
                  ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }
            `}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-400">
        {workoutCount} тренировок
      </p>
    </div>
  );
}
