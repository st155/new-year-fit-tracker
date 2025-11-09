# Привычки 3.0 - Руководство разработчика

## 🏗️ Архитектура

### Структура компонентов

```
src/components/habits-v3/
├── core/
│   └── HabitCardV3.tsx          # Основная карточка привычки с жестами
├── layouts/
│   ├── SmartView.tsx            # Умный вид с time-of-day группировкой
│   ├── CompactListView.tsx      # Компактный список с фильтрами
│   ├── FocusMode.tsx            # Полноэкранный режим фокуса
│   ├── TimeSection.tsx          # Секция по времени суток
│   └── OverviewStats.tsx        # Статистика обзора
├── onboarding/
│   └── HabitsV3Onboarding.tsx   # Интерактивный онбординг
└── index.ts                      # Экспорты

src/hooks/
├── useHabitCardState.tsx        # Управление состоянием карточки
├── useHabitGrouping.tsx         # Группировка по времени суток
├── useHabitCompletion.tsx       # Логика завершения с XP
└── useDebounce.tsx              # Дебаунсинг для оптимизации

src/lib/
└── habit-utils-v3.ts            # Утилиты, типы, темы

src/pages/
└── HabitsV3.tsx                 # Главная страница с lazy loading
```

### Поток данных

```
User Action
    ↓
HabitsV3.tsx (главная страница)
    ↓
Layout Component (SmartView/CompactView/FocusMode)
    ↓
HabitCardV3 (индивидуальная карточка)
    ↓
useHabitCompletion (бизнес-логика)
    ↓
Supabase (персистентность)
    ↓
React Query Cache (оптимистичные обновления)
```

## 📦 Типы данных

### TimeOfDay

```typescript
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';
```

Используется для группировки привычек по времени суток.

### CardState

```typescript
type CardState = 
  | 'not_started'   // Привычка не начата сегодня
  | 'in_progress'   // Таймер запущен (для duration habits)
  | 'completed'     // Завершена сегодня
  | 'missed'        // Пропущена (streak = 0)
  | 'at_risk';      // В опасности (low completion rate)
```

### TimeBasedTheme

```typescript
interface TimeBasedTheme {
  gradient: string;      // Tailwind gradient classes
  glow: string;          // Box-shadow with glow effect
  textColor: string;     // Text color class
  icon: string;          // Emoji icon
  accentColor: string;   // HSL color value
}
```

## 🔧 Ключевые хуки

### useHabitCompletion

```typescript
const { completeHabit, undoCompletion, isCompleting } = useHabitCompletion();

// Использование
const result = await completeHabit(habitId, habit);
if (result?.success) {
  console.log(`Earned ${result.xpEarned} XP`);
  console.log(`New streak: ${result.streak}`);
  // Показать celebration
}
```

**Логика XP**:
- Базовый XP: `habit.xp_reward` (10-50)
- Бонус за streak: `Math.floor(streak / 7) * 5`
- Множитель сложности: easy: 1.0, medium: 1.5, hard: 2.0
- Бонус за высокий completion rate (>80%): +10 XP

### useHabitGrouping

```typescript
const grouped = useHabitGrouping(habits);

// Возвращает:
{
  morning: Habit[],
  afternoon: Habit[],
  evening: Habit[],
  night: Habit[],
  anytime: Habit[],
  atRisk: Habit[]  // Специальная секция для привычек в опасности
}
```

### useHabitCardState

```typescript
const {
  state,              // Текущее состояние карточки
  expanded,           // Развернута ли карточка
  showCelebration,    // Показать celebration эффект
  isAnimating,        // В процессе анимации
  toggle,             // Переключить expanded
  celebrate,          // Триггер celebration
  setAnimating        // Установить состояние анимации
} = useHabitCardState(habit);
```

### useDebounce

```typescript
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useDebounce(searchQuery, 300);

// debouncedSearch обновится через 300ms после последнего изменения
```

## 🎨 Темизация и стилизация

### Добавление нового времени суток

```typescript
// В habit-utils-v3.ts
export const getTimeBasedTheme = (timeOfDay: TimeOfDay): TimeBasedTheme => {
  const isDark = document.documentElement.classList.contains('dark');
  
  switch (timeOfDay) {
    case 'my_new_time':
      return {
        gradient: isDark 
          ? 'from-color-900/30 to-color-900/40'
          : 'from-color-400/20 to-color-500/30',
        glow: isDark
          ? 'shadow-[0_0_15px_rgba(R,G,B,0.2)]'
          : 'shadow-[0_0_20px_rgba(R,G,B,0.4)]',
        textColor: isDark ? 'text-color-300' : 'text-color-400',
        icon: '🎨',
        accentColor: 'hsl(H, S%, L%)'
      };
  }
};
```

### Dark Mode поддержка

Все темы автоматически адаптируются под темную тему:
- Более темные градиенты в dark mode
- Меньшая интенсивность glow эффектов
- Лучший контраст для текста

```typescript
const isDark = document.documentElement.classList.contains('dark');
```

### CSS утилиты для контраста

```css
/* В index.css */
.text-contrast {
  color: hsl(var(--foreground));
}

.text-contrast-muted {
  color: hsl(var(--muted-foreground));
}

.gradient-text-safe {
  background: linear-gradient(to right, 
    hsl(var(--foreground)) 0%, 
    hsl(var(--primary)) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

## 🚀 Оптимизация производительности

### Мемоизация

```typescript
// HabitCardV3 мемоизирован с custom comparison
export default memo(HabitCardV3, (prev, next) => {
  return (
    prev.habit.id === next.habit.id &&
    prev.habit.completed_today === next.habit.completed_today &&
    prev.habit.streak === next.habit.streak &&
    prev.habit.name === next.habit.name &&
    prev.compact === next.compact
  );
});
```

### Виртуализация списков

```typescript
// SimpleVirtualList автоматически активируется для списков >10 элементов
<SimpleVirtualList
  items={habits}
  renderItem={renderHabitRow}
  threshold={10}  // Виртуализация после 10 элементов
/>
```

### Lazy Loading

```typescript
// В HabitsV3.tsx
const CompactListView = lazy(() => 
  import('@/components/habits-v3/layouts/CompactListView')
    .then(m => ({ default: m.CompactListView }))
);

// Использование с Suspense
<Suspense fallback={<LoadingSkeleton />}>
  <CompactListView {...props} />
</Suspense>
```

### Database индексы

```sql
-- Оптимизация для быстрого поиска
CREATE INDEX idx_habits_user_time 
ON habits(user_id, time_of_day) 
WHERE deleted_at IS NULL;

CREATE INDEX idx_habits_completed_today 
ON habits(user_id, completed_today);

CREATE INDEX idx_completions_habit_date 
ON habit_completions(habit_id, completed_at DESC);

CREATE INDEX idx_profiles_xp 
ON profiles(user_id, total_xp);
```

### Best Practices

1. **Используйте мемоизацию** для callbacks с `useCallback`
2. **Дебаунсинг** для дорогих операций (поиск, фильтрация)
3. **Ленивая загрузка** для редко используемых компонентов
4. **Виртуализация** для длинных списков
5. **Оптимистичные обновления** через React Query

## ♿ Accessibility

### ARIA Labels

```typescript
<div
  role="article"
  aria-label={`Привычка: ${habit.name}`}
  aria-describedby={`habit-desc-${habit.id}`}
  tabIndex={0}
>
  <div id={`habit-desc-${habit.id}`} className="sr-only">
    {/* Подробное описание для screen readers */}
  </div>
</div>
```

### Keyboard Navigation

```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'Enter':
    case ' ':
      handleComplete();
      break;
    case 'e':
      handleEdit();
      break;
    case 'ArrowRight':
      handleSwipeRight();
      break;
    case 'ArrowLeft':
      handleSwipeLeft();
      break;
    case 'Escape':
      handleClose();
      break;
  }
};
```

### Screen Reader Announcements

```typescript
<ScreenReaderAnnouncement 
  message={`Привычка "${habit.name}" выполнена. Получено ${xp} XP`}
  politeness="polite"
/>
```

### Focus Indicators

```css
.habit-card:focus-visible {
  outline: none;
  ring: 2px solid hsl(var(--primary));
  ring-offset: 2px;
}
```

## 🧪 Тестирование

### Unit Tests

```typescript
import { calculateCardState, getTimeBasedTheme } from '@/lib/habit-utils-v3';

describe('calculateCardState', () => {
  it('returns completed when habit is completed today', () => {
    const habit = { completed_today: true };
    expect(calculateCardState(habit)).toBe('completed');
  });
  
  it('returns at_risk for low completion rate', () => {
    const habit = { 
      completed_today: false,
      stats: { completion_rate: 40, total_completions: 10 }
    };
    expect(calculateCardState(habit)).toBe('at_risk');
  });
});
```

### E2E Tests (Playwright)

```typescript
test('should complete habit with swipe', async ({ page }) => {
  await page.goto('/habits-v3');
  
  const firstHabit = page.locator('[role="article"]').first();
  await firstHabit.dragTo(firstHabit, {
    targetPosition: { x: 200, y: 50 }
  });
  
  await expect(page.getByText(/Получено.*XP/)).toBeVisible();
  await expect(firstHabit.getByText('✓ Выполнено')).toBeVisible();
});
```

### Performance Tests

```javascript
// Lighthouse CI
const lighthouse = require('lighthouse');

async function runLighthouse(url) {
  const result = await lighthouse(url, {
    onlyCategories: ['performance', 'accessibility'],
  });
  
  expect(result.categories.performance.score).toBeGreaterThan(0.9);
  expect(result.categories.accessibility.score).toBeGreaterThan(0.95);
}
```

## 📚 Расширение функционала

### Добавление нового Habit Type

1. Определите тип в database:
```sql
ALTER TYPE habit_type ADD VALUE 'my_new_type';
```

2. Создайте специальный компонент:
```typescript
// MyNewTypeTracker.tsx
export function MyNewTypeTracker({ habit, onComplete }) {
  // Custom logic
}
```

3. Добавьте в HabitCardV3:
```typescript
{habit.habit_type === 'my_new_type' && (
  <MyNewTypeTracker {...props} />
)}
```

### Добавление нового View Mode

1. Создайте компонент:
```typescript
// MyCustomView.tsx
export function MyCustomView({ habits, onHabitComplete }) {
  return (
    <div>
      {/* Custom layout */}
    </div>
  );
}
```

2. Добавьте tab в HabitsV3.tsx:
```typescript
<TabsTrigger value="custom">🎨 Мой вид</TabsTrigger>

<TabsContent value="custom">
  <MyCustomView habits={habits} onHabitComplete={handleComplete} />
</TabsContent>
```

## 🔍 Отладка

### Логирование состояний

```typescript
// Включить детальное логирование
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('[HabitCardV3] State:', state);
  console.log('[HabitCardV3] Theme:', theme);
  console.log('[HabitCardV3] Habit data:', habit);
}
```

### React DevTools

Используйте React DevTools Profiler для:
- Выявления ненужных ре-рендеров
- Оптимизации мемоизации
- Анализа performance bottlenecks

### Network monitoring

Проверьте количество запросов к Supabase:
- Должно быть минимальное количество запросов
- Используйте React Query cache
- Batch операции где возможно

## 📖 Дополнительные ресурсы

- [Framer Motion Docs](https://www.framer.com/motion/) - для анимаций
- [React Query Docs](https://tanstack.com/query) - для data fetching
- [Tailwind CSS Docs](https://tailwindcss.com) - для стилизации
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - для accessibility

---

**Версия**: 3.0.0  
**Последнее обновление**: Январь 2025  
**Мейнтейнер**: Development Team
