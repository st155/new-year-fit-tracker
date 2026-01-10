import { Activity, PenTool, Watch } from "lucide-react";
import { WorkoutSource } from "@/hooks/useWorkoutHistory";
import { useTranslation } from "react-i18next";

interface EmptyStateProps {
  filter: WorkoutSource;
}

export default function EmptyState({ filter }: EmptyStateProps) {
  const { t } = useTranslation('workouts');
  
  const getContent = () => {
    switch (filter) {
      case 'manual':
        return {
          icon: <PenTool className="w-16 h-16 text-purple-400/50" />,
          title: t('logbook.empty.manual.title'),
          description: t('logbook.empty.manual.description'),
        };
      case 'tracker':
        return {
          icon: <Watch className="w-16 h-16 text-pink-400/50" />,
          title: t('logbook.empty.tracker.title'),
          description: t('logbook.empty.tracker.description'),
        };
      default:
        return {
          icon: <Activity className="w-16 h-16 text-cyan-400/50" />,
          title: t('logbook.empty.all.title'),
          description: t('logbook.empty.all.description'),
        };
    }
  };

  const content = getContent();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-6 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 mb-6">
        {content.icon}
      </div>
      <h3 className="text-2xl font-bold text-gray-200 mb-2">
        {content.title}
      </h3>
      <p className="text-gray-400 max-w-md">
        {content.description}
      </p>
    </div>
  );
}
