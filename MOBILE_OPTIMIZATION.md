# Мобильная оптимизация

Этот документ описывает все возможности мобильной оптимизации в проекте.

## Pull-to-Refresh (Потянуть для обновления)

### Использование компонента PullToRefresh

```tsx
import { PullToRefresh } from '@/components/ui/pull-to-refresh';

function MyComponent() {
  const handleRefresh = async () => {
    // Логика обновления данных
    await fetchData();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        {/* Ваш контент */}
      </div>
    </PullToRefresh>
  );
}
```

### Параметры

- `onRefresh` - функция обновления (обязательно)
- `threshold` - минимальная дистанция для срабатывания (по умолчанию 80px)
- `className` - дополнительные CSS классы

### Использование хука usePullToRefresh

Если нужна кастомная реализация:

```tsx
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

function MyComponent() {
  const { pullDistance, isRefreshing, isReady } = usePullToRefresh({
    onRefresh: async () => {
      await fetchData();
    },
    threshold: 80,
    resistance: 2.5,
  });

  return (
    <div>
      {isRefreshing && <Spinner />}
      {/* Контент */}
    </div>
  );
}
```

## Swipe Navigation (Навигация свайпом)

### Базовое использование

```tsx
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';

function MyPage() {
  // Настраиваем навигацию между страницами
  useSwipeNavigation({
    routes: ['/dashboard', '/progress', '/challenges', '/feed'],
    enabled: true, // Включить/выключить свайп
    threshold: 50, // Минимальная дистанция свайпа
  });

  return <div>{/* Контент */}</div>;
}
```

### Как это работает

- **Свайп влево** → следующая страница в массиве routes
- **Свайп вправо** → предыдущая страница в массиве routes
- Работает только на touch устройствах
- Можно включать/выключать через `enabled`

### Примеры

#### Навигация между разделами дашборда

```tsx
useSwipeNavigation({
  routes: ['/dashboard', '/progress', '/fitness-data'],
  enabled: true,
});
```

#### Навигация в деталях метрики

```tsx
useSwipeNavigation({
  routes: [
    '/metric/weight',
    '/metric/body-fat',
    '/metric/vo2max',
  ],
  enabled: true,
  threshold: 75, // Более жесткий порог
});
```

## Bottom Sheet (Нижняя панель)

### Базовое использование

```tsx
import { BottomSheet, useBottomSheet } from '@/components/ui/bottom-sheet';

function MyComponent() {
  const { open, openSheet, closeSheet } = useBottomSheet();

  return (
    <>
      <button onClick={openSheet}>Открыть панель</button>

      <BottomSheet
        open={open}
        onOpenChange={closeSheet}
        title="Настройки"
      >
        <div className="space-y-4">
          {/* Контент панели */}
        </div>
      </BottomSheet>
    </>
  );
}
```

### Параметры Bottom Sheet

```tsx
<BottomSheet
  open={open}
  onOpenChange={setOpen}
  title="Заголовок"
  snapPoints={[50, 90]} // Высоты в процентах
  defaultSnapPoint={0} // Начальная высота (индекс в snapPoints)
  className="custom-class"
>
  {/* Контент */}
</BottomSheet>
```

### Особенности

- **Snap points** - Панель прилипает к определенным высотам (например, 50% и 90%)
- **Drag handle** - Ручка для перетаскивания вверх/вниз
- **Свайп вниз** - Закрывает панель
- **Backdrop** - Затемнение фона при открытии
- **Portal** - Рендерится вне DOM дерева компонента

### Примеры использования

#### Фильтры

```tsx
<BottomSheet
  open={filtersOpen}
  onOpenChange={setFiltersOpen}
  title="Фильтры"
  snapPoints={[60, 95]}
>
  <div className="space-y-4">
    <FilterSection />
    <Button onClick={applyFilters}>Применить</Button>
  </div>
</BottomSheet>
```

#### Детали метрики

```tsx
<BottomSheet
  open={detailsOpen}
  onOpenChange={setDetailsOpen}
  title="Статистика"
  snapPoints={[40, 70, 95]}
  defaultSnapPoint={1}
>
  <MetricChart data={data} />
  <MetricStats stats={stats} />
</BottomSheet>
```

#### Форма быстрого ввода

```tsx
<BottomSheet
  open={quickAddOpen}
  onOpenChange={setQuickAddOpen}
  title="Добавить измерение"
  snapPoints={[50]}
>
  <QuickMeasurementForm onSubmit={handleSubmit} />
</BottomSheet>
```

## Responsive Design

### Viewport настройки

В `index.html` уже настроен правильный viewport:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

### Touch-friendly элементы

Все интерактивные элементы имеют минимальный размер 44x44px для удобного нажатия:

```tsx
// ✅ Правильно
<button className="h-12 w-12">
  <Icon />
</button>

// ❌ Неправильно
<button className="h-6 w-6">
  <Icon />
</button>
```

### Адаптивные breakpoints

```tsx
// Mobile first подход
<div className="px-4 md:px-6 lg:px-8">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Контент */}
  </div>
</div>
```

## Best Practices

### 1. Pull-to-Refresh

- ✅ Используйте для страниц с динамическим контентом
- ✅ Показывайте состояние загрузки
- ❌ Не используйте на страницах с формами

### 2. Swipe Navigation

- ✅ Используйте для связанных страниц (вкладки, слайдер)
- ✅ Покажите пользователю, что есть свайп (hint анимация)
- ❌ Не используйте если есть горизонтальная прокрутка

### 3. Bottom Sheet

- ✅ Используйте для быстрых действий и деталей
- ✅ Держите контент кратким и сфокусированным
- ❌ Не используйте для сложных многостраничных форм

### 4. Performance

```tsx
// ✅ Debounce touch events
import { debounce } from 'lodash';

const handleTouch = debounce((e) => {
  // обработка
}, 100);

// ✅ Используйте CSS transforms вместо position
transform: translateX(${distance}px); // быстрее
left: ${distance}px; // медленнее
```

### 5. Тестирование

- Тестируйте на реальных устройствах
- Проверяйте разные размеры экранов
- Тестируйте в Chrome DevTools (Device Mode)

## Примеры интеграции

### Страница с pull-to-refresh и swipe

```tsx
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';

function DashboardPage() {
  useSwipeNavigation({
    routes: ['/dashboard', '/progress', '/challenges'],
    enabled: true,
  });

  const handleRefresh = async () => {
    await Promise.all([
      fetchMetrics(),
      fetchGoals(),
      fetchActivities(),
    ]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        {/* Dashboard content */}
      </div>
    </PullToRefresh>
  );
}
```

### Modal с bottom sheet на мобильных

```tsx
import { useMediaQuery } from '@/hooks/use-media-query';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Dialog } from '@/components/ui/dialog';

function ResponsiveModal({ open, onOpenChange, children }) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange}>
        {children}
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  );
}
```

## Отключение для десктопа

```tsx
import { useMediaQuery } from '@/hooks/use-media-query';

function MyPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  useSwipeNavigation({
    routes: [...],
    enabled: isMobile, // Только на мобильных
  });

  return <div>{/* Content */}</div>;
}
```

## Accessibility

- Все touch действия должны иметь альтернативу (кнопки, ссылки)
- Важный контент не должен быть доступен только через свайп
- Bottom sheets должны иметь aria-labels
- Клавиатурная навигация должна работать

## FAQ

**Q: Почему pull-to-refresh не работает?**  
A: Проверьте, что `window.scrollY === 0` (пользователь в верхней части страницы)

**Q: Swipe navigation конфликтует с горизонтальной прокруткой**  
A: Установите `threshold` выше или отключите swipe на таких секциях

**Q: Bottom sheet не закрывается при клике на backdrop**  
A: Убедитесь, что передали `onOpenChange` callback

**Q: Как добавить haptic feedback?**  
A: Используйте Web Vibration API:
```tsx
if ('vibrate' in navigator) {
  navigator.vibrate(10); // 10ms вибрация
}
```
