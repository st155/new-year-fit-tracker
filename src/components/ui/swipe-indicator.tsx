import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeIndicatorProps {
  progress: number;
  direction: 'left' | 'right' | null;
  currentIndex: number;
  totalPages: number;
}

export function SwipeIndicator({ 
  progress, 
  direction, 
  currentIndex,
  totalPages 
}: SwipeIndicatorProps) {
  if (!direction || progress < 10) return null;

  const canSwipeLeft = currentIndex < totalPages - 1;
  const canSwipeRight = currentIndex > 0;

  if (direction === 'left' && !canSwipeLeft) return null;
  if (direction === 'right' && !canSwipeRight) return null;

  const opacity = Math.min(1, progress / 50);

  return (
    <>
      {/* Left edge indicator */}
      {direction === 'right' && canSwipeRight && (
        <div 
          className="fixed left-0 top-1/2 -translate-y-1/2 pointer-events-none z-50 transition-opacity"
          style={{ opacity }}
        >
          <div className="bg-primary/20 backdrop-blur-sm rounded-r-full p-4 shadow-lg">
            <ChevronLeft className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>
      )}

      {/* Right edge indicator */}
      {direction === 'left' && canSwipeLeft && (
        <div 
          className="fixed right-0 top-1/2 -translate-y-1/2 pointer-events-none z-50 transition-opacity"
          style={{ opacity }}
        >
          <div className="bg-primary/20 backdrop-blur-sm rounded-l-full p-4 shadow-lg">
            <ChevronRight className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 pointer-events-none z-50">
        <div className="flex gap-1.5">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                idx === currentIndex
                  ? "w-8 bg-primary"
                  : "w-1.5 bg-primary/30"
              )}
            />
          ))}
        </div>
      </div>
    </>
  );
}
