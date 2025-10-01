import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="space-y-6 pb-8">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6 rounded-b-3xl border-b border-border/50">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="space-y-2">
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="px-6">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2 p-4 rounded-2xl bg-card/30 border border-border/30">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="px-6 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        </div>

        {/* Additional Content Skeleton */}
        <div className="px-6">
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Today Activity */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            </div>

            {/* Additional Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>

            {/* Goals */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MetricsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 animate-fade-in">
      {[...Array(4)].map((_, i) => (
        <div 
          key={i} 
          className="space-y-2 p-4 rounded-2xl bg-card/30 border border-border/30"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function GoalsProgressSkeleton() {
  return (
    <div className="space-y-3 animate-fade-in">
      <Skeleton className="h-4 w-28" />
      <div className="space-y-2 stagger-fade-in">
        {[...Array(2)].map((_, i) => (
          <div 
            key={i}
            className="p-3 rounded-xl bg-card/40 border border-border/30 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-3 animate-fade-in">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl bg-card/40 border border-border/30"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompactMetricSkeleton() {
  return (
    <div className="border-2 border-border/20 rounded-xl p-3 bg-card/20 animate-fade-in">
      <div className="flex items-start justify-between mb-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-2 w-24" />
      </div>
    </div>
  );
}
