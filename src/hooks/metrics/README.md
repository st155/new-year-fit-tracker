# Metrics Hooks Architecture

## Core Hooks (USE THESE)

### `useMetrics` - Композитный хук
**Файл:** `src/hooks/composite/data/useMetrics.ts`

Главный хук для работы с метриками. Предоставляет:
- Latest values (последние значения)
- Historical data (исторические данные)
- Quality scoring (оценка качества)
- Conflict detection (обнаружение конфликтов)

```typescript
const { 
  latestMetrics, 
  historicalData, 
  getMetric,
  addMetric 
} = useMetrics(userId, {
  metricTypes: ['weight', 'heart_rate'],
  dateRange: { start, end }
});
```

### `useLatestMetrics` - Последние значения
**Файл:** `src/hooks/metrics/useLatestMetrics.tsx`

Получает только последние значения метрик с V2 (confidence scoring).

```typescript
const { metrics, qualityMap, loading } = useLatestMetrics(userId);
```

### `useMetricHistory` - История метрик
**Файл:** `src/hooks/composite/data/useMetrics.ts`

Получает историю конкретной метрики за период.

```typescript
const { data, loading } = useMetricHistory(userId, {
  metricName: 'weight',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});
```

---

## Widget-Specific Hooks (Для dashboard)

### `useSmartWidgetsData` - Single-mode виджеты
**Файл:** `src/hooks/metrics/useSmartWidgetsData.ts`

Для виджетов, показывающих данные из одного источника.

```typescript
const { data, loading } = useSmartWidgetsData(userId, 'heart_rate');
```

### `useMultiSourceWidgetsData` - Multi-mode виджеты
**Файл:** `src/hooks/metrics/useMultiSourceWidgetsData.ts`

Для виджетов со сравнением данных из разных источников.

```typescript
const { data, loading } = useMultiSourceWidgetsData(userId, 'steps');
```

### `useWidgetHistory` - Sparkline графики
**Файл:** `src/hooks/metrics/useWidgetHistory.ts`

Для миниатюрных графиков в виджетах (sparklines).

```typescript
const { data, loading } = useWidgetHistory(userId, 'heart_rate', 7);
```

---

## Specialized Hooks

### `useTodayMetrics` - Метрики за сегодня
**Файл:** `src/hooks/metrics/useTodayMetrics.ts`

Специализированный хук для отображения метрик текущего дня.

```typescript
const { metrics, loading } = useTodayMetrics(userId);
```

### `useMetricsRealtime` - Real-time подписка
**Файл:** `src/hooks/metrics/useMetricsRealtime.ts`

Подписка на изменения метрик в реальном времени через Supabase Realtime.

```typescript
useMetricsRealtime(userId, (newMetric) => {
  console.log('New metric:', newMetric);
});
```

### `useChallengeHistory` - История челленджей
**Файл:** `src/hooks/metrics/useChallengeHistory.ts`

Получает статистику по челленджам пользователя.

```typescript
const { stats, loading } = useChallengeHistory(userId);
```

---

## Workout-Specific Hooks

### `useDailyWorkout` - Тренировка на сегодня
**Файл:** `src/hooks/useDailyWorkout.ts`

Получает AI-скорректированную тренировку на день.

```typescript
const { data, isLoading } = useDailyWorkout(userId, date);
```

### `useWorkoutHistory` - История тренировок
**Файл:** `src/hooks/useWorkoutHistory.ts`

Получает историю тренировок с фильтрацией по источнику.

```typescript
const { workouts, isLoading } = useWorkoutHistory('all' | 'manual' | 'tracker');
```

---

## Low-Level Hooks (Использовать редко)

### `useUnifiedMetricsQuery`
**Файл:** `src/hooks/metrics/useUnifiedMetricsQuery.tsx`

Низкоуровневый хук для прямых запросов к unified_metrics.
**Рекомендация:** Использовать `useMetrics` или `useLatestMetrics` вместо него.

### `useLatestMetric` - Одна конкретная метрика
**Файл:** `src/hooks/metrics/useLatestMetric.ts`

Получает последнее значение одной метрики.

---

## Best Practices

1. **Для dashboard виджетов:** Используйте `useSmartWidgetsData` или `useMultiSourceWidgetsData`
2. **Для аналитики:** Используйте `useMetrics` с dateRange
3. **Для real-time:** Используйте `useMetricsRealtime`
4. **Для простых случаев:** Используйте `useLatestMetrics`
5. **Избегайте:** Прямого использования `useUnifiedMetricsQuery`

## Migration Notes

- V1 хуки (без confidence scoring) устарели
- Все новые компоненты должны использовать V2 (`useV2: true`)
- Quality scoring доступен через `qualityMap` в `useLatestMetrics`
