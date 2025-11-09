# Habits V3 Gamification System

## Overview

Полная система геймификации для Habits V3 с уровнями, XP, достижениями и наградами.

## Features

### 1. Level System
- **Формула**: Level = floor(sqrt(XP / 100)) + 1
- Уровни от 1 до ∞
- Прогресс-бар до следующего уровня
- Награды на каждом уровне (темы, значки, аналитика)

### 2. XP System
**Базовое начисление XP:**
- Базовое выполнение: 10 XP
- Бонус за стрейк: +1 XP за каждый день (макс +50)
- Бонус за сложность: +5 XP (hard habit)
- Первое выполнение за день: +5 XP
- Идеальный день (все привычки): +20 XP

**Источники XP:**
- `habit_completion` - выполнение привычки
- `achievement` - разблокировка достижения
- `streak_bonus` - бонус за стрейк

### 3. Achievements (25 достижений)

**Категории:**
- **Streak** (7): 3, 7, 14, 30, 50, 100, 365 дней
- **Completion** (6): 1, 10, 50, 100, 500, 1000 выполнений
- **Consistency** (3): Идеальный день, неделя, месяц
- **Special** (9): Ранняя пташка, Полуночник, Многозадачность, и др.

**Rarity levels:**
- Common (серый): базовые достижения
- Rare (синий): редкие достижения
- Epic (фиолетовый): эпические достижения
- Legendary (золотой): легендарные достижения

### 4. Streak Rewards

Milestone rewards за стрейки:
- 3 дня: "Начало пути" (+20 XP)
- 7 дней: "Неделя силы" (+50 XP)
- 14 дней: "Две недели" (+100 XP)
- 30 дней: "Месячный чемпион" (+250 XP)
- 50 дней: "Мастер постоянства" (+500 XP)
- 100 дней: "Легенда привычек" (+1000 XP)
- 365 дней: "Годовой воин" (+5000 XP)

## UI Components

### LevelProgressBar
Отображает текущий уровень, XP и прогресс.
```tsx
<LevelProgressBar
  level={5}
  totalXP={2500}
  xpToNext={100}
  progressPercent={75}
/>
```

### AchievementBadge
Карточка достижения (заблокированная или разблокированная).
```tsx
<AchievementBadge
  achievement={achievement}
  unlocked={true}
  unlockedAt="2024-01-15"
  progress={85}
/>
```

### AchievementsModal
Полный список всех достижений с фильтрацией.
```tsx
<AchievementsModal
  open={showModal}
  onOpenChange={setShowModal}
/>
```

### LevelUpCelebration
Полноэкранное celebration при повышении уровня.
```tsx
<LevelUpCelebration
  open={showLevelUp}
  onOpenChange={setShowLevelUp}
  newLevel={6}
/>
```

## Database Schema

### Tables

**xp_history**
```sql
- id: UUID (PK)
- user_id: UUID (FK -> auth.users)
- amount: INTEGER
- source: TEXT ('habit_completion', 'achievement', etc.)
- source_id: TEXT
- metadata: JSONB
- created_at: TIMESTAMPTZ
```

**achievement_definitions**
```sql
- id: TEXT (PK)
- name: TEXT
- description: TEXT
- category: TEXT
- icon: TEXT
- rarity: TEXT
- xp_reward: INTEGER
- requirement: JSONB
- created_at: TIMESTAMPTZ
```

**user_achievements**
```sql
- id: UUID (PK)
- user_id: UUID (FK)
- achievement_id: TEXT (FK)
- unlocked_at: TIMESTAMPTZ
- progress: JSONB
```

## Integration

### useHabitCompletion Hook
Автоматически:
- Начисляет XP за выполнение
- Проверяет новые достижения
- Показывает celebration toasts
- Отслеживает perfect days
- Вызывает level up celebration

### HabitsV3 Page
Интегрировано:
- LevelProgressBar в header
- Кнопка достижений (Trophy icon)
- LevelUpCelebration dialog
- AchievementsModal

## Usage Examples

### Получить информацию о уровне пользователя
```tsx
const { levelInfo, isLoading } = useUserLevel();

if (levelInfo) {
  console.log(`Level: ${levelInfo.level}`);
  console.log(`Total XP: ${levelInfo.totalXP}`);
  console.log(`Progress: ${levelInfo.progressPercent}%`);
}
```

### Проверить достижения
```tsx
const achievements = await checkAndAwardAchievements({
  userId: user.id,
  streak: 7,
  totalCompletions: 50,
  perfectDay: true,
});

// Показать toasts для новых достижений
achievements.forEach(({ achievement, xpAwarded }) => {
  toast(<AchievementUnlockedToast achievement={achievement} />);
});
```

## Best Practices

1. **XP начисление**: Всегда используйте `calculateHabitXP()` для консистентности
2. **Achievements**: Проверяйте после каждого значимого действия
3. **Celebrations**: Не показывайте слишком много уведомлений одновременно
4. **Performance**: Achievement checking оптимизирован для быстрой работы
5. **UX**: Level up celebration блокирует экран - используйте осторожно

## Future Enhancements

- [ ] Leaderboards между пользователями
- [ ] Custom achievements от тренеров
- [ ] Achievement collections/sets
- [ ] Daily/weekly challenges для XP
- [ ] XP multiplier events
- [ ] Profile badges display
- [ ] Achievement notifications settings
