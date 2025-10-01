# Микроинтеракции в проекте

Этот документ описывает все доступные микроинтеракции и как их использовать.

## CSS классы для микроинтеракций

### 1. Hover эффекты

#### hover-scale
Увеличение элемента при наведении
```tsx
<div className="hover-scale">Наведи на меня</div>
```

#### hover-bounce
Подпрыгивание при наведении
```tsx
<button className="hover-bounce">Кнопка</button>
```

#### hover-wiggle
Покачивание при наведении
```tsx
<div className="hover-wiggle">🔔</div>
```

#### hover-glow
Свечение при наведении
```tsx
<button className="hover-glow">Светящаяся кнопка</button>
```

### 2. Click эффекты

#### ripple
Эффект волны при клике
```tsx
<button className="ripple bg-primary text-white px-4 py-2">
  Кликни меня
</button>
```

#### press-effect
Эффект нажатия
```tsx
<button className="press-effect">Нажми</button>
```

### 3. Анимации

#### pulse-glow
Пульсирующее свечение
```tsx
<div className="pulse-glow">Важное уведомление</div>
```

#### shine
Эффект блеска при наведении
```tsx
<button className="shine bg-gradient-primary">Премиум кнопка</button>
```

#### card-lift
Поднятие карточки при наведении
```tsx
<Card className="card-lift">
  <CardContent>Контент</CardContent>
</Card>
```

#### icon-spin-hover
Вращение иконки при наведении
```tsx
<Settings className="icon-spin-hover" />
```

### 4. Специальные анимации

#### animate-heartbeat
Эффект сердцебиения
```tsx
<Badge className="animate-heartbeat">Новое</Badge>
```

#### animate-swing
Качание элемента
```tsx
<Bell className="animate-swing" />
```

#### animate-float
Плавающая анимация
```tsx
<div className="animate-float">↑</div>
```

#### animate-wiggle
Покачивание
```tsx
<div className="hover:animate-wiggle">Наведи</div>
```

#### shake-on-error
Тряска при ошибке (добавить при валидации)
```tsx
<Input className={errors ? "shake-on-error" : ""} />
```

## Компоненты с микроинтеракциями

### InteractiveButton
Кнопка с различными вариантами взаимодействия

```tsx
import { InteractiveButton } from "@/components/ui/interactive-button";

// Варианты
<InteractiveButton variant="ripple">Ripple</InteractiveButton>
<InteractiveButton variant="bounce">Bounce</InteractiveButton>
<InteractiveButton variant="shine">Shine</InteractiveButton>
<InteractiveButton variant="press">Press</InteractiveButton>
<InteractiveButton variant="glow">Glow</InteractiveButton>
```

### FloatingActionButton
Плавающая кнопка действия

```tsx
import { FloatingActionButton } from "@/components/ui/interactive-button";

<FloatingActionButton onClick={handleAction}>
  <Plus className="h-6 w-6" />
</FloatingActionButton>
```

### IconButton
Кнопка-иконка с вращением

```tsx
import { IconButton } from "@/components/ui/interactive-button";

<IconButton onClick={handleSettings}>
  <Settings className="h-5 w-5" />
</IconButton>
```

### PulseButton
Пульсирующая кнопка (для важных действий)

```tsx
import { PulseButton } from "@/components/ui/interactive-button";

<PulseButton onClick={handleImportant}>
  Важное действие
</PulseButton>
```

## Улучшенный Button компонент

Все стандартные кнопки теперь имеют микроинтеракции:

```tsx
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/ui/enhanced-button";

// Button - все варианты автоматически имеют:
// - Ripple эффект
// - Scale при hover
// - Active state (scale down)
// - Shine эффект (для fitness варианта)

<Button variant="default">Default</Button>
<Button variant="fitness">Fitness с Ripple + Shine</Button>
<Button variant="success">Success с Ripple</Button>
<Button variant="hero">Hero с Glow Pulse</Button>

// EnhancedButton - с поддержкой loading состояния
<EnhancedButton variant="gradient" loading={isLoading}>
  Сохранить
</EnhancedButton>
```

## Улучшенный Badge компонент

Badge теперь с микроинтеракциями:

```tsx
import { Badge } from "@/components/ui/badge";

// Все варианты имеют hover:scale-105
<Badge variant="default">Default</Badge>
<Badge variant="success">Success</Badge>

// Специальные анимированные варианты
<Badge variant="pulse">Пульсация</Badge>
<Badge variant="heartbeat">Сердцебиение</Badge>

// Для уведомлений
<Badge variant="heartbeat" className="absolute -top-1 -right-1">
  3
</Badge>
```

## Комбинирование эффектов

Можно комбинировать несколько эффектов:

```tsx
<button className="hover-scale press-effect shine ripple bg-gradient-primary text-white px-6 py-3 rounded-xl">
  Супер кнопка
</button>
```

## Рекомендации по использованию

1. **Не перебарщивайте**: Слишком много анимаций могут отвлекать
2. **Используйте для важных элементов**: Главные кнопки, уведомления
3. **Будьте последовательны**: Используйте похожие эффекты для похожих элементов
4. **Учитывайте производительность**: Используйте `will-change` для сложных анимаций

## Примеры использования в проекте

### Уведомления с heartbeat
```tsx
<Badge variant="heartbeat">
  {notificationCount}
</Badge>

// Или с классом
<Badge className="animate-heartbeat">
  Новое
</Badge>
```

### Навигационные иконки с bounce
```tsx
<Button className="hover-bounce hover:scale-110" size="icon">
  <Home className="h-5 w-5" />
</Button>

// Или использовать IconButton
<IconButton onClick={handleClick}>
  <Settings className="h-5 w-5" />
</IconButton>
```

### Карточки с lift эффектом
```tsx
<Card className="card-lift cursor-pointer" onClick={handleClick}>
  <CardContent>
    <h3>Кликабельная карточка</h3>
    <p>Поднимается при наведении</p>
  </CardContent>
</Card>
```

### Важные действия с pulse
```tsx
<PulseButton onClick={handleImportantAction}>
  Начать тренировку
</PulseButton>

// Или с Badge
<Badge variant="pulse">Новое</Badge>
```

### Аватар с вращением
```tsx
<Avatar className="hover:ring-4 transition-all duration-300 hover:rotate-6">
  <AvatarImage src={url} />
</Avatar>
```

### Floating Action Button
```tsx
<FloatingActionButton onClick={handleAdd}>
  <Plus className="h-6 w-6" />
</FloatingActionButton>
```

## Кастомные анимации

Все анимации определены в:
- `src/index.css` - CSS анимации и utility классы
- `tailwind.config.ts` - Tailwind keyframes и animations

Вы можете добавлять свои собственные анимации, следуя той же структуре.

## Интегрированные компоненты

✅ **Button** - полная интеграция микроинтеракций (ripple, scale, shine, glow-pulse)
✅ **EnhancedButton** - микроинтеракции + loading состояние
✅ **Badge** - hover scale + анимированные варианты (pulse, heartbeat)
✅ **Card** - hover shadow и glassmorphism эффекты
✅ **InteractiveButton** - специализированные кнопки с разными эффектами
✅ **FloatingActionButton** - FAB с bounce анимацией
✅ **IconButton** - кнопка-иконка с spin эффектом
✅ **PulseButton** - пульсирующая кнопка для важных действий
