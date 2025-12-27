import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Heart, Moon, Brain, Activity, Gauge, BatteryCharging } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { HealthReport } from "@/features/challenges/types";

interface HealthSummaryCardProps {
  health: HealthReport;
}

export function HealthSummaryCard({ health }: HealthSummaryCardProps) {
  const { t } = useTranslation('health');

  const getRecoveryColor = (value: number) => {
    if (value >= 67) return "text-success";
    if (value >= 34) return "text-yellow-500";
    return "text-destructive";
  };

  const getSleepColor = (value: number) => {
    if (value >= 7) return "text-success";
    if (value >= 6) return "text-yellow-500";
    return "text-destructive";
  };

  const getStrainColor = (value: number) => {
    if (value >= 14 && value <= 18) return "text-success";
    if (value >= 10 && value <= 20) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const stats = [
    {
      icon: BatteryCharging,
      label: t('summary.recovery'),
      value: health.avgRecovery,
      suffix: "%",
      colorFn: getRecoveryColor,
      maxValue: 100
    },
    {
      icon: Moon,
      label: t('summary.sleep'),
      value: health.avgSleep,
      suffix: t('summary.hours'),
      colorFn: getSleepColor,
      maxValue: 10
    },
    {
      icon: Gauge,
      label: t('summary.strain'),
      value: health.avgStrain,
      suffix: "",
      colorFn: getStrainColor,
      maxValue: 21
    },
    {
      icon: Brain,
      label: t('summary.hrv'),
      value: health.avgHrv,
      suffix: t('summary.ms'),
      colorFn: () => "text-purple-500",
      maxValue: 150
    },
    {
      icon: Heart,
      label: t('summary.restingHr'),
      value: health.avgRestingHr,
      suffix: t('summary.bpm'),
      colorFn: (v: number) => v <= 60 ? "text-success" : v <= 70 ? "text-yellow-500" : "text-orange-500",
      maxValue: 100
    },
    {
      icon: Activity,
      label: t('summary.sleepEfficiency'),
      value: health.avgSleepEfficiency,
      suffix: "%",
      colorFn: (v: number) => v >= 85 ? "text-success" : v >= 70 ? "text-yellow-500" : "text-orange-500",
      maxValue: 100
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-destructive" />
            {t('summary.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="p-4 rounded-lg bg-muted/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <stat.icon className={cn("h-4 w-4", stat.colorFn(stat.value))} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-2xl font-bold", stat.colorFn(stat.value))}>
                    {stat.value || "—"}
                  </span>
                  {stat.value > 0 && stat.suffix && (
                    <span className="text-sm text-muted-foreground">{stat.suffix}</span>
                  )}
                </div>
                {stat.value > 0 && stat.maxValue && (
                  <Progress 
                    value={(stat.value / stat.maxValue) * 100} 
                    className="h-1.5"
                  />
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
