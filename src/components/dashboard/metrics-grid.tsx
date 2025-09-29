import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  change?: string;
  subtitle?: string;
  color: "body-fat" | "weight" | "vo2max" | "row";
}

function MetricCard({ title, value, unit, change, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    "body-fat": "border-metric-body-fat bg-metric-body-fat/5",
    "weight": "border-metric-weight bg-metric-weight/5", 
    "vo2max": "border-metric-vo2max bg-metric-vo2max/5",
    "row": "border-metric-row bg-metric-row/5"
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
  const [metrics, setMetrics] = useState({
    bodyFat: { value: "0", change: "0%" },
    weight: { value: "0", change: "0%" },
    vo2max: { value: "0", records: 0 },
    row: { value: "0:00", change: "0%", attempts: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) return;

      try {
        // Use mock data for now to avoid type errors
        setMetrics({
          bodyFat: { value: "18.5", change: "-3%" },
          weight: { value: "72.0", change: "-2%" },
          vo2max: { value: "52.1", records: 71 },
          row: { value: "7:25", change: "-2%", attempts: 34 }
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 px-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-6">
      <div className="grid grid-cols-2 gap-4 relative">
        <MetricCard
          title="BODY FAT ЖИРА"
          value={metrics.bodyFat.value}
          unit="%"
          change={metrics.bodyFat.change}
          subtitle="полненькей"
          color="body-fat"
        />
        
        <MetricCard
          title="WEIGHT"
          value={metrics.weight.value}
          unit="кг"
          change={metrics.weight.change}
          subtitle="по ланзей"
          color="weight"
        />
        
        <MetricCard
          title="VO₂MAX"
          value={metrics.vo2max.value}
          unit="ML/KG/MIN"
          subtitle={`${metrics.vo2max.records} записей`}
          color="vo2max"
        />
        
        <MetricCard
          title="2KM ROW"
          value={metrics.row.value}
          unit="MIN"
          change={metrics.row.change}
          subtitle={`${metrics.row.attempts} попыток`}
          color="row"
        />

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