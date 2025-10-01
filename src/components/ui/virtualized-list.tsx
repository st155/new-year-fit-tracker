import { ReactElement, useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number | string;
  renderItem: (item: T, index: number) => ReactElement;
  className?: string;
  bufferSize?: number;
  loading?: boolean;
  emptyState?: ReactElement;
}

/**
 * VirtualizedList - компонент для эффективного рендеринга длинных списков
 * Использует виртуализацию для рендеринга только видимых элементов
 * Улучшает производительность для списков с большим количеством элементов (>50)
 * 
 * @example
 * <VirtualizedList
 *   items={activities}
 *   itemHeight={120}
 *   height="80vh"
 *   renderItem={(activity, index) => (
 *     <ActivityCard activity={activity} index={index} />
 *   )}
 * />
 */
export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  className,
  bufferSize = 5,
  loading = false,
  emptyState,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-muted/20 rounded-lg"
            style={{ height: itemHeight }}
          />
        ))}
      </div>
    );
  }

  if (items.length === 0 && emptyState) {
    return emptyState;
  }

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const visibleHeight = containerHeight || 600;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + visibleHeight) / itemHeight) + bufferSize
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  const containerStyle = typeof height === 'string'
    ? { height }
    : { height: `${height}px` };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-y-auto", className)}
      style={containerStyle}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            willChange: 'transform',
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
              className="px-2"
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SimpleVirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactElement;
  className?: string;
  threshold?: number;
}

/**
 * SimpleVirtualList - простая виртуализация с Intersection Observer
 * Подходит для случаев, когда размеры элементов различаются
 */
export function SimpleVirtualList<T>({
  items,
  renderItem,
  className,
  threshold = 50,
}: SimpleVirtualListProps<T>) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: threshold });
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && visibleRange.end < items.length) {
            setVisibleRange((prev) => ({
              ...prev,
              end: Math.min(prev.end + threshold, items.length),
            }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [items.length, threshold, visibleRange.end]);

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);

  return (
    <div className={cn("space-y-4", className)}>
      {visibleItems.map((item, index) => (
        <div key={visibleRange.start + index}>
          {renderItem(item, visibleRange.start + index)}
        </div>
      ))}
      {visibleRange.end < items.length && (
        <div
          ref={sentinelRef}
          className="h-4 flex items-center justify-center"
        >
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
