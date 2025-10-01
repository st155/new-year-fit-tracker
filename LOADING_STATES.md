# Loading States и Skeleton Screens

Этот документ описывает систему состояний загрузки и skeleton screens в проекте.

## Философия

Skeleton screens улучшают восприятие времени загрузки и предоставляют визуальную обратную связь пользователям. Вместо пустого экрана или спиннера, пользователи видят примерную структуру контента, который загружается.

## Универсальные Skeleton Компоненты

### ActivityCardSkeleton & ActivityListSkeleton

Для карточек активности в ленте:

```tsx
import { ActivityCardSkeleton, ActivityListSkeleton } from "@/components/ui/universal-skeleton";

// Одна карточка
<ActivityCardSkeleton />

// Список карточек
<ActivityListSkeleton count={8} />
```

**Где используется:**
- `src/pages/Feed.tsx` - лента активностей

### ProgressCardSkeleton & ProgressGridSkeleton

Для метрик прогресса:

```tsx
import { ProgressCardSkeleton, ProgressGridSkeleton } from "@/components/ui/universal-skeleton";

// Одна карточка метрики
<ProgressCardSkeleton />

// Грид метрик
<ProgressGridSkeleton columns={2} count={6} />
<ProgressGridSkeleton columns={3} count={9} />
```

**Где используется:**
- `src/pages/Progress.tsx` - страница прогресса
- `src/pages/Dashboard.tsx` - дашборд

### ChallengeSkeleton & ChallengesListSkeleton

Для челленджей:

```tsx
import { ChallengeSkeleton, ChallengesListSkeleton } from "@/components/ui/universal-skeleton";

// Один челлендж
<ChallengeSkeleton />

// Список челленджей
<ChallengesListSkeleton count={4} />
```

**Где используется:**
- `src/pages/Challenges.tsx` - список челленджей

### LeaderboardItemSkeleton & LeaderboardListSkeleton

Для лидерборда:

```tsx
import { LeaderboardItemSkeleton, LeaderboardListSkeleton } from "@/components/ui/universal-skeleton";

// Один элемент лидерборда
<LeaderboardItemSkeleton />

// Список лидерборда
<LeaderboardListSkeleton count={10} />
```

**Где используется:**
- `src/pages/Leaderboard.tsx` - таблица лидеров

### ChartSkeleton

Для графиков и диаграмм:

```tsx
import { ChartSkeleton } from "@/components/ui/universal-skeleton";

<ChartSkeleton height={300} />
<ChartSkeleton height={400} />
```

**Где используется:**
- Страницы с аналитикой и графиками

### PageSkeleton

Универсальный skeleton для целой страницы:

```tsx
import { PageSkeleton } from "@/components/ui/universal-skeleton";

<PageSkeleton />
```

**Использование:**
- Для быстрого прототипирования
- Для страниц без специфичного layout

### PulsingSkeleton

Skeleton с анимацией пульсации для важных элементов:

```tsx
import { PulsingSkeleton } from "@/components/ui/universal-skeleton";

<PulsingSkeleton className="h-8 w-32" />
```

**Использование:**
- Важные метрики
- Ключевые показатели
- Элементы, требующие внимания

## Базовый Skeleton компонент

Все skeleton компоненты используют базовый `Skeleton` из shadcn:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

<Skeleton className="h-4 w-32" />
<Skeleton className="h-10 w-full rounded-lg" />
```

## Анимации

Все skeleton компоненты используют CSS анимации из дизайн-системы:

### Stagger Animation

Для списков используется `stagger-fade-in` класс для постепенного появления элементов:

```tsx
<div className="space-y-4 stagger-fade-in">
  {items.map((item, i) => <Item key={i} />)}
</div>
```

### Fade In

Для одиночных элементов:

```tsx
<div className="animate-fade-in">
  <Skeleton />
</div>
```

### Glow Pulse

Для важных элементов с пульсацией:

```tsx
<Skeleton className="animate-glow-pulse" />
```

## Интеграция с кешированием

Skeleton screens показываются только при первой загрузке (когда нет кеша):

```tsx
const { data, loading, fromCache } = useProgressCache(
  'cache-key',
  fetchFunction,
  dependencies
);

if (loading && !fromCache) {
  return <ActivityListSkeleton count={8} />;
}
```

**Логика:**
- `loading && !fromCache` - первая загрузка, показываем skeleton
- `loading && fromCache` - есть кеш, показываем старые данные с индикатором обновления
- `!loading` - данные загружены, показываем контент

## Best Practices

### 1. Соответствие структуре

Skeleton должен максимально соответствовать финальному контенту:

```tsx
// ✅ Правильно - skeleton повторяет структуру карточки
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-40" /> {/* Заголовок */}
    <Skeleton className="h-4 w-full" /> {/* Описание */}
  </CardHeader>
  <CardContent>
    <Skeleton className="h-32 w-full" /> {/* Контент */}
  </CardContent>
</Card>

// ❌ Неправильно - просто прямоугольник
<Skeleton className="h-48 w-full" />
```

### 2. Используйте правильные размеры

```tsx
// Аватары - круглые
<Skeleton className="h-10 w-10 rounded-full" />

// Кнопки - с правильным border-radius
<Skeleton className="h-10 w-32 rounded-lg" />

// Текст - разные ширины для естественности
<Skeleton className="h-4 w-32" />
<Skeleton className="h-4 w-full" />
<Skeleton className="h-4 w-3/4" />
```

### 3. Количество элементов

Показывайте реалистичное количество skeleton элементов:

```tsx
// ✅ Правильно - показываем видимое количество
<ActivityListSkeleton count={8} /> // ~1 экран на мобильном

// ❌ Неправильно - слишком много
<ActivityListSkeleton count={50} />

// ❌ Неправильно - слишком мало
<ActivityListSkeleton count={2} />
```

### 4. Адаптивность

Учитывайте разные экраны:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {Array.from({ length: isMobile ? 4 : 6 }).map((_, i) => (
    <ProgressCardSkeleton key={i} />
  ))}
</div>
```

### 5. Progressive Enhancement

Комбинируйте с другими техниками оптимизации:

```tsx
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { ActivityListSkeleton } from "@/components/ui/universal-skeleton";

function Feed() {
  const { data, loading, fromCache, refetch } = useProgressCache(...);

  if (loading && !fromCache) {
    return <ActivityListSkeleton count={8} />;
  }

  return (
    <PullToRefresh onRefresh={refetch}>
      {data.map(activity => <ActivityCard key={activity.id} {...activity} />)}
    </PullToRefresh>
  );
}
```

## Создание нового Skeleton компонента

При создании нового skeleton:

1. **Изучите финальный компонент** - понимайте его структуру
2. **Создайте skeleton в `universal-skeleton.tsx`**
3. **Используйте semantic HTML** - Card, CardHeader, CardContent
4. **Добавьте анимации** - animate-fade-in, stagger-fade-in
5. **Сделайте конфигурируемым** - count, height, columns props
6. **Документируйте** - добавьте пример использования

### Пример создания нового skeleton:

```tsx
// В universal-skeleton.tsx
export function NewFeatureSkeleton() {
  return (
    <Card className="animate-fade-in">
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export function NewFeatureListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4 stagger-fade-in">
      {Array.from({ length: count }).map((_, i) => (
        <NewFeatureSkeleton key={i} />
      ))}
    </div>
  );
}
```

## Интегрированные страницы

✅ **Feed** - ActivityListSkeleton
✅ **Challenges** - ChallengesListSkeleton  
✅ **Leaderboard** - LeaderboardListSkeleton
✅ **Dashboard** - DashboardSkeleton (специальный)
✅ **Progress** - готов к интеграции ProgressGridSkeleton

## Связанные компоненты

- `src/components/ui/skeleton.tsx` - базовый Skeleton
- `src/components/ui/universal-skeleton.tsx` - все skeleton компоненты
- `src/components/ui/dashboard-skeleton.tsx` - специальный для дашборда
- `src/components/ui/loading-states.tsx` - дополнительные loading states
- `src/components/ui/page-loader.tsx` - для lazy-loaded страниц

## Связанные техники

- **Lazy Loading** - `PERFORMANCE_OPTIMIZATION.md`
- **Pull to Refresh** - `MOBILE_OPTIMIZATION.md`
- **Caching** - `useProgressCache` hook
- **List Virtualization** - `LIST_VIRTUALIZATION.md`
