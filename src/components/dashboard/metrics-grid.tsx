import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MetricsSettings, MetricConfig } from "./metrics-settings";

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  change?: string;
  subtitle?: string;
  color: "body-fat" | "weight" | "vo2max" | "row" | "recovery" | "steps";
}

function MetricCard({ title, value, unit, change, subtitle, color, onClick }: MetricCardProps & { onClick?: () => void }) {
  const colorClasses = {
    "body-fat": "border-metric-body-fat bg-metric-body-fat/5",
    "weight": "border-metric-weight bg-metric-weight/5", 
    "vo2max": "border-metric-vo2max bg-metric-vo2max/5",
    "row": "border-metric-row bg-metric-row/5",
    "recovery": "border-success bg-success/5",
    "steps": "border-accent bg-accent/5"
  };

  return (
    <Card 
      className={cn(
        "border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer",
        colorClasses[color]
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
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
          {subtitle && (
            <span className="text-xs text-muted-foreground">
              {subtitle}
            </span>
          )}
          {change && (
            <Badge 
              variant={change.startsWith('-') ? "destructive" : "default"}
              className="text-xs"
            >
              {change}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsGrid() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["body_fat", "weight", "vo2max", "row_2km"]);
  const [metrics, setMetrics] = useState<Record<string, any>>({
    body_fat: { value: "18.5", change: "-3%", subtitle: "полненькей" },
    weight: { value: "72.0", change: "-2%", subtitle: "по ланзей" },
    vo2max: { value: "52.1", records: 71, subtitle: "71 записей" },
    row_2km: { value: "7:25", change: "-2%", attempts: 34, subtitle: "34 попыток" },
    recovery: { value: "85", change: "+5%", subtitle: "excellent" },
    steps: { value: "12,847", change: "+12%", subtitle: "daily average" }
  });
  const [loading, setLoading] = useState(true);

  const metricConfig: Record<string, MetricConfig> = {
    body_fat: { key: "body_fat", title: "BODY FAT ЖИРА", unit: "%", color: "body-fat", description: "Body fat percentage", category: "body" },
    weight: { key: "weight", title: "WEIGHT", unit: "кг", color: "weight", description: "Weight measurements", category: "body" },
    vo2max: { key: "vo2max", title: "VO₂MAX", unit: "ML/KG/MIN", color: "vo2max", description: "Cardiovascular fitness", category: "performance" },
    row_2km: { key: "row_2km", title: "2KM ROW", unit: "MIN", color: "row", description: "Rowing performance", category: "performance" },
    recovery: { key: "recovery", title: "RECOVERY SCORE", unit: "%", color: "recovery", description: "Daily recovery", category: "health" },
    steps: { key: "steps", title: "DAILY STEPS", unit: "steps", color: "steps", description: "Step count", category: "health" }
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) return;

      try {
        // Load user preferences
        const savedMetrics = localStorage.getItem(`user_metrics_${user.id}`);
        if (savedMetrics) {
          setSelectedMetrics(JSON.parse(savedMetrics));
        }

        // Fetch real data from database
        const today = new Date().toISOString().split('T')[0];
        
        // Get Recovery Score from Whoop
        const { data: recoveryData, error: recoveryError } = await supabase
          .from('metric_values')
          .select(`
            value,
            measurement_date,
            user_metrics!inner(metric_name, source)
          `)
          .eq('user_id', user.id)
          .eq('user_metrics.metric_name', 'Recovery Score')
          .eq('user_metrics.source', 'whoop')
          .order('measurement_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(2);
        
        // Get Steps from daily summary
        const { data: stepsData, error: stepsError } = await supabase
          .from('daily_health_summary')
          .select('steps, date')
          .eq('user_id', user.id)
          .not('steps', 'is', null)
          .order('date', { ascending: false })
          .limit(2);
        
        // Fallback: Steps from metric_values if no daily summary
        const { data: stepsMV, error: stepsMVError } = await supabase
          .from('metric_values')
          .select(`
            value,
            measurement_date,
            user_metrics!inner(metric_name)
          `)
          .eq('user_id', user.id)
          .in('user_metrics.metric_name', ['Steps', 'Количество шагов'])
          .order('measurement_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(2);
        
        // Get Weight from Withings
        const { data: weightData, error: weightError } = await supabase
          .from('metric_values')
          .select(`
            value,
            measurement_date,
            user_metrics!inner(metric_name, source)
          `)
          .eq('user_id', user.id)
          .eq('user_metrics.metric_name', 'Weight')
          .eq('user_metrics.source', 'withings')
          .order('measurement_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(2);
        
        // Fallback: latest Weight from body_composition
        const { data: weightBC, error: weightBCError } = await supabase
          .from('body_composition')
          .select('weight, measurement_date')
          .eq('user_id', user.id)
          .not('weight', 'is', null)
          .order('measurement_date', { ascending: false })
          .limit(2);
        
        // Get Body Fat from Withings
        const { data: bodyFatData, error: bodyFatError } = await supabase
          .from('metric_values')
          .select(`
            value,
            measurement_date,
            user_metrics!inner(metric_name, source)
          `)
          .eq('user_id', user.id)
          .eq('user_metrics.metric_name', 'Body Fat Percentage')
          .eq('user_metrics.source', 'withings')
          .order('measurement_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(2);
        
        // Fallback: latest Body Fat from body_composition
        const { data: bodyFatBC, error: bodyFatBCError } = await supabase
          .from('body_composition')
          .select('body_fat_percentage, measurement_date')
          .eq('user_id', user.id)
          .not('body_fat_percentage', 'is', null)
          .order('measurement_date', { ascending: false })
          .limit(2);
        
        // Get VO2Max
        const { data: vo2maxData, error: vo2maxError } = await supabase
          .from('metric_values')
          .select(`
            value,
            measurement_date,
            user_metrics!inner(metric_name)
          `)
          .eq('user_id', user.id)
          .eq('user_metrics.metric_name', 'VO2Max')
          .order('measurement_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1);

        // Calculate metrics with changes
        const newMetrics: Record<string, any> = {
          body_fat: { value: "—", change: null, subtitle: "" },
          weight: { value: "—", change: null, subtitle: "" },
          vo2max: { value: "—", records: 0, subtitle: "0 записей" },
          row_2km: { value: "—", change: null, attempts: 0, subtitle: "0 попыток" },
          recovery: { value: "—", change: null, subtitle: "" },
          steps: { value: "—", change: null, subtitle: "" }
        };

        // Recovery
        if (recoveryData && recoveryData.length > 0) {
          const current = Math.round(recoveryData[0].value);
          newMetrics.recovery.value = current.toString();
          
          if (recoveryData.length > 1) {
            const change = Math.round(recoveryData[0].value - recoveryData[1].value);
            newMetrics.recovery.change = change >= 0 ? `+${change}%` : `${change}%`;
          }
          
          if (current >= 67) newMetrics.recovery.subtitle = "excellent";
          else if (current >= 34) newMetrics.recovery.subtitle = "good";
          else newMetrics.recovery.subtitle = "low";
        }

        // Steps
        if (stepsData && stepsData.length > 0) {
          newMetrics.steps.value = stepsData[0].steps.toLocaleString();
          if (stepsData.length > 1 && stepsData[1].steps) {
            const change = Math.round(((stepsData[0].steps - stepsData[1].steps) / stepsData[1].steps) * 100);
            newMetrics.steps.change = change >= 0 ? `+${change}%` : `${change}%`;
          }
          newMetrics.steps.subtitle = "daily average";
        } else if (stepsMV && stepsMV.length > 0) {
          const curr = Number(stepsMV[0].value) || 0;
          newMetrics.steps.value = curr.toLocaleString();
          if (stepsMV.length > 1 && stepsMV[1].value) {
            const prev = Number(stepsMV[1].value) || 0;
            if (prev > 0) {
              const change = Math.round(((curr - prev) / prev) * 100);
              newMetrics.steps.change = change >= 0 ? `+${change}%` : `${change}%`;
            }
          }
          newMetrics.steps.subtitle = "latest steps";
        }

        // Weight
        if (weightData && weightData.length > 0) {
          newMetrics.weight.value = weightData[0].value.toFixed(1);
          if (weightData.length > 1) {
            const change = Math.round(((weightData[0].value - weightData[1].value) / weightData[1].value) * 100);
            newMetrics.weight.change = change >= 0 ? `+${change}%` : `${change}%`;
          }
          newMetrics.weight.subtitle = "по ланзей";
        } else if (weightBC && weightBC.length > 0) {
          const curr = Number(weightBC[0].weight);
          newMetrics.weight.value = curr.toFixed(1);
          if (weightBC.length > 1 && weightBC[1].weight) {
            const prev = Number(weightBC[1].weight);
            if (prev > 0) {
              const change = Math.round(((curr - prev) / prev) * 100);
              newMetrics.weight.change = change >= 0 ? `+${change}%` : `${change}%`;
            }
          }
          newMetrics.weight.subtitle = "по ланзей";
        }

        // Body Fat
        if (bodyFatData && bodyFatData.length > 0) {
          newMetrics.body_fat.value = bodyFatData[0].value.toFixed(1);
          if (bodyFatData.length > 1) {
            const change = Math.round(((bodyFatData[1].value - bodyFatData[0].value) / bodyFatData[0].value) * 100);
            newMetrics.body_fat.change = change >= 0 ? `+${change}%` : `${change}%`;
          }
          newMetrics.body_fat.subtitle = "полненькей";
        } else if (bodyFatBC && bodyFatBC.length > 0) {
          const curr = Number(bodyFatBC[0].body_fat_percentage);
          newMetrics.body_fat.value = curr.toFixed(1);
          if (bodyFatBC.length > 1 && bodyFatBC[1].body_fat_percentage) {
            const prev = Number(bodyFatBC[1].body_fat_percentage);
            if (curr !== 0) {
              const change = Math.round(((prev - curr) / curr) * 100);
              newMetrics.body_fat.change = change >= 0 ? `+${change}%` : `${change}%`;
            }
          }
          newMetrics.body_fat.subtitle = "полненькей";
        }

        // VO2Max
        if (vo2maxData && vo2maxData.length > 0) {
          newMetrics.vo2max.value = vo2maxData[0].value.toFixed(1);
          newMetrics.vo2max.subtitle = "71 записей";
        }

        setMetrics(newMetrics);
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
    return (
      <div className="grid grid-cols-2 gap-4 px-6 relative">
        <MetricsSettings 
          selectedMetrics={selectedMetrics}
          onMetricsChange={handleMetricsChange}
        />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <MetricsSettings 
        selectedMetrics={selectedMetrics}
        onMetricsChange={handleMetricsChange}
      />
      
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
              subtitle={data.subtitle}
              color={config.color}
              onClick={() => navigate(`/metric/${routeMap[metricKey] || metricKey}`)}
            />
          );
        })}

        {/* Team Rank Circle - only show on mobile/tablet */}
        <div className="lg:hidden absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="bg-card border-2 border-primary rounded-full w-20 h-20 flex flex-col items-center justify-center shadow-glow">
            <div className="text-xs text-muted-foreground">TEAM</div>
            <div className="text-xs text-muted-foreground">RANK:</div>
            <div className="text-lg font-bold text-primary">#3</div>
          </div>
        </div>
      </div>
    </div>
  );
}