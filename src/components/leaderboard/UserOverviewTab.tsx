import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HealthMetricCard } from "@/components/trainer/health-data/HealthMetricCard";
import { useMetricHistory } from "@/hooks/composite";

interface UserOverviewTabProps {
  userId: string;
}

interface MetricConfig {
  key: string;
  name: string;
  icon: string;
  unit: string;
}

const METRIC_KEYS = ['sleepDuration', 'recoveryScore', 'steps', 'activeCalories', 'restingHeartRate', 'hrv'] as const;

const METRIC_BASE_CONFIG: Record<string, { name: string; icon: string; unit: string }> = {
  sleepDuration: { name: "Sleep Duration", icon: "💤", unit: "hours" },
  recoveryScore: { name: "Recovery Score", icon: "⚡", unit: "%" },
  steps: { name: "Steps", icon: "👟", unit: "steps" },
  activeCalories: { name: "Active Calories", icon: "🔥", unit: "kcal" },
  restingHeartRate: { name: "Resting Heart Rate", icon: "❤️", unit: "bpm" },
  hrv: { name: "HRV", icon: "💓", unit: "ms" },
};

type PeriodType = "1" | "7" | "30";

export function UserOverviewTab({ userId }: UserOverviewTabProps) {
  const { t } = useTranslation('leaderboard');
  const [period, setPeriod] = useState<PeriodType>("30");

  const METRIC_CONFIGS: MetricConfig[] = METRIC_KEYS.map(key => ({
    key,
    name: METRIC_BASE_CONFIG[key].name,
    icon: METRIC_BASE_CONFIG[key].icon,
    unit: METRIC_BASE_CONFIG[key].unit,
  }));

  const daysBack = parseInt(period);
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const { history: metricsData, isLoading } = useMetricHistory(
    METRIC_CONFIGS.map(c => c.name),
    { start: startDate.toISOString(), end: endDate.toISOString() }
  );

  const metricStats = useMemo(() => {
    const stats: Record<string, { current: number; history: Array<{ date: string; value: number }>; trend: { min: number; avg: number; max: number } }> = {};

    METRIC_CONFIGS.forEach(config => {
      const metricData = metricsData?.filter(m => m.metric_name === config.name) || [];
      
      if (metricData.length === 0) {
        stats[config.key] = { 
          current: 0, 
          history: [], 
          trend: { min: 0, avg: 0, max: 0 } 
        };
        return;
      }

      // Sort by date
      const sorted = [...metricData].sort((a, b) => 
        new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
      );

      const values = sorted.map(m => m.value);
      const current = sorted[sorted.length - 1]?.value || 0;
      
      stats[config.key] = {
        current,
        history: sorted.map(m => ({
          date: m.measurement_date, // Keep ISO format for HealthMetricCard
          value: m.value
        })),
        trend: {
          min: Math.min(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          max: Math.max(...values)
        }
      };
    });

    return stats;
  }, [metricsData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('userOverview.title')}</h3>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">{t('userOverview.today')}</SelectItem>
            <SelectItem value="7">{t('userOverview.last7days')}</SelectItem>
            <SelectItem value="30">{t('userOverview.last30days')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('userOverview.loading')}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {METRIC_CONFIGS.map(config => {
            const stats = metricStats[config.key];
            
            return (
              <HealthMetricCard
                key={config.key}
                title={t(`userOverview.metrics.${config.key}`)}
                icon={config.icon}
                value={stats?.current || 0}
                unit={config.unit}
                data={stats?.history || []}
                trend={stats?.trend}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
