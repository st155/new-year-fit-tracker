import { ReactNode } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Loader2, RefreshCw, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  className,
}: PullToRefreshProps) {
  const { pullDistance, isRefreshing, isReady } = usePullToRefresh({
    onRefresh,
    threshold,
  });

  const getIndicatorRotation = () => {
    if (isRefreshing) return 0;
    return Math.min((pullDistance / threshold) * 180, 180);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 pointer-events-none z-50"
        style={{
          height: `${Math.min(pullDistance, threshold + 20)}px`,
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-full transition-all duration-300',
            'bg-background/90 backdrop-blur-sm border-2 shadow-lg',
            isReady ? 'border-primary shadow-glow' : 'border-border',
            'w-12 h-12'
          )}
          style={{
            transform: `scale(${Math.min(pullDistance / threshold, 1)})`,
          }}
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : isReady ? (
            <RefreshCw className="h-5 w-5 text-primary" />
          ) : (
            <ArrowDown
              className="h-5 w-5 text-muted-foreground transition-transform duration-200"
              style={{
                transform: `rotate(${getIndicatorRotation()}deg)`,
              }}
            />
          )}
        </div>

        {/* Pull text */}
        <div
          className={cn(
            'absolute top-16 text-xs font-medium transition-all duration-200',
            isReady ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {isRefreshing
            ? 'Обновление...'
            : isReady
            ? 'Отпустите для обновления'
            : 'Потяните для обновления'}
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: isRefreshing
            ? `translateY(${threshold}px)`
            : `translateY(${Math.min(pullDistance, threshold)}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
