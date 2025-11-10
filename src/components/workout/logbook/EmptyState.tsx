import { Activity, PenTool, Watch } from "lucide-react";
import { WorkoutSource } from "@/hooks/useWorkoutHistory";

interface EmptyStateProps {
  filter: WorkoutSource;
}

export default function EmptyState({ filter }: EmptyStateProps) {
  const getContent = () => {
    switch (filter) {
      case 'manual':
        return {
          icon: <PenTool className="w-16 h-16 text-purple-400/50" />,
          title: 'Нет записанных тренировок',
          description: 'Начните записывать свои тренировки, чтобы отслеживать прогресс',
        };
      case 'tracker':
        return {
          icon: <Watch className="w-16 h-16 text-pink-400/50" />,
          title: 'Нет импортированных тренировок',
          description: 'Подключите трекер активности, чтобы автоматически синхронизировать тренировки',
        };
      default:
        return {
          icon: <Activity className="w-16 h-16 text-cyan-400/50" />,
          title: 'Журнал пуст',
          description: 'Начните тренироваться или подключите трекер активности',
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
