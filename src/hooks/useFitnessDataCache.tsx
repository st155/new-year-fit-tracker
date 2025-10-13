import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = 'fitness_metrics_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedMetrics {
  data: any[];
  timestamp: number;
  dateRange: { start: string; end: string };
}

export function useFitnessDataCache(userId: string | undefined) {
  const [cache, setCache] = useState<Map<string, CachedMetrics>>(new Map());
  const [loading, setLoading] = useState(false);

  // Load cache from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, CachedMetrics>;
        const newCache = new Map<string, CachedMetrics>();
        
        // Remove expired entries
        const now = Date.now();
        for (const [key, value] of Object.entries(parsed)) {
          if (now - value.timestamp < CACHE_DURATION) {
            newCache.set(key, value);
          }
        }
        
        setCache(newCache);
      }
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }, []);

  // Save cache to localStorage whenever it changes
  useEffect(() => {
    try {
      const cacheObj = Object.fromEntries(cache);
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }, [cache]);

  const getCacheKey = (startDate: Date, endDate: Date) => {
    return `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
  };

  const fetchMetrics = useCallback(async (startDate: Date, endDate: Date): Promise<any[]> => {
    if (!userId) return [];

    const cacheKey = getCacheKey(startDate, endDate);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    const hasSourceField = Array.isArray(cached?.data) && cached!.data.length > 0 && cached!.data.every((m: any) => 'source' in m);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION) && hasSourceField) {
      console.log('Using cached data for', cacheKey);
      return cached.data;
    }

    // Fetch from database
    console.log('Fetching fresh data for', cacheKey);
    const { data: metrics, error } = await supabase
      .from('user_metrics')
      .select(`
        id,
        metric_name,
        metric_category,
        unit,
        source,
        metric_values!inner (
          value,
          measurement_date
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('metric_values.measurement_date', startDate.toISOString().split('T')[0])
      .lte('metric_values.measurement_date', endDate.toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching metrics:', error);
      return [];
    }

    // Update cache
    const newCache = new Map(cache);
    newCache.set(cacheKey, {
      data: metrics || [],
      timestamp: Date.now(),
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    });
    setCache(newCache);

    return metrics || [];
  }, [userId, cache]);

  // Prefetch data for adjacent periods
  const prefetchAdjacent = useCallback(async (
    currentStart: Date, 
    currentEnd: Date,
    filter: 'today' | 'week' | 'month'
  ) => {
    const ranges: Array<[Date, Date]> = [];
    
    if (filter === 'today') {
      // Prefetch yesterday and tomorrow
      const yesterday = new Date(currentStart);
      yesterday.setDate(yesterday.getDate() - 1);
      ranges.push([
        new Date(yesterday.setHours(0, 0, 0, 0)),
        new Date(yesterday.setHours(23, 59, 59, 999))
      ]);
      
      const tomorrow = new Date(currentStart);
      tomorrow.setDate(tomorrow.getDate() + 1);
      ranges.push([
        new Date(tomorrow.setHours(0, 0, 0, 0)),
        new Date(tomorrow.setHours(23, 59, 59, 999))
      ]);
    } else if (filter === 'week') {
      // Prefetch previous and next week
      const prevWeekStart = new Date(currentStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      ranges.push([prevWeekStart, new Date(prevWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)]);
      
      const nextWeekStart = new Date(currentStart);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      ranges.push([nextWeekStart, new Date(nextWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)]);
    } else if (filter === 'month') {
      // Prefetch previous and next month
      const prevMonthStart = new Date(currentStart);
      prevMonthStart.setDate(prevMonthStart.getDate() - 30);
      ranges.push([prevMonthStart, new Date(prevMonthStart.getTime() + 30 * 24 * 60 * 60 * 1000)]);
      
      const nextMonthStart = new Date(currentStart);
      nextMonthStart.setDate(nextMonthStart.getDate() + 30);
      ranges.push([nextMonthStart, new Date(nextMonthStart.getTime() + 30 * 24 * 60 * 60 * 1000)]);
    }

    // Prefetch in background without waiting
    ranges.forEach(([start, end]) => {
      const cacheKey = getCacheKey(start, end);
      if (!cache.has(cacheKey)) {
        fetchMetrics(start, end).catch(console.error);
      }
    });
  }, [cache, fetchMetrics]);

  const getMetrics = useCallback(async (
    startDate: Date,
    endDate: Date,
    filter: 'today' | 'week' | 'month'
  ): Promise<any[]> => {
    setLoading(true);
    try {
      const metrics = await fetchMetrics(startDate, endDate);
      
      // Trigger prefetch for adjacent periods (non-blocking)
      prefetchAdjacent(startDate, endDate, filter);
      
      return metrics;
    } finally {
      setLoading(false);
    }
  }, [fetchMetrics, prefetchAdjacent]);

  return { getMetrics, loading, clearCache: () => setCache(new Map()) };
}
