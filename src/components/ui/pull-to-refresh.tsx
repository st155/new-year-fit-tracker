import { ReactNode, useRef, useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
  threshold?: number;
  resistance?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  resistance = 2.5,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(false);
  
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAtTop = () => {
    const container = containerRef.current;
    if (!container) return false;
    
    // Check if we're at the very top of the scrollable container (with small tolerance)
    const scrollTop = container.scrollTop;
    const windowScrollY = window.scrollY;
    
    // Must be within 5px of the top to enable pull-to-refresh
    return scrollTop <= 5 && windowScrollY <= 5;
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Only enable pull-to-refresh if we're at the very top
    if (isAtTop()) {
      touchStartY.current = e.touches[0].clientY;
      setCanPull(true);
    } else {
      setCanPull(false);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!canPull || disabled || isRefreshing) return;
    
    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartY.current;
    
    // Only allow pulling down when at top
    if (distance > 0 && isAtTop()) {
      // Apply resistance for a natural feel
      const pullAmount = distance / resistance;
      setPullDistance(Math.min(pullAmount, threshold * 1.5));
      
      // Prevent default scroll behavior only when actually pulling with significant distance
      if (distance > 20) {
        e.preventDefault();
      }
    } else {
      // If user scrolls up or we're not at top, disable pull
      setCanPull(false);
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!canPull || disabled) return;
    
    setCanPull(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canPull, pullDistance, isRefreshing, disabled]);

  const rotation = (pullDistance / threshold) * 360;
  const opacity = Math.min(pullDistance / threshold, 1);
  const scale = Math.min(0.5 + (pullDistance / threshold) * 0.5, 1);

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      {/* Pull indicator */}
      <div
        className="absolute left-1/2 z-50 flex items-center justify-center transition-opacity"
        style={{
          top: `${Math.max(pullDistance - 40, 0)}px`,
          transform: 'translateX(-50%)',
          opacity,
        }}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full bg-background/95 shadow-lg backdrop-blur-sm",
            "border border-border"
          )}
          style={{
            transform: `scale(${scale})`,
          }}
        >
          <RefreshCw
            className={cn(
              "h-5 w-5 text-primary transition-transform",
              isRefreshing && "animate-spin"
            )}
            style={{
              transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: canPull ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
