import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('workouts');
  
  const statsData = [
    {
      icon: Clock,
      label: t('stats.duration'),
      value: t('stats.minutes', { value: stats.duration }),
      color: "text-cyan-400",
    },
    {
      icon: Dumbbell,
      label: t('stats.totalVolume'),
      value: t('stats.kg', { value: stats.totalVolume.toLocaleString() }),
      color: "text-purple-400",
    },
    {
      icon: Flame,
      label: t('stats.calories'),
      value: t('stats.kcal', { value: stats.estimatedCalories }),
      color: "text-pink-400",
    },
    {
      icon: Layers,
      label: t('stats.exercises'),
      value: stats.totalExercises.toString(),
      color: "text-cyan-400",
    },
    {
      icon: Hash,
      label: t('stats.sets'),
      value: stats.totalSets.toString(),
      color: "text-purple-400",
    },
    {
      icon: Activity,
      label: t('stats.intensity'),
      value: stats.duration > 0 ? t('stats.kgPerMin', { value: Math.round(stats.totalVolume / stats.duration) }) : t('stats.kgPerMin', { value: 0 }),
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
      <h2 className="text-2xl font-semibold text-foreground">{t('stats.summaryTitle')}</h2>
      
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
