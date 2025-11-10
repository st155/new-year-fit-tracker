import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkoutDayNavigatorProps {
  planName: string;
  weekNumber: number;
  dayOfWeek: number;
  onDayChange: (newDay: number) => void;
  disabled?: boolean;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function WorkoutDayNavigator({
  planName,
  weekNumber,
  dayOfWeek,
  onDayChange,
  disabled = false
}: WorkoutDayNavigatorProps) {
  const handlePrevious = () => {
    const newDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    onDayChange(newDay);
  };

  const handleNext = () => {
    const newDay = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
    onDayChange(newDay);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-full px-4 py-3 shadow-lg"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevious}
        disabled={disabled}
        className="rounded-full hover:bg-white/10 disabled:opacity-50"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      <div className="flex-1 text-center">
        <p className="text-sm text-gray-400">
          {planName} • Week {weekNumber}
        </p>
        <p className="text-lg font-semibold text-gray-200">
          {DAY_NAMES[dayOfWeek]}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleNext}
        disabled={disabled}
        className="rounded-full hover:bg-white/10 disabled:opacity-50"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </motion.div>
  );
}
