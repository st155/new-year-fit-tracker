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

// Все варианты автоматически имеют:
// - Ripple эффект
// - Scale при hover
// - Active state
// - Shine эффект (для fitness варианта)

<Button variant="default">Default</Button>
<Button variant="fitness">Fitness</Button>
<Button variant="success">Success</Button>
<Button variant="hero">Hero</Button>
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
<Badge className="animate-heartbeat">
  {notificationCount}
</Badge>
```

### Навигационные иконки с bounce
```tsx
<Button className="hover-bounce hover:scale-110">
  <Home className="h-5 w-5" />
</Button>
```

### Карточки с lift эффектом
```tsx
<Card className="card-lift cursor-pointer">
  <CardContent>...</CardContent>
</Card>
```

### Аватар с вращением
```tsx
<Avatar className="hover:ring-4 transition-all duration-300 hover:rotate-6">
  <AvatarImage src={url} />
</Avatar>
```

## Кастомные анимации

Все анимации определены в:
- `src/index.css` - CSS анимации
- `tailwind.config.ts` - Tailwind анимации

Вы можете добавлять свои собственные анимации, следуя той же структуре.
