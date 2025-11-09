import { useState, useEffect } from 'react';

interface ProgressiveLoadConfig {
  criticalDelay?: number;
  highDelay?: number;
  lowDelay?: number;
}

export type LoadPriority = 'critical' | 'high' | 'low';

/**
 * Progressive loading hook - loads content in stages based on priority
 * 
 * Usage:
 * ```tsx
 * const { shouldLoad } = useProgressiveLoad();
 * 
 * {shouldLoad('critical') && <CriticalComponent />}
 * {shouldLoad('high') && <HighPriorityComponent />}
 * {shouldLoad('low') && <LowPriorityComponent />}
 * ```
 */
export function useProgressiveLoad(config: ProgressiveLoadConfig = {}) {
  const {
    criticalDelay = 0,
    highDelay = 100,
    lowDelay = 300,
  } = config;

  const [loadedStages, setLoadedStages] = useState<Set<LoadPriority>>(new Set(['critical']));

  useEffect(() => {
    // Load critical immediately
    setLoadedStages(new Set(['critical']));

    // Load high priority after delay
    const highTimer = setTimeout(() => {
      setLoadedStages(prev => new Set([...prev, 'high']));
    }, highDelay);

    // Load low priority after delay
    const lowTimer = setTimeout(() => {
      setLoadedStages(prev => new Set([...prev, 'low']));
    }, lowDelay);

    return () => {
      clearTimeout(highTimer);
      clearTimeout(lowTimer);
    };
  }, [criticalDelay, highDelay, lowDelay]);

  const shouldLoad = (priority: LoadPriority): boolean => {
    return loadedStages.has(priority);
  };

  return {
    shouldLoad,
    isLoading: loadedStages.size < 3,
    loadedStages,
  };
}
