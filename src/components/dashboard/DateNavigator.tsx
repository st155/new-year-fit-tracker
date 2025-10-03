import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type TimeFilter = 'today' | 'week' | 'month';

interface DateNavigatorProps {
  selectedFilter: TimeFilter;
  dateOffset: number;
  onFilterChange: (filter: TimeFilter) => void;
  onDateOffsetChange: (offset: number) => void;
  getDateLabel: () => string;
}

export const DateNavigator = memo(function DateNavigator({
  selectedFilter,
  dateOffset,
  onFilterChange,
  onDateOffsetChange,
  getDateLabel
}: DateNavigatorProps) {
  const handlePreviousPeriod = () => {
    onDateOffsetChange(dateOffset - 1);
  };

  const handleNextPeriod = () => {
    onDateOffsetChange(dateOffset + 1);
  };

  const handleFilterClick = (filter: TimeFilter) => {
    onFilterChange(filter);
    onDateOffsetChange(0);
  };

  return (
    <div className="flex items-center justify-between gap-3 mb-6">
      {/* Previous Period Arrow */}
      <button
        onClick={handlePreviousPeriod}
        className="p-2 rounded-full transition-all duration-300 hover:bg-white/10"
        style={{
          color: 'white',
          border: '2px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Time Filter Buttons */}
      <div className="flex gap-2 flex-1 justify-center">
        <button
          onClick={() => handleFilterClick('today')}
          className="px-6 py-2 rounded-full text-sm font-medium transition-all duration-300"
          style={{
            background: selectedFilter === 'today' 
              ? 'linear-gradient(135deg, #F97316, #FB923C)'
              : 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            border: '2px solid',
            borderColor: selectedFilter === 'today' ? '#F97316' : 'rgba(255, 255, 255, 0.1)',
            boxShadow: selectedFilter === 'today' ? '0 0 20px rgba(249, 115, 22, 0.5)' : 'none'
          }}
        >
          {selectedFilter === 'today' ? getDateLabel() : 'Today'}
        </button>
        <button
          onClick={() => handleFilterClick('week')}
          className="px-6 py-2 rounded-full text-sm font-medium transition-all duration-300"
          style={{
            background: selectedFilter === 'week' 
              ? 'linear-gradient(135deg, #F97316, #FB923C)'
              : 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            border: '2px solid',
            borderColor: selectedFilter === 'week' ? '#F97316' : 'rgba(255, 255, 255, 0.1)',
            boxShadow: selectedFilter === 'week' ? '0 0 20px rgba(249, 115, 22, 0.5)' : 'none'
          }}
        >
          {selectedFilter === 'week' ? getDateLabel() : 'Week'}
        </button>
        <button
          onClick={() => handleFilterClick('month')}
          className="px-6 py-2 rounded-full text-sm font-medium transition-all duration-300"
          style={{
            background: selectedFilter === 'month' 
              ? 'linear-gradient(135deg, #F97316, #FB923C)'
              : 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            border: '2px solid',
            borderColor: selectedFilter === 'month' ? '#F97316' : 'rgba(255, 255, 255, 0.1)',
            boxShadow: selectedFilter === 'month' ? '0 0 20px rgba(249, 115, 22, 0.5)' : 'none'
          }}
        >
          {selectedFilter === 'month' ? getDateLabel() : 'Month'}
        </button>
      </div>

      {/* Next Period Arrow */}
      <button
        onClick={handleNextPeriod}
        disabled={dateOffset >= 0}
        className="p-2 rounded-full transition-all duration-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          color: 'white',
          border: '2px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
});
