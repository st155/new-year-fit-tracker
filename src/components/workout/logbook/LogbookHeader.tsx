import { Flame, Dumbbell, Clock, BarChart3 } from "lucide-react";
import { WorkoutSource } from "@/hooks/useWorkoutHistory";
import { useWorkoutStats } from "@/hooks/useWorkoutStats";
import { useState } from "react";
import { StatsModal } from "@/components/workout/stats/StatsModal";
import { useTranslation } from "react-i18next";

interface LogbookHeaderProps {
  activeFilter: WorkoutSource;
  onFilterChange: (filter: WorkoutSource) => void;
  workoutCount: number;
}

export default function LogbookHeader({ activeFilter, onFilterChange, workoutCount }: LogbookHeaderProps) {
  const { t } = useTranslation('workouts');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const { data: stats } = useWorkoutStats('all');
  
  const filters: { value: WorkoutSource; label: string }[] = [
    { value: 'all', label: t('logbookHeader.filters.all', { count: workoutCount }) },
    { value: 'manual', label: t('logbookHeader.filters.manual') },
    { value: 'tracker', label: t('logbookHeader.filters.tracker') },
  ];

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {t('logbookHeader.title')}
            </h2>
            {/* Mini statistics */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium">{t('logbookHeader.stats.days', { count: stats?.streak || 0 })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Dumbbell className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium">{stats?.totalWorkouts || 0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium">
                  {t('logbookHeader.stats.hours', { count: stats ? Math.round(stats.totalMinutes / 60) : 0 })}
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setShowStatsModal(true)}
            className="p-2 rounded-lg bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-colors"
          >
            <BarChart3 className="w-5 h-5 text-gray-300" />
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
      </div>

      <StatsModal open={showStatsModal} onOpenChange={setShowStatsModal} />
    </>
  );
}
