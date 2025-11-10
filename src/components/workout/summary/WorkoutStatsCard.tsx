import { motion } from "framer-motion";
import { Clock, Dumbbell, Activity, Flame, Hash, Layers } from "lucide-react";

interface WorkoutStats {
  duration: number;
  totalVolume: number;
  totalExercises: number;
  totalSets: number;
  estimatedCalories: number;
}

interface WorkoutStatsCardProps {
  stats: WorkoutStats;
}

export function WorkoutStatsCard({ stats }: WorkoutStatsCardProps) {
  const statsData = [
    {
      icon: Clock,
      label: "Длительность",
      value: `${stats.duration} мин`,
      color: "text-cyan-400",
    },
    {
      icon: Dumbbell,
      label: "Общий объем",
      value: `${stats.totalVolume.toLocaleString()} кг`,
      color: "text-purple-400",
    },
    {
      icon: Flame,
      label: "Калории",
      value: `~${stats.estimatedCalories} ккал`,
      color: "text-pink-400",
    },
    {
      icon: Layers,
      label: "Упражнений",
      value: stats.totalExercises.toString(),
      color: "text-cyan-400",
    },
    {
      icon: Hash,
      label: "Подходов",
      value: stats.totalSets.toString(),
      color: "text-purple-400",
    },
    {
      icon: Activity,
      label: "Интенсивность",
      value: stats.duration > 0 ? `${Math.round(stats.totalVolume / stats.duration)} кг/мин` : '0 кг/мин',
      color: "text-pink-400",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4"
    >
      <h2 className="text-2xl font-semibold text-foreground">Краткая сводка</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
            className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
