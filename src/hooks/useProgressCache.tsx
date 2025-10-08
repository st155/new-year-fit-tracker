import { useState, useEffect, useCallback } from 'react';

const CACHE_KEY = 'progress_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 минут

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export function useProgressCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  const fullKey = `${CACHE_KEY}_${key}`;

  // Загрузка из кэша
  const loadFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(fullKey);
      if (cached) {
        const parsed: CachedData<T> = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;
        
        // Показываем кэш если он не слишком старый (по умолчанию 5 минут)
        if (age < CACHE_EXPIRY) {
          setData(parsed.data);
          setFromCache(true);
          return true;
        }
      }
    } catch (error) {
      console.error('Cache load error:', error);
    }
    return false;
  }, [fullKey]);

  // Сохранение в кэш
  const saveToCache = useCallback((newData: T) => {
    try {
      const cached: CachedData<T> = {
        data: newData,
        timestamp: Date.now()
      };
      localStorage.setItem(fullKey, JSON.stringify(cached));
    } catch (error) {
      console.error('Cache save error:', error);
    }
  }, [fullKey]);

  // Загрузка свежих данных
  const fetchFresh = useCallback(async () => {
    setLoading(true);
    try {
      const freshData = await fetchFn();
      setData(freshData);
      saveToCache(freshData);
      setFromCache(false);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, saveToCache]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // 1. Сначала показываем кэш (мгновенно)
      const hasCache = loadFromCache();
      
      if (hasCache) {
        setLoading(false);
        // 2. В фоне обновляем данные
        if (isMounted) {
          await fetchFresh();
        }
      } else {
        // Нет кэша - загружаем с сервера
        if (isMounted) {
          await fetchFresh();
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading, fromCache, refetch: fetchFresh };
}
