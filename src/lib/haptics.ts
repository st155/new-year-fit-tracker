/**
 * Haptic feedback utility for touch interactions
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 50,
  heavy: 100,
  success: [50, 50, 50],
  warning: [100, 50, 100],
  error: [200, 100, 200]
};

/**
 * Trigger haptic feedback if supported by the device
 */
export const vibrate = (pattern: HapticPattern | number | number[] = 'medium') => {
  if (!('vibrate' in navigator)) return;
  
  try {
    if (typeof pattern === 'string') {
      navigator.vibrate(patterns[pattern]);
    } else {
      navigator.vibrate(pattern);
    }
  } catch (error) {
    console.warn('Haptic feedback not supported:', error);
  }
};

/**
 * Haptic feedback for specific interactions
 */
export const haptics = {
  tap: () => vibrate('light'),
  success: () => vibrate('success'),
  warning: () => vibrate('warning'),
  error: () => vibrate('error'),
  complete: () => vibrate('success'),
  swipe: () => vibrate('light'),
};
