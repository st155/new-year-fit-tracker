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
import { SwipeIndicator } from '@/components/ui/swipe-indicator';
import { useLocation } from 'react-router-dom';

function MyPage() {
  const location = useLocation();
  const routes = ['/', '/progress', '/challenges', '/feed'];
  const currentIndex = routes.indexOf(location.pathname);

  // Настраиваем навигацию между страницами с визуальной обратной связью
  const { swipeProgress, swipeDirection } = useSwipeNavigation({
    routes,
    enabled: true,
    threshold: 80,
  });

  return (
    <div className="relative">
      <SwipeIndicator 
        progress={swipeProgress}
        direction={swipeDirection}
        currentIndex={currentIndex}
        totalPages={routes.length}
      />
      {/* Контент */}
    </div>
  );
}
```

### Возвращаемые значения

- `swipeProgress` - прогресс свайпа от 0 до 100
- `swipeDirection` - направление свайпа: `'left'`, `'right'` или `null`

### Параметры

- `routes` - массив путей для навигации (обязательно)
- `threshold` - минимальная дистанция свайпа в пикселях (по умолчанию 80)
- `enabled` - включить/выключить свайп (по умолчанию true)
- `onSwipeStart` - callback при начале свайпа
- `onSwipeEnd` - callback при завершении свайпа

### Визуальные индикаторы

Компонент `SwipeIndicator` показывает:
- **Стрелки** по краям экрана во время свайпа
- **Точки прогресса** внизу экрана (текущая страница подсвечена)
- Анимации появления/исчезновения

### Как это работает

- **Свайп влево** → следующая страница в массиве routes
- **Свайп вправо** → предыдущая страница в массиве routes
- Защита от случайных свайпов на интерактивных элементах (кнопки, инпуты)
- Различает горизонтальные и вертикальные свайпы
- Работает только на touch устройствах

### Примеры

#### Навигация между разделами дашборда

```tsx
const { swipeProgress, swipeDirection } = useSwipeNavigation({
  routes: ['/', '/progress', '/challenges', '/feed'],
  enabled: true,
  threshold: 80,
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
  threshold: 100, // Более жесткий порог
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

## Responsive Dialog (Адаптивный диалог)

### Автоматический выбор UI для мобильных и десктопа

`ResponsiveDialog` - это компонент, который автоматически использует:
- **Dialog** на десктопе (≥768px)
- **BottomSheet** на мобильных устройствах (<768px)

### Базовое использование

```tsx
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Открыть</button>

      <ResponsiveDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Заголовок"
        description="Описание (опционально)"
        snapPoints={[50, 90]}
      >
        <div className="space-y-4">
          {/* Контент */}
        </div>
      </ResponsiveDialog>
    </>
  );
}
```

### С триггером

```tsx
<ResponsiveDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Добавить измерение"
  trigger={
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Добавить
    </Button>
  }
>
  <MeasurementForm />
</ResponsiveDialog>
```

### Параметры

- `open` - состояние открыто/закрыто (обязательно)
- `onOpenChange` - callback изменения состояния (обязательно)
- `title` - заголовок диалога
- `description` - описание (опционально)
- `trigger` - элемент для открытия (опционально)
- `className` - дополнительные CSS классы
- `snapPoints` - точки привязки для мобильной версии (по умолчанию [50, 90])

### Примеры использования

#### Форма добавления измерения

```tsx
<ResponsiveDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Добавить вес"
  description="Введите текущий вес"
  snapPoints={[65, 90]}
>
  <Input type="number" placeholder="70.5" />
  <Button onClick={handleSave}>Сохранить</Button>
</ResponsiveDialog>
```

#### Быстрые действия

```tsx
<ResponsiveDialog
  open={isActionsOpen}
  onOpenChange={setIsActionsOpen}
  title="Действия"
  snapPoints={[40]}
>
  <div className="space-y-2">
    <Button onClick={handleEdit}>Редактировать</Button>
    <Button onClick={handleDelete} variant="destructive">
      Удалить
    </Button>
  </div>
</ResponsiveDialog>
```

### Где используется

- `QuickMeasurementDialog` - форма добавления измерений
- `QuickWeightTracker` - быстрое добавление веса
- И другие модальные окна приложения


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

### Modal с автоматической адаптацией

```tsx
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

function MyComponent() {
  const [open, setOpen] = useState(false);

  // ResponsiveDialog автоматически переключается
  // между Dialog (десктоп) и BottomSheet (мобильный)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      title="Настройки"
      description="Измените параметры"
    >
      {/* Контент автоматически адаптируется */}
      <SettingsForm />
    </ResponsiveDialog>
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
