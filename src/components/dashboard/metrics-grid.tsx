import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) return;

      try {
        // Load user preferences (migrate legacy row_2km -> steps)
        const savedMetrics = localStorage.getItem(`user_metrics_${user.id}`);
        if (savedMetrics) {
          try {
            const parsed = JSON.parse(savedMetrics);
            const migrated = Array.isArray(parsed)
              ? parsed.map((k: string) => (k === 'row_2km' ? 'steps' : k))
              : parsed;
            setSelectedMetrics(migrated);
            if (JSON.stringify(migrated) !== savedMetrics) {
              localStorage.setItem(`user_metrics_${user.id}`, JSON.stringify(migrated));
            }
          } catch {}
        }

        // Мгновенная отрисовка из кэша
        const cached = localStorage.getItem(`metrics_grid_${user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.metrics) {
            setMetrics(parsed.metrics);
            setLoading(false);
          }
        }

        // Fetch real data from database (параллельно)
        const today = new Date().toISOString().split('T')[0];

        const [
          recoveryRes,
          stepsRes,
          stepsMVRes,
          weightRes,
          weightBCRes,
          bodyFatRes,
          bodyFatBCRes,
          vo2maxRes,
        ] = await Promise.all([
          // Recovery — берем значения ТОЛЬКО за сегодня. При отсутствии Recovery Score используем Sleep Performance
          supabase
            .from('metric_values')
            .select(`value, measurement_date, created_at, user_metrics!inner(metric_name, source)`)
            .eq('user_id', user.id)
            .eq('user_metrics.source', 'whoop')
            .in('user_metrics.metric_name', ['Recovery Score', 'Recovery', 'Sleep Performance'])
            .eq('measurement_date', today)
            .order('created_at', { ascending: false })
            .limit(3),
          // Steps from daily summary
          supabase
            .from('daily_health_summary')
            .select('steps, date')
            .eq('user_id', user.id)
            .not('steps', 'is', null)
            .order('date', { ascending: false })
            .limit(2),
          // Fallback steps from metric_values
          supabase
            .from('metric_values')
            .select(`value, measurement_date, user_metrics!inner(metric_name)`) 
            .eq('user_id', user.id)
            .in('user_metrics.metric_name', ['Steps', 'Количество шагов'])
            .order('measurement_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(2),
          // Weight from metric_values (any source)
          supabase
            .from('metric_values')
            .select(`value, measurement_date, user_metrics!inner(metric_name, source)`) 
            .eq('user_id', user.id)
            .in('user_metrics.metric_name', ['Weight', 'Вес', 'Body Mass', 'Body Weight', 'Weight (kg)', 'HKQuantityTypeIdentifierBodyMass'])
            .order('measurement_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(2),
          // Weight fallback body composition
          supabase
            .from('body_composition')
            .select('weight, measurement_date')
            .eq('user_id', user.id)
            .not('weight', 'is', null)
            .order('measurement_date', { ascending: false })
            .limit(2),
          // Body Fat from Withings
          supabase
            .from('metric_values')
            .select(`value, measurement_date, user_metrics!inner(metric_name, source)`) 
            .eq('user_id', user.id)
            .in('user_metrics.metric_name', ['Body Fat Percentage', 'Процент жира'])
            .eq('user_metrics.source', 'withings')
            .order('measurement_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(2),
          // Body Fat fallback body composition
          supabase
            .from('body_composition')
            .select('body_fat_percentage, measurement_date')
            .eq('user_id', user.id)
            .not('body_fat_percentage', 'is', null)
            .order('measurement_date', { ascending: false })
            .limit(2),
          // VO2Max
          supabase
            .from('metric_values')
            .select(`value, measurement_date, user_metrics!inner(metric_name)`) 
            .eq('user_id', user.id)
            .eq('user_metrics.metric_name', 'VO2Max')
            .order('measurement_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1),
        ]);

        const recoveryData = recoveryRes.data || [];
        const stepsData = stepsRes.data || [];
        const stepsMV = stepsMVRes.data || [];
        const weightData = weightRes.data || [];
        const weightBC = weightBCRes.data || [];
        const bodyFatData = bodyFatRes.data || [];
        const bodyFatBC = bodyFatBCRes.data || [];
        const vo2maxData = vo2maxRes.data || [];

        const newMetrics: Record<string, any> = {
          body_fat: { value: '—', change: null, source: null, sources: [] },
          weight: { value: '—', change: null, source: null, sources: [] },
          vo2max: { value: '—', records: 0, source: null, sources: [] },
          row_2km: { value: '—', change: null, attempts: 0, source: null, sources: [] },
          recovery: { value: '—', change: null, source: null, sources: [] },
          steps: { value: '—', change: null, source: null, sources: [] }
        };

        // Recovery
        if (recoveryData.length > 0) {
          const preferred = recoveryData.find((r: any) => r.user_metrics?.metric_name === 'Recovery Score' || r.user_metrics?.metric_name === 'Recovery')
            || recoveryData.find((r: any) => r.user_metrics?.metric_name === 'Sleep Performance');
          if (preferred) {
            const current = Math.round(Number(preferred.value));
            newMetrics.recovery.value = current.toString();
            newMetrics.recovery.source = preferred.user_metrics?.source || 'whoop';
            newMetrics.recovery.sources = ['whoop'];
          }
        }

        // Steps
        if (stepsData.length > 0) {
          newMetrics.steps.value = stepsData[0].steps.toLocaleString();
          if (stepsData.length > 1 && stepsData[1].steps) {
            const change = Math.round(((stepsData[0].steps - stepsData[1].steps) / stepsData[1].steps) * 100);
            newMetrics.steps.change = change >= 0 ? `+${change}%` : `${change}%`;
          }
          newMetrics.steps.source = 'terra';
          newMetrics.steps.sources = ['terra'];
        } else if (stepsMV.length > 0) {
          const curr = Number(stepsMV[0].value) || 0;
          newMetrics.steps.value = curr.toLocaleString();
          if (stepsMV.length > 1 && stepsMV[1].value) {
            const prev = Number(stepsMV[1].value) || 0;
            if (prev > 0) {
              const change = Math.round(((curr - prev) / prev) * 100);
              newMetrics.steps.change = change >= 0 ? `+${change}%` : `${change}%`;
            }
          }
          newMetrics.steps.source = 'terra';
          newMetrics.steps.sources = ['terra'];
        }

        // Weight
        if (weightData.length > 0) {
          newMetrics.weight.value = weightData[0].value.toFixed(1);
          if (weightData.length > 1) {
            const change = Math.round(((weightData[0].value - weightData[1].value) / weightData[1].value) * 100);
            newMetrics.weight.change = change >= 0 ? `+${change}%` : `${change}%`;
          }
          newMetrics.weight.source = weightData[0].user_metrics?.source || 'withings';
          // Собираем уникальные источники
          const uniqueSources = [...new Set(weightData.map((w: any) => w.user_metrics?.source).filter(Boolean))];
          newMetrics.weight.sources = uniqueSources.length > 0 ? uniqueSources : ['withings'];
        } else if (weightBC.length > 0) {
          const curr = Number(weightBC[0].weight);
          newMetrics.weight.value = curr.toFixed(1);
          if (weightBC.length > 1 && weightBC[1].weight) {
            const prev = Number(weightBC[1].weight);
            if (prev > 0) {
              const change = Math.round(((curr - prev) / prev) * 100);
              newMetrics.weight.change = change >= 0 ? `+${change}%` : `${change}%`;
            }
          }
          newMetrics.weight.source = 'manual';
          newMetrics.weight.sources = ['manual'];
        }

        // Body Fat
        if (bodyFatData.length > 0) {
          newMetrics.body_fat.value = bodyFatData[0].value.toFixed(1);
          if (bodyFatData.length > 1) {
            const change = Math.round(((bodyFatData[1].value - bodyFatData[0].value) / bodyFatData[0].value) * 100);
            newMetrics.body_fat.change = change >= 0 ? `+${change}%` : `${change}%`;
          }
          newMetrics.body_fat.source = bodyFatData[0].user_metrics?.source || 'withings';
          const uniqueSources = [...new Set(bodyFatData.map((b: any) => b.user_metrics?.source).filter(Boolean))];
          newMetrics.body_fat.sources = uniqueSources.length > 0 ? uniqueSources : ['withings'];
        } else if (bodyFatBC.length > 0) {
          const curr = Number(bodyFatBC[0].body_fat_percentage);
          newMetrics.body_fat.value = curr.toFixed(1);
          if (bodyFatBC.length > 1 && bodyFatBC[1].body_fat_percentage) {
            const prev = Number(bodyFatBC[1].body_fat_percentage);
            if (curr !== 0) {
              const change = Math.round(((prev - curr) / curr) * 100);
              newMetrics.body_fat.change = change >= 0 ? `+${change}%` : `${change}%`;
            }
          }
          newMetrics.body_fat.source = 'manual';
          newMetrics.body_fat.sources = ['manual'];
        }

        // VO2Max
        if (vo2maxData.length > 0) {
          newMetrics.vo2max.value = vo2maxData[0].value.toFixed(1);
          newMetrics.vo2max.source = 'garmin';
          newMetrics.vo2max.sources = ['garmin'];
        }

        setMetrics(newMetrics);
        try {
          localStorage.setItem(`metrics_grid_${user.id}` , JSON.stringify({ metrics: newMetrics, ts: Date.now() }));
        } catch {}
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  const handleMetricsChange = (newMetrics: string[]) => {
    setSelectedMetrics(newMetrics);
  };

  if (loading) {
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
                // Здесь можно добавить логику для загрузки данных от другого источника
              }}
            />
          );
        })}

        {/* Team Rank Circle - only show on mobile/tablet */}
        <div className="lg:hidden absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="bg-card border-2 border-primary rounded-full w-20 h-20 flex flex-col items-center justify-center shadow-glow">
            <div className="text-xs text-muted-foreground uppercase">{t('leaderboard.title')}</div>
            <div className="text-xs text-muted-foreground uppercase">{t('leaderboard.rank')}</div>
            <div className="text-lg font-bold text-primary">#3</div>
          </div>
        </div>
      </div>
    </div>
  );
}