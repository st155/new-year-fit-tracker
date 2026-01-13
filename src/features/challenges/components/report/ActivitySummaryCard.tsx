import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Activity, Footprints, Flame, Dumbbell, Calendar, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityReport } from "@/features/challenges/types";

interface ActivitySummaryCardProps {
  activity: ActivityReport;
  durationDays: number;
}

export function ActivitySummaryCard({ activity, durationDays }: ActivitySummaryCardProps) {
  const { t } = useTranslation('challenges');

  const stats = [
    {
      icon: Calendar,
      labelKey: "activity.activeDays",
      value: activity.totalActiveDays,
      suffix: `/ ${durationDays}`,
      color: "text-primary"
    },
    {
      icon: Footprints,
      labelKey: "activity.totalSteps",
      value: activity.totalSteps.toLocaleString(),
      suffix: "",
      color: "text-blue-500"
    },
    {
      icon: Dumbbell,
      labelKey: "activity.workouts",
      value: activity.totalWorkouts,
      suffix: "",
      color: "text-purple-500"
    },
    {
      icon: Flame,
      labelKey: "activity.caloriesBurned",
      value: activity.totalCalories.toLocaleString(),
      suffixKey: "activity.kcal",
      color: "text-orange-500"
    },
    {
      icon: Zap,
      labelKey: "activity.bestStreak",
      value: activity.longestStreak,
      suffixKey: "activity.days",
      color: "text-yellow-500"
    },
    {
      icon: Activity,
      labelKey: "activity.dailySteps",
      value: activity.avgDailySteps.toLocaleString(),
      suffixKey: "activity.average",
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
            {t('activity.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.labelKey}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="p-4 rounded-lg bg-muted/30 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{t(stat.labelKey)}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  {(stat.suffix || stat.suffixKey) && (
                    <span className="text-sm text-muted-foreground">
                      {stat.suffix || t(stat.suffixKey!)}
                    </span>
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