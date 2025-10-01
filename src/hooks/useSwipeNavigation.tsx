import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface UseSwipeNavigationOptions {
  routes: string[];
  threshold?: number;
  enabled?: boolean;
}

export function useSwipeNavigation({
  routes,
  threshold = 50,
  enabled = true,
}: UseSwipeNavigationOptions) {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
      const currentIndex = routes.indexOf(location.pathname);
      if (currentIndex === -1) return;

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
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [routes, threshold, enabled, location.pathname, navigate]);
}
