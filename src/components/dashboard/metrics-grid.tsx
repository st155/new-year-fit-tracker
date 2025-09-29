import { useState, useEffect } from "react";
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

function MetricCard({ title, value, unit, change, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    "body-fat": "border-metric-body-fat bg-metric-body-fat/5",
    "weight": "border-metric-weight bg-metric-weight/5", 
    "vo2max": "border-metric-vo2max bg-metric-vo2max/5",
    "row": "border-metric-row bg-metric-row/5",
    "recovery": "border-success bg-success/5",
    "steps": "border-accent bg-accent/5"
  };

  return (
    <Card className={cn(
      "border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg",
      colorClasses[color]
    )}>
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

        // Mock data - в реальном приложении здесь будут API вызовы
        setMetrics({
          body_fat: { value: "18.5", change: "-3%", subtitle: "полненькей" },
          weight: { value: "72.0", change: "-2%", subtitle: "по ланзей" },
          vo2max: { value: "52.1", records: 71, subtitle: "71 записей" },
          row_2km: { value: "7:25", change: "-2%", attempts: 34, subtitle: "34 попыток" },
          recovery: { value: "85", change: "+5%", subtitle: "excellent" },
          steps: { value: "12,847", change: "+12%", subtitle: "daily average" }
        });
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
    <div className="px-6 relative">
      <MetricsSettings 
        selectedMetrics={selectedMetrics}
        onMetricsChange={handleMetricsChange}
      />
      
      <div className="grid grid-cols-2 gap-4 relative">
        {selectedMetrics.map((metricKey, index) => {
          const config = metricConfig[metricKey];
          const data = metrics[metricKey];
          
          if (!config || !data) return null;
          
          return (
            <MetricCard
              key={metricKey}
              title={config.title}
              value={data.value}
              unit={config.unit}
              change={data.change}
              subtitle={data.subtitle}
              color={config.color}
            />
          );
        })}

        {/* Team Rank Circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
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