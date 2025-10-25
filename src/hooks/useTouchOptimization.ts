import { useEffect, useRef, useCallback } from 'react';

/**
 * MOBILE: Touch event optimization hook
 * 
 * Optimizes touch interactions for better mobile performance:
 * - Prevents 300ms click delay
 * - Handles touch gestures efficiently
 * - Debounces rapid touch events
 * 
 * Usage:
 * ```tsx
 * const { handleTouchStart, handleTouchEnd, handleTouchMove } = useTouchOptimization({
 *   onTap: () => console.log('Tap'),
 *   onSwipe: (direction) => console.log('Swipe', direction),
 * });
 * 
 * <div 
 *   onTouchStart={handleTouchStart}
 *   onTouchMove={handleTouchMove}
 *   onTouchEnd={handleTouchEnd}
 * >
 *   Content
 * </div>
 * ```
 */

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

interface UseTouchOptimizationOptions {
  onTap?: () => void;
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void;
  onLongPress?: () => void;
  swipeThreshold?: number; // pixels
  longPressDelay?: number; // ms
  tapMaxDuration?: number; // ms
}

export function useTouchOptimization({
  onTap,
  onSwipe,
  onLongPress,
  swipeThreshold = 50,
  longPressDelay = 500,
  tapMaxDuration = 300,
}: UseTouchOptimizationOptions = {}) {
  const touchStart = useRef<TouchPoint | null>(null);
  const touchEnd = useRef<TouchPoint | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchEnd.current = null;
    isLongPress.current = false;

    // Start long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        onLongPress();
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel long press on move
    clearLongPressTimer();
    
    const touch = e.touches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, [clearLongPressTimer]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    clearLongPressTimer();

    if (!touchStart.current) return;

    const start = touchStart.current;
    const end = touchEnd.current;

    // Long press was triggered, don't process other gestures
    if (isLongPress.current) {
      touchStart.current = null;
      touchEnd.current = null;
      return;
    }

    // Calculate touch duration
    const duration = Date.now() - start.time;

    // If no movement (tap)
    if (!end) {
      if (duration <= tapMaxDuration && onTap) {
        onTap();
      }
      touchStart.current = null;
      return;
    }

    // Calculate swipe distance
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if it's a swipe
    if (Math.max(absDeltaX, absDeltaY) >= swipeThreshold) {
      if (onSwipe) {
        // Horizontal swipe
        if (absDeltaX > absDeltaY) {
          onSwipe(deltaX > 0 ? 'right' : 'left');
        } 
        // Vertical swipe
        else {
          onSwipe(deltaY > 0 ? 'down' : 'up');
        }
      }
    } else {
      // Small movement, treat as tap
      if (duration <= tapMaxDuration && onTap) {
        onTap();
      }
    }

    touchStart.current = null;
    touchEnd.current = null;
  }, [onTap, onSwipe, swipeThreshold, tapMaxDuration, clearLongPressTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}

/**
 * Hook for optimized scroll handling on mobile
 */
export function useOptimizedScroll(
  callback: (scrollY: number) => void,
  throttleMs: number = 100
) {
  const lastScrollTime = useRef(0);
  const rafId = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    const now = Date.now();
    
    // Throttle scroll events
    if (now - lastScrollTime.current < throttleMs) {
      return;
    }

    lastScrollTime.current = now;

    // Use RAF for smooth updates
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      callback(window.scrollY);
    });
  }, [callback, throttleMs]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleScroll]);
}

/**
 * Prevents overscroll/bounce effect on iOS
 */
export function usePreventOverscroll(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const preventOverscroll = (e: TouchEvent) => {
      // Allow scrolling within scrollable elements
      let target = e.target as HTMLElement;
      while (target && target !== document.body) {
        const overflowY = window.getComputedStyle(target).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          return; // Allow scroll within scrollable container
        }
        target = target.parentElement as HTMLElement;
      }
      
      // Prevent document scroll
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventOverscroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventOverscroll);
    };
  }, [enabled]);
}