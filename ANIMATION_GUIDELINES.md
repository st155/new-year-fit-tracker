# Animation Guidelines

## Система анимаций V3

Это руководство описывает стандарты использования анимаций в приложении Elite10.

## 🎯 Основные принципы

1. **Consistency** - Одинаковые анимации для одинаковых действий
2. **Performance** - Избегайте тяжелых анимаций на слабых устройствах
3. **Accessibility** - Всегда учитывайте `prefers-reduced-motion`
4. **Purpose** - Каждая анимация должна иметь цель

## 📦 Использование

```typescript
import { fadeIn, scaleIn, slideIn, ANIMATION_DURATION } from '@/lib/animations-v3';
```

## ⏱️ Duration Standards

```typescript
ANIMATION_DURATION = {
  fast: 150ms,      // Мгновенная обратная связь (кнопки, hover)
  normal: 300ms,    // Стандартные переходы (модалы, карточки)
  slow: 500ms,      // Сложные анимации (страницы, списки)
  verySlow: 800ms   // Особые эффекты (конфетти, достижения)
}
```

## 🎨 Когда использовать каждый тип

### CSS Animations (via Tailwind)
**Используйте для:**
- Простых hover эффектов
- Бесконечных анимаций (pulse, spin)
- Статических элементов

**Примеры:**
```tsx
<div className="hover:scale-105 transition-transform duration-300" />
<div className="animate-pulse" />
<div className="animate-spin" />
```

### Framer Motion
**Используйте для:**
- Сложных enter/exit анимаций
- Анимаций с физикой (spring)
- Drag & drop
- Gesture interactions

**Примеры:**
```tsx
import { motion } from 'framer-motion';
import { fadeIn } from '@/lib/animations-v3';

<motion.div {...fadeIn()}>
  Content
</motion.div>
```

## 🎭 Preset Animations

### fadeIn
Плавное появление с небольшим сдвигом вверх
```typescript
fadeIn(duration?: number)
```
**Когда использовать:** Модалы, карточки, списки

### scaleIn
Масштабирование с fade-in
```typescript
scaleIn(duration?: number)
```
**Когда использовать:** Кнопки, иконки, небольшие элементы

### slideIn
Скольжение с выбранной стороны
```typescript
slideIn(direction: 'left' | 'right' | 'up' | 'down', duration?: number)
```
**Когда использовать:** Боковые панели, drawer, уведомления

### celebration
Праздничная анимация с вращением
```typescript
celebration()
```
**Когда использовать:** Достижения, завершение целей

## 🎯 Hover & Tap Animations

```typescript
import { hoverLift, hoverScale } from '@/lib/animations-v3';

// Lift effect (поднятие)
<motion.div {...hoverLift}>
  <Card />
</motion.div>

// Scale effect (увеличение)
<motion.button {...hoverScale}>
  Click me
</motion.button>
```

## ♿ Accessibility

**ВСЕГДА** используйте `getAnimationVariants` для поддержки `prefers-reduced-motion`:

```typescript
import { fadeIn, getAnimationVariants } from '@/lib/animations-v3';

<motion.div {...getAnimationVariants(fadeIn())}>
  Content
</motion.div>
```

Это автоматически отключит анимации для пользователей с `prefers-reduced-motion: reduce`.

## 📋 Easing Functions

```typescript
ANIMATION_EASING = {
  smooth: [0.4, 0, 0.2, 1],      // Стандартный smooth
  bounce: [0.68, -0.55, 0.265, 1.55], // Отскок
  elastic: [0.175, 0.885, 0.32, 1.275] // Эластичный
}
```

## 🔥 Spring Configurations

```typescript
SPRING_CONFIG = {
  default: { type: "spring", stiffness: 400, damping: 25 },
  gentle: { type: "spring", stiffness: 200, damping: 20 },
  stiff: { type: "spring", stiffness: 600, damping: 30 },
  bouncy: { type: "spring", stiffness: 500, damping: 15 }
}
```

## 🎪 Examples

### Модальное окно
```tsx
<motion.div
  {...fadeIn(ANIMATION_DURATION.normal)}
>
  <Dialog />
</motion.div>
```

### Список с stagger эффектом
```tsx
import { staggerContainer, staggerItem } from '@/lib/animations-v3';

<motion.div variants={staggerContainer} initial="initial" animate="animate">
  {items.map(item => (
    <motion.div key={item.id} variants={staggerItem}>
      <Card />
    </motion.div>
  ))}
</motion.div>
```

### Floating иконка
```tsx
import { float } from '@/lib/animations-v3';

<motion.div animate={float}>
  <Icon />
</motion.div>
```

## ⚠️ Избегайте

1. ❌ Слишком длинных анимаций (>500ms для обычных элементов)
2. ❌ Анимаций на каждом элементе одновременно
3. ❌ Тяжелых CSS properties (width, height, top, left)
4. ❌ Игнорирование `prefers-reduced-motion`

## ✅ Рекомендации

1. ✅ Используйте transform (translate, scale, rotate)
2. ✅ Используйте opacity
3. ✅ Добавляйте `will-change` для сложных анимаций
4. ✅ Тестируйте на мобильных устройствах
5. ✅ Используйте `AnimatePresence` для exit анимаций

## 🚀 Performance Tips

```tsx
// ❌ Плохо
<motion.div animate={{ width: "100%" }} />

// ✅ Хорошо
<motion.div animate={{ scaleX: 1 }} style={{ transformOrigin: "left" }} />
```

## 📚 Дополнительные ресурсы

- [Framer Motion Docs](https://www.framer.com/motion/)
- [CSS Triggers](https://csstriggers.com/)
- [Web Animation Best Practices](https://web.dev/animations/)
