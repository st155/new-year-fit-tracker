import { useState, useEffect } from 'react';

export function useAnimatedCounter(
  targetValue: number,
  duration = 1000,
  enabled = true
) {
  const [displayValue, setDisplayValue] = useState(enabled ? 0 : targetValue);

  useEffect(() => {
    if (!enabled) {
      setDisplayValue(targetValue);
      return;
    }

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setDisplayValue(Math.floor(targetValue * easeOut));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [targetValue, duration, enabled]);

  return displayValue;
}
