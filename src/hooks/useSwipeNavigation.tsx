import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface UseSwipeNavigationOptions {
  routes: string[];
  threshold?: number;
  enabled?: boolean;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
}

export function useSwipeNavigation({
  routes,
  threshold = 80,
  enabled = true,
  onSwipeStart,
  onSwipeEnd,
}: UseSwipeNavigationOptions) {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Ignore if target is an interactive element
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('[role="button"]')
      ) {
        return;
      }

      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = false;
      onSwipeStart?.();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartX.current) return;

      touchEndX.current = e.touches[0].clientX;
      const touchEndY = e.touches[0].clientY;
      
      const diffX = touchStartX.current - touchEndX.current;
      const diffY = Math.abs(touchStartY.current - touchEndY);

      // Only consider horizontal swipes
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        isSwiping.current = true;
        
        // Calculate progress (0 to 100)
        const progress = Math.min(100, (Math.abs(diffX) / threshold) * 100);
        setSwipeProgress(progress);
        setSwipeDirection(diffX > 0 ? 'left' : 'right');

        // Prevent default scrolling when swiping
        if (Math.abs(diffX) > 20) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isSwiping.current) {
        setSwipeProgress(0);
        setSwipeDirection(null);
        return;
      }

      const currentIndex = routes.indexOf(location.pathname);
      if (currentIndex === -1) {
        setSwipeProgress(0);
        setSwipeDirection(null);
        return;
      }

      const diff = touchStartX.current - touchEndX.current;

      // Swipe left - next route
      if (diff > threshold) {
        const nextIndex = currentIndex + 1;
        if (nextIndex < routes.length) {
          navigate(routes[nextIndex]);
        }
      }

      // Swipe right - previous route
      if (diff < -threshold) {
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
          navigate(routes[prevIndex]);
        }
      }

      // Reset
      setSwipeProgress(0);
      setSwipeDirection(null);
      isSwiping.current = false;
      touchStartX.current = 0;
      touchEndX.current = 0;
      onSwipeEnd?.();
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [routes, threshold, enabled, location.pathname, navigate, onSwipeStart, onSwipeEnd]);

  return { swipeProgress, swipeDirection };
}
