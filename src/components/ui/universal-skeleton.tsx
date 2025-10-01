import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Универсальный Skeleton для карточки активности
export function ActivityCardSkeleton() {
  return (
    <Card className="animate-fade-in">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

// Skeleton для списка активностей
export function ActivityListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4 stagger-fade-in">
      {Array.from({ length: count }).map((_, i) => (
        <ActivityCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton для карточки метрики прогресса
export function ProgressCardSkeleton() {
  return (
    <Card className="overflow-hidden animate-fade-in">
      <div className="relative h-32 bg-gradient-to-br from-muted/50 to-muted/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>
      </div>
      <CardContent className="pt-4 space-y-2">
        <Skeleton className="h-5 w-28" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// Skeleton для грида метрик
export function ProgressGridSkeleton({ columns = 2, count = 6 }: { columns?: number; count?: number }) {
  return (
    <div 
      className={`grid grid-cols-1 ${columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-4'} gap-4 stagger-fade-in`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProgressCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton для челленджа
export function ChallengeSkeleton() {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

// Skeleton для списка челленджей
export function ChallengesListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 stagger-fade-in">
      {Array.from({ length: count }).map((_, i) => (
        <ChallengeSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton для лидерборда
export function LeaderboardItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card/40 border border-border/30 animate-fade-in">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-6 w-16 ml-auto" />
        <Skeleton className="h-3 w-12 ml-auto" />
      </div>
    </div>
  );
}

// Skeleton для списка лидерборда
export function LeaderboardListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-2 stagger-fade-in">
      {Array.from({ length: count }).map((_, i) => (
        <LeaderboardItemSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton для графика
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2" style={{ height }}>
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton для страницы (общий)
export function PageSkeleton() {
  return (
    <div className="min-h-screen p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="space-y-4 p-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </Card>
        ))}
      </div>
    </div>
  );
}

// Skeleton с пульсацией для важных элементов
export function PulsingSkeleton({ className }: { className?: string }) {
  return <Skeleton className={`animate-glow-pulse ${className}`} />;
}
