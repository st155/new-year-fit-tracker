import { useState, useCallback, useEffect } from 'react';
import { CardState, calculateCardState } from '@/lib/habit-utils-v3';

export interface HabitCardStateReturn {
  state: CardState;
  expanded: boolean;
  showCelebration: boolean;
  isAnimating: boolean;
  toggle: () => void;
  celebrate: () => void;
  setAnimating: (value: boolean) => void;
}

/**
 * Manages state and interactions for HabitCardV3
 */
export function useHabitCardState(habit: any): HabitCardStateReturn {
  const [state, setState] = useState<CardState>('not_started');
  const [expanded, setExpanded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Update state when habit changes
  useEffect(() => {
    setState(calculateCardState(habit));
  }, [habit]);

  const toggle = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  const celebrate = useCallback(() => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  }, []);

  const setAnimating = useCallback((value: boolean) => {
    setIsAnimating(value);
  }, []);

  return {
    state,
    expanded,
    showCelebration,
    isAnimating,
    toggle,
    celebrate,
    setAnimating
  };
}
