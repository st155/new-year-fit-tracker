import { motion } from "framer-motion";
import { Activity, Footprints, Flame, Dumbbell, Calendar, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityReport } from "@/hooks/useChallengeReport";

interface ActivitySummaryCardProps {
  activity: ActivityReport;
  durationDays: number;
}

export function ActivitySummaryCard({ activity, durationDays }: ActivitySummaryCardProps) {
  const stats = [
    {
      icon: Calendar,
      label: "Активных дней",
      value: activity.totalActiveDays,
      suffix: `/ ${durationDays}`,
      color: "text-primary"
    },
    {
      icon: Footprints,
      label: "Всего шагов",
      value: activity.totalSteps.toLocaleString(),
      suffix: "",
      color: "text-blue-500"
    },
    {
      icon: Dumbbell,
      label: "Тренировок",
      value: activity.totalWorkouts,
      suffix: "",
      color: "text-purple-500"
    },
    {
      icon: Flame,
      label: "Калорий сожжено",
      value: activity.totalCalories.toLocaleString(),
      suffix: "ккал",
      color: "text-orange-500"
    },
    {
      icon: Zap,
      label: "Лучший стрик",
      value: activity.longestStreak,
      suffix: "дней",
      color: "text-yellow-500"
    },
    {
      icon: Activity,
      label: "Шагов в день",
      value: activity.avgDailySteps.toLocaleString(),
      suffix: "в среднем",
      color: "text-green-500"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Активность
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="p-4 rounded-lg bg-muted/30 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  {stat.suffix && (
                    <span className="text-sm text-muted-foreground">{stat.suffix}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
