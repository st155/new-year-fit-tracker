# Elite10 Architecture Guide

> Этот документ описывает архитектурные принципы проекта Elite10. Следуй этим правилам при разработке новых фич и рефакторинге существующего кода.

---

## 1. Feature-Based Structure

Весь код, относящийся к конкретной доменной области, должен находиться в `src/features/[feature-name]/`.

```
src/features/[feature-name]/
├── components/           # UI компоненты фичи
│   ├── core/            # Основные компоненты (карточки, формы)
│   ├── legacy/          # Устаревшие компоненты (для обратной совместимости)
│   └── ui/              # Вспомогательные UI элементы
├── hooks/               # React Query хуки и локальные хуки
├── services/            # Локальные сервисы (если не shared)
├── types/               # TypeScript типы и интерфейсы
├── constants/           # Константы фичи
└── index.ts             # Public API (barrel exports)
```

### Пример: `src/features/habits/`

```typescript
// src/features/habits/index.ts — Public API
export * from './components';
export * from './hooks';
export * from './types';
export * from './constants';
```

---

## 2. Service Layer Pattern

### ❌ Запрещено

Прямые вызовы `supabase.from(...)` в UI компонентах:

```typescript
// ❌ НЕПРАВИЛЬНО — в компоненте
const { data } = await supabase.from('habits').select('*');
```

### ✅ Правильно

Вся логика БД должна быть в сервисах:

```typescript
// ✅ ПРАВИЛЬНО — в сервисе
// src/services/habits.service.ts
export async function fetchHabits(userId: string, date: string): Promise<HabitDTO[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId);
    
  if (error) throw new DatabaseError('Failed to fetch habits', error);
  return data ?? [];
}
```

### Правила сервисов

| Правило | Описание |
|---------|----------|
| **Типизация** | Возвращают типизированные DTO (Data Transfer Objects) |
| **Обработка ошибок** | Используют кастомные Error классы |
| **Документация** | Содержат JSDoc комментарии |
| **Расположение** | `src/services/[feature].service.ts` для shared, или `features/[feature]/services/` для локальных |

---

## 3. Data Fetching — TanStack Query v5

### Query Keys

Консистентные ключи запросов: `['entity', 'action', ...params]`

```typescript
// src/features/habits/hooks/useHabitsQuery.ts
export const habitQueryKeys = {
  all: ['habits'] as const,
  list: (date: string) => ['habits', 'list', date] as const,
  detail: (id: string) => ['habits', 'detail', id] as const,
  completions: (habitId: string, date: string) => ['habits', 'completions', habitId, date] as const,
};
```

### Структура хуков

```typescript
// useHabitsQuery.ts
export function useHabitsQuery(date: string, options?: UseHabitsQueryOptions) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: habitQueryKeys.list(date),
    queryFn: () => fetchHabits(user?.id ?? '', date),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 минут
    ...options,
  });
}
```

### Mutations

```typescript
// useHabitMutations.ts
export function useCreateHabit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitQueryKeys.all });
      toast.success('Привычка создана');
    },
    onError: (error) => {
      toast.error('Ошибка создания привычки');
    },
  });
}
```

---

## 4. Mobile-First UX

### Хук `useIsMobile`

```typescript
import { useIsMobile } from '@/hooks/primitive';

function MyComponent() {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileLayout />;
  }
  return <DesktopLayout />;
}
```

### Адаптивные контейнеры

| Устройство | Формы и детали | Модальные окна |
|------------|----------------|----------------|
| **Mobile** | `Drawer` (Bottom Sheet) | `Drawer` снизу |
| **Desktop** | `Dialog` или `Sheet` | `Dialog` по центру |

### Пример

```typescript
// HabitCreateDialog.tsx
function HabitCreateDialog({ open, onOpenChange }) {
  const isMobile = useIsMobile();
  
  const content = <HabitForm />;
  
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>...</DrawerHeader>
          <div className="px-4 overflow-y-auto">{content}</div>
          <DrawerFooter className="pb-8">{/* iOS safe area */}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{content}</DialogContent>
    </Dialog>
  );
}
```

### Виртуализация списков

Для больших списков (>50 элементов) используй:

- **`react-window`** — для виртуализации
- **Пагинация** — для серверной загрузки

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={items.length}
  itemSize={72}
>
  {({ index, style }) => (
    <div style={style}>
      <ItemCard item={items[index]} />
    </div>
  )}
</FixedSizeList>
```

---

## 5. Clean Up Rules

### Процесс миграции

1. **Перенос кода** в `src/features/[feature]/`
2. **Пометить старые файлы** как `@deprecated`
3. **Создать re-export** для backward compatibility
4. **Обновить все импорты** в проекте
5. **Удалить старые файлы** после проверки

### Пример deprecation

```typescript
// src/components/habits/OldHabitCard.tsx
/**
 * @deprecated Use HabitCardV3 from @/features/habits instead
 * @see {@link @/features/habits/components/core/HabitCardV3}
 */
export { HabitCardV3 as OldHabitCard } from '@/features/habits';
```

---

## 6. Import Guidelines

### ✅ Правильно — через Public API

```typescript
import { useHabitsQuery, HabitCardV3, HabitType } from '@/features/habits';
```

### ❌ Неправильно — deep imports

```typescript
import { HabitCardV3 } from '@/features/habits/components/core/HabitCardV3';
import { useHabitsQuery } from '@/features/habits/hooks/useHabitsQuery';
```

### Исключения

Deep imports допустимы только:
- Внутри самой фичи
- Для типов, если они не экспортированы в `index.ts`

---

## 7. Current Features Status

| Feature | Status | Current Path | Target Path |
|---------|--------|--------------|-------------|
| **Habits** | ✅ Migrated | `src/features/habits/` | — |
| **Goals** | ⏳ Pending | `src/components/goals/` | `src/features/goals/` |
| **Workouts** | ⏳ Pending | `src/components/workout/` | `src/features/workouts/` |
| **Nutrition** | ⏳ Pending | `src/components/nutrition/` | `src/features/nutrition/` |
| **Body Composition** | ⏳ Pending | `src/components/body-composition/` | `src/features/body/` |
| **Challenges** | ⏳ Pending | `src/components/challenges/` | `src/features/challenges/` |
| **Bloodwork** | ⏳ Pending | `src/components/bloodwork/` | `src/features/bloodwork/` |
| **Supplements** | ⏳ Pending | `src/components/supplements/` | `src/features/supplements/` |
| **AI Coach** | ⏳ Pending | `src/components/ai/` | `src/features/ai-coach/` |

---

## 8. Checklist для миграции фичи

При миграции новой фичи используй этот чеклист:

- [ ] Создать структуру папок в `src/features/[feature]/`
- [ ] Создать/перенести типы в `types/`
- [ ] Создать/перенести сервисы в `services/` или `src/services/`
- [ ] Создать React Query хуки в `hooks/`
- [ ] Перенести компоненты в `components/`
- [ ] Адаптировать формы для мобильных (Drawer vs Dialog)
- [ ] Создать `index.ts` с public API
- [ ] Обновить импорты во всём проекте
- [ ] Пометить старые файлы как deprecated
- [ ] Удалить старые файлы
- [ ] Обновить таблицу статуса в этом документе

---

## 9. Shared Code

### Расположение shared кода

| Тип | Расположение |
|-----|-------------|
| **UI компоненты** | `src/components/ui/` (shadcn) |
| **Общие хуки** | `src/hooks/` |
| **Shared сервисы** | `src/services/` |
| **Утилиты** | `src/lib/` |
| **Провайдеры** | `src/providers/` |

### Правило

Если код используется **более чем в 2 фичах** — выноси в shared.

---

*Последнее обновление: 2025-01-25*
