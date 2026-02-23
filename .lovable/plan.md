

## Fix: Day Strain показывает вчерашние данные

### Корневая причина

В базе данных за сегодня (2026-02-23) нет метрики "Day Strain" от WHOOP. Последнее значение — за вчера (15.97).

Oura записывает "Active Calories" (2247 за сегодня), но **не** "Activity Score". Alias-маппинг для "Day Strain" включает только `['Strain', 'Activity Score']`, но **НЕ** `'Active Calories'`. Поэтому виджет не находит данных за сегодня и показывает вчерашнее значение от WHOOP.

### Решение

**Файл 1: `src/lib/metric-aliases.ts`**

Добавить `'Active Calories'` и `'Workout Time'` в alias-группу Day Strain, чтобы виджет мог использовать fallback-данные:

```
'Day Strain': ['Strain', 'Activity Score', 'Active Calories', 'Workout Time'],
```

**Файл 2: `src/components/dashboard/WidgetCard.tsx`**

Расширить функцию `normalizeActivityToStrain` для нормализации Active Calories и Workout Time в шкалу strain (0-21):

- Active Calories: `Math.min(21, value / 150)` (2100 kcal = 14 strain)
- Workout Time (minutes): `Math.min(21, value / 5)` (60 min = 12 strain)

Логика нормализации совпадает с уже работающим fallback в `useTodayMetrics.tsx` и `useUserWeeklyStrain.tsx`.

### Технические детали

**metric-aliases.ts:**
- Строка 10: добавить `'Active Calories'` и `'Workout Time'` в массив для `'Day Strain'`
- Строка 11: то же для `'Strain'`
- Добавить обратные ссылки: `'Active Calories'` и `'Workout Time'` должны ссылаться на `'Day Strain'`

**WidgetCard.tsx (строки 161-178):**
- Расширить `normalizeActivityToStrain` для обработки Active Calories (value / 150, max 21) и Workout Time (value / 5, max 21)
- Переименовать функцию в `normalizeToStrain` для ясности

### Ожидаемый результат

- Сегодня Active Calories (2247) = нормализованный strain ~14.98 — будет отображаться вместо вчерашнего Day Strain
- Когда WHOOP Day Strain появится за сегодня, conflict resolution автоматически выберет его (priority 1 vs oura priority 3)
- Нет влияния на других пользователей — нормализация применяется только при отображении

