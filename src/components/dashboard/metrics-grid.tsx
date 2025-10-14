import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMetricsView } from "@/contexts/MetricsViewContext";
import { useLatestUnifiedMetrics, useDeviceMetrics } from "@/hooks/useUnifiedMetrics";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricsGridSkeleton } from "@/components/ui/dashboard-skeleton";
import { cn } from "@/lib/utils";

interface MetricConfig {
  key: string;
  title: string;
  unit: string;
  color: "body-fat" | "weight" | "vo2max" | "row" | "recovery" | "steps";
  description: string;
  category: string;
}

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  change?: string;
  subtitle?: string;
  color: "body-fat" | "weight" | "vo2max" | "row" | "recovery" | "steps";
  source?: string;
  sources?: string[];
  onSourceChange?: (source: string) => void;
}

function MetricCard({ title, value, unit, change, subtitle, color, source, sources, onSourceChange, onClick }: MetricCardProps & { onClick?: () => void }) {
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  
  const cssVarMap: Record<MetricCardProps['color'], string> = {
    'body-fat': '--metric-body-fat',
    'weight': '--metric-weight',
    'vo2max': '--metric-vo2max',
    'row': '--metric-row',
    'recovery': '--success',
    'steps': '--metric-steps',
  };

  const varName = cssVarMap[color];
  const wrapperStyle = {
    background: `linear-gradient(135deg, hsl(var(${varName}) / 0.5), hsl(var(${varName}) / 0.15) 35%, transparent)`,
    boxShadow: `0 0 24px hsl(var(${varName}) / 0.35)`,
  };

  const handleSourceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sources && sources.length > 1 && onSourceChange) {
      const nextIndex = (currentSourceIndex + 1) % sources.length;
      setCurrentSourceIndex(nextIndex);
      onSourceChange(sources[nextIndex]);
    }
  };

  const displaySource = sources && sources.length > 0 ? sources[currentSourceIndex] : source;
  const hasMultipleSources = sources && sources.length > 1;

  return (
    <div
      className={cn(
        'relative rounded-xl p-[2px] transition-all duration-300 hover:scale-105 cursor-pointer'
      )}
      style={wrapperStyle}
      onClick={onClick}
    >
      <Card className="relative overflow-hidden bg-card rounded-[0.9rem] border-0 h-full">
        <CardContent className="p-4 relative z-10">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            {title}
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl font-bold text-foreground">
              {value}
            </span>
            {unit && (
              <span className="text-sm text-muted-foreground">
                {unit}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {displaySource && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs capitalize cursor-pointer hover:bg-accent transition-colors",
                    hasMultipleSources && "animate-pulse"
                  )}
                  onClick={handleSourceClick}
                >
                  {displaySource}
                  {hasMultipleSources && ` (${currentSourceIndex + 1}/${sources.length})`}
                </Badge>
              )}
              {subtitle && !displaySource && (
                <span className="text-xs text-muted-foreground">
                  {subtitle}
                </span>
              )}
            </div>
            {change && (
              <Badge
                variant={change.startsWith('-') ? 'destructive' : 'default'}
                className="text-xs"
              >
                {change}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function MetricsGrid() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { viewMode, deviceFilter } = useMetricsView();
  
  // Unified metrics
  const { metrics: unifiedMetrics, loading: unifiedLoading } = useLatestUnifiedMetrics();
  
  // Device-specific metrics
  const { metrics: deviceMetrics, loading: deviceLoading } = useDeviceMetrics(deviceFilter);
  
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["body_fat", "weight", "recovery", "steps"]);
  const [metrics, setMetrics] = useState<Record<string, any>>({
    body_fat: { value: "18.5", change: "-3%", source: "withings", sources: [] },
    weight: { value: "72.0", change: "-2%", source: "withings", sources: [] },
    vo2max: { value: "52.1", records: 71, source: "garmin", sources: [] },
    row_2km: { value: "7:25", change: "-2%", attempts: 34, source: "manual", sources: [] },
    recovery: { value: "—", change: null, source: "whoop", sources: [] },
    steps: { value: "12,847", change: "+12%", source: "terra", sources: [] }
  });
  const [loading, setLoading] = useState(true);
  const [syncAttempted, setSyncAttempted] = useState(false);

  const metricConfig: Record<string, MetricConfig> = {
    body_fat: { key: "body_fat", title: t('metrics.bodyFat'), unit: t('metrics.units.percent'), color: "body-fat", description: "Body fat percentage", category: "body" },
    weight: { key: "weight", title: t('metrics.weight'), unit: t('metrics.units.kg'), color: "weight", description: "Weight measurements", category: "body" },
    vo2max: { key: "vo2max", title: t('metrics.vo2max'), unit: "ML/KG/MIN", color: "vo2max", description: "Cardiovascular fitness", category: "performance" },
    row_2km: { key: "row_2km", title: "2KM ROW", unit: "MIN", color: "row", description: "Rowing performance", category: "performance" },
    recovery: { key: "recovery", title: t('metrics.recovery'), unit: t('metrics.units.percent'), color: "recovery", description: "Daily recovery", category: "health" },
    steps: { key: "steps", title: t('metrics.steps'), unit: t('metrics.units.steps'), color: "steps", description: "Step count", category: "health" }
  };

  // Маппинг unified метрик к нашим ключам
  const unifiedToLocalMapping: Record<string, string> = {
    'Recovery Score': 'recovery',
    'Weight': 'weight',
    'Body Fat Percentage': 'body_fat',
    'VO2Max': 'vo2max',
    'Steps': 'steps',
  };

  useEffect(() => {
    if (!user) return;

    // Load user preferences
    const savedMetrics = localStorage.getItem(`user_metrics_${user.id}`);
    if (savedMetrics) {
      try {
        const parsed = JSON.parse(savedMetrics);
        const migrated = Array.isArray(parsed)
          ? parsed.map((k: string) => (k === 'row_2km' ? 'steps' : k))
          : parsed;
        setSelectedMetrics(migrated);
      } catch {}
    }
  }, [user]);

  // Обновляем метрики в зависимости от режима просмотра
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (viewMode === 'unified') {
      // Unified mode - используем агрегированные данные
      if (!unifiedLoading && Object.keys(unifiedMetrics).length > 0) {
        const newMetrics: Record<string, any> = { ...metrics };

        Object.entries(unifiedMetrics).forEach(([unifiedName, data]) => {
          const localKey = unifiedToLocalMapping[unifiedName];
          if (localKey && data) {
            newMetrics[localKey] = {
              value: data.aggregated_value?.toFixed(localKey === 'steps' ? 0 : 1) || '—',
              source: data.sources?.[0] || 'unified',
              sources: data.sources || [],
              source_count: data.source_count || 0,
              source_values: data.source_values || {},
              change: null, // Можно добавить расчет change позже
            };
          }
        });

        setMetrics(newMetrics);
        setLoading(false);
      } else if (!unifiedLoading) {
        setLoading(false);
      }
    } else if (viewMode === 'by_device' && deviceFilter !== 'all') {
      // Device mode - используем данные конкретного девайса
      if (!deviceLoading) {
        // Подготовим пустые значения
        const newMetrics: Record<string, any> = {
          body_fat: { value: '—', change: null, source: null, sources: [] },
          weight: { value: '—', change: null, source: null, sources: [] },
          vo2max: { value: '—', records: 0, source: null, sources: [] },
          row_2km: { value: '—', change: null, attempts: 0, source: null, sources: [] },
          recovery: { value: '—', change: null, source: null, sources: [] },
          steps: { value: '—', change: null, source: null, sources: [] }
        };

        if (Object.keys(deviceMetrics).length > 0) {
          // Приоритеты по названиям метрик для каждой карточки
          const pickMetric = (names: string[]): any | null => {
            // Найдём первую из указанных метрик; значения deviceMetrics уже самые свежие по имени
            for (const n of names) {
              const found = Object.entries(deviceMetrics).find(([metricName]) => metricName === n);
              if (found) return found[1];
            }
            return null;
          };

          // Recovery: приоритетно Recovery Score -> Sleep Performance -> Sleep Efficiency
          const recoveryMetric = pickMetric(['Recovery Score', 'Sleep Performance', 'Sleep Efficiency']);
          if (recoveryMetric && typeof recoveryMetric.value === 'number') {
            newMetrics.recovery = {
              value: Math.round(recoveryMetric.value).toString(),
              source: deviceFilter,
              sources: [deviceFilter],
              change: null,
            };
          }

          // Weight: Weight | Body Mass
          const weightMetric = pickMetric(['Weight', 'Body Mass', 'Body Weight', 'Weight (kg)', 'HKQuantityTypeIdentifierBodyMass']);
          if (weightMetric && typeof weightMetric.value === 'number') {
            newMetrics.weight = {
              value: Number(weightMetric.value).toFixed(1),
              source: deviceFilter,
              sources: [deviceFilter],
              change: null,
            };
          }

          // Body Fat: Body Fat Percentage | Body Fat % | Fat Mass
          const bodyFatMetric = pickMetric(['Body Fat Percentage', 'Body Fat %', 'Fat Mass', 'HKQuantityTypeIdentifierBodyFatPercentage']);
          if (bodyFatMetric && typeof bodyFatMetric.value === 'number') {
            newMetrics.body_fat = {
              value: Number(bodyFatMetric.value).toFixed(1),
              source: deviceFilter,
              sources: [deviceFilter],
              change: null,
            };
          }

          // VO2Max
          const vo2Metric = pickMetric(['VO2Max', 'VO2 Max']);
          if (vo2Metric && typeof vo2Metric.value === 'number') {
            newMetrics.vo2max = {
              value: Number(vo2Metric.value).toFixed(1),
              source: deviceFilter,
              sources: [deviceFilter],
              records: 0,
            };
          }

          // Steps
          const stepsMetric = pickMetric(['Steps', 'Step Count', 'HKQuantityTypeIdentifierStepCount']);
          if (stepsMetric && typeof stepsMetric.value === 'number') {
            newMetrics.steps = {
              value: Math.round(stepsMetric.value).toLocaleString(),
              source: deviceFilter,
              sources: [deviceFilter],
              change: null,
            };
          }
        }

        setMetrics(newMetrics);
        setLoading(false);
      }
    }
  }, [user, viewMode, deviceFilter, unifiedMetrics, deviceMetrics, unifiedLoading, deviceLoading]);

  const handleMetricsChange = (newMetrics: string[]) => {
    setSelectedMetrics(newMetrics);
  };

  if (loading || unifiedLoading || deviceLoading) {
    return <MetricsGridSkeleton />;
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {selectedMetrics.map((metricKey, index) => {
          const config = metricConfig[metricKey];
          const data = metrics[metricKey];
          
          if (!config || !data) return null;
          
          // Маппинг метрик на роуты
          const routeMap: Record<string, string> = {
            'body_fat': 'body_fat',
            'weight': 'weight',
            'vo2max': 'vo2max',
            'row_2km': 'row_2km',
            'recovery': 'recovery',
            'steps': 'steps'
          };
          
          return (
            <MetricCard
              key={metricKey}
              title={config.title}
              value={data.value}
              unit={config.unit}
              change={data.change}
              source={data.source}
              sources={data.sources}
              color={config.color}
              onClick={() => navigate(`/metric/${routeMap[metricKey] || metricKey}`)}
              onSourceChange={(newSource) => {
                console.log(`Switched ${metricKey} to source: ${newSource}`);
              }}
            />
          );
        })}

        {/* Team Rank Circle - only show on mobile/tablet in unified mode */}
        {viewMode === 'unified' && (
          <div className="lg:hidden absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="bg-card border-2 border-primary rounded-full w-20 h-20 flex flex-col items-center justify-center shadow-glow">
              <div className="text-xs text-muted-foreground uppercase">{t('leaderboard.title')}</div>
              <div className="text-xs text-muted-foreground uppercase">{t('leaderboard.rank')}</div>
              <div className="text-lg font-bold text-primary">#3</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}