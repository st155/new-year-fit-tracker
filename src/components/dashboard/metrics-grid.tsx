import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/translations";
import { useAuth } from "@/hooks/useAuth";
import { useMetricsView } from "@/contexts/MetricsViewContext";
import { useLatestMetrics, useDeviceMetrics } from "@/hooks/metrics";
import { useMetricMapping } from "@/hooks/metrics/useMetricMapping";
import { MetricsGridSkeleton } from "@/components/ui/dashboard-skeleton";
import { MetricCard } from "@/components/metrics";
import { createMetricConfig, MetricKey } from "@/lib/metric-config";

// MetricCard is now imported from @/components/metrics

export function MetricsGrid() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { viewMode, deviceFilter } = useMetricsView();
  
  // Unified metrics
  const { metrics: unifiedMetrics, loading: unifiedLoading } = useLatestMetrics(user?.id);
  
  // Device-specific metrics
  const { metrics: deviceMetrics, loading: deviceLoading } = useDeviceMetrics(user?.id, deviceFilter);
  
  // Metric configuration
  const metricConfig = createMetricConfig(t);
  
  // Map metrics using centralized hook
  const mappedMetrics = useMetricMapping(unifiedMetrics, deviceMetrics, viewMode, deviceFilter);
  
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(["body_fat", "weight", "recovery", "max_hr"]);
  const [loading, setLoading] = useState(true);

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

  // Update loading state
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (unifiedLoading || deviceLoading) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [user, unifiedLoading, deviceLoading]);

  if (loading) {
    return <MetricsGridSkeleton />;
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {selectedMetrics.map((metricKey) => {
          const config = metricConfig[metricKey];
          const data = mappedMetrics[metricKey];
          
          if (!config || !data) return null;
          
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
              onClick={() => config.route && navigate(`/metric/${config.route}`)}
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