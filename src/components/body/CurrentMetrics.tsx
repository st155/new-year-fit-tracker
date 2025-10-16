import { Skeleton } from "@/components/ui/skeleton";
import { Scale, Activity, Zap, Flame, Droplet, FileText, Dumbbell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAggregatedBodyMetrics } from "@/hooks/useAggregatedBodyMetrics";
import { BodyMetricCard } from "./BodyMetricCard";
import { SegmentalAnalysis } from "./SegmentalAnalysis";

interface CurrentMetricsProps {
  current: any;
  isLoading: boolean;
}

export function CurrentMetrics({ current, isLoading }: CurrentMetricsProps) {
  const { user } = useAuth();
  const metrics = useAggregatedBodyMetrics(user?.id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const hasAnyData = metrics.weight || metrics.bodyFat || metrics.muscleMass;

  if (!hasAnyData) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-muted-foreground">
          <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No body composition data yet</p>
          <p className="text-sm">Add your first measurement or upload an InBody report!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main metrics grid - primary metrics */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <BodyMetricCard
          title="Weight"
          icon={<Scale className="h-4 w-4" />}
          data={metrics.weight}
        />
        <BodyMetricCard
          title="Body Fat %"
          icon={<Activity className="h-4 w-4" />}
          data={metrics.bodyFat}
        />
        <BodyMetricCard
          title="Muscle Mass"
          icon={<Zap className="h-4 w-4" />}
          data={metrics.muscleMass}
        />
        <BodyMetricCard
          title="BMR"
          icon={<Flame className="h-4 w-4" />}
          data={metrics.bmr}
        />
      </div>

      {/* Additional InBody metrics if available */}
      {(metrics.visceralFat || metrics.bodyWater || metrics.protein || metrics.minerals) && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {metrics.visceralFat && (
            <BodyMetricCard
              title="Visceral Fat"
              icon={<Activity className="h-4 w-4" />}
              data={metrics.visceralFat}
            />
          )}
          {metrics.bodyWater && (
            <BodyMetricCard
              title="Body Water"
              icon={<Droplet className="h-4 w-4" />}
              data={metrics.bodyWater}
            />
          )}
          {metrics.protein && (
            <BodyMetricCard
              title="Protein"
              icon={<Dumbbell className="h-4 w-4" />}
              data={metrics.protein}
            />
          )}
          {metrics.minerals && (
            <BodyMetricCard
              title="Minerals"
              icon={<FileText className="h-4 w-4" />}
              data={metrics.minerals}
            />
          )}
        </div>
      )}

      {/* Segmental analysis if available */}
      {metrics.segmental && (
        <SegmentalAnalysis segmental={metrics.segmental} />
      )}
    </div>
  );
}
