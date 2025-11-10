# Accessibility Guidelines

## Руководство по доступности Elite10

Это руководство описывает стандарты accessibility (a11y) в приложении.

## 🎯 Цели

1. **WCAG 2.1 Level AA** compliance
2. Keyboard navigation для всех интерактивных элементов
3. Screen reader support
4. Reduced motion support
5. Высокий контраст для читаемости

## ⌨️ Keyboard Navigation

### Стандартные shortcuts

```typescript
- Tab / Shift+Tab: Навигация между элементами
- Enter / Space: Активация элемента
- Escape: Закрытие модалов/диалогов
- Arrow keys: Навигация в списках/меню
- Cmd/Ctrl+K: Command palette
```

### Реализация

```tsx
import { handleKeyboardNav } from '@/lib/accessibility';

const handleKeyDown = (e: KeyboardEvent) => {
  handleKeyboardNav(e, {
    onEnter: () => submitForm(),
    onEscape: () => closeModal(),
    onArrowDown: () => selectNext(),
    onArrowUp: () => selectPrevious(),
  });
};
```

## 🔊 Screen Reader Support

### ARIA Labels

```tsx
// ❌ Плохо
<button onClick={handleClick}>
  <Icon />
</button>

// ✅ Хорошо
<button 
  onClick={handleClick}
  aria-label="Создать новую цель"
>
  <Icon />
  <span className="sr-only">Создать новую цель</span>
</button>
```

### Live Regions

Используйте `announceToScreenReader` для динамических изменений:

```typescript
import { announceToScreenReader } from '@/lib/accessibility';

// После успешного действия
announceToScreenReader('Привычка успешно завершена', 'polite');

// Для критичных уведомлений
announceToScreenReader('Ошибка сохранения данных', 'assertive');
```

## 🎯 Focus Management

### Focus Trap

Для модальных окон и drawer:

```tsx
import { trapFocus, restoreFocus } from '@/lib/accessibility';

const DialogComponent = () => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      const cleanup = trapFocus(dialogRef);
      return () => {
        cleanup();
        restoreFocus(previousFocus.current);
      };
    }
  }, [open]);

  return <div ref={dialogRef}>...</div>;
};
```

### Escape Key Handler

```tsx
import { useEscapeKey } from '@/lib/accessibility';

function Modal() {
  useEscapeKey(() => setOpen(false));
  // ...
}
```

## 🎨 Visual Accessibility

### Color Contrast

Минимальные требования (WCAG AA):
- **Normal text:** 4.5:1
- **Large text (18px+ или 14px+ bold):** 3:1
- **UI components:** 3:1

### Focus Indicators

Все интерактивные элементы должны иметь видимый focus indicator:

```css
/* index.css - Применяется глобально */
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
  border-radius: 4px;
}
```

### Semantic Colors

Используйте семантические CSS переменные:

```tsx
// ❌ Плохо
<div className="text-white bg-black" />

// ✅ Хорошо
<div className="text-foreground bg-background" />
```

## 📋 Forms Accessibility

### Labels

```tsx
// ❌ Плохо
<input placeholder="Email" />

// ✅ Хорошо
<Label htmlFor="email">Email</Label>
<Input id="email" aria-describedby="email-hint" />
<p id="email-hint" className="text-sm text-muted-foreground">
  Мы никогда не поделимся вашим email
</p>
```

### Error Messages

```tsx
<Input
  id="password"
  type="password"
  aria-invalid={!!error}
  aria-describedby={error ? "password-error" : undefined}
/>
{error && (
  <p id="password-error" role="alert" className="text-destructive">
    {error}
  </p>
)}
```

## 🎭 Motion Accessibility

### Respecting prefers-reduced-motion

```tsx
import { shouldReduceMotion, getAnimationVariants } from '@/lib/animations-v3';

// Автоматическая проверка
<motion.div {...getAnimationVariants(fadeIn())}>
  Content
</motion.div>

// Ручная проверка
const animate = shouldReduceMotion() ? {} : { y: [0, -10, 0] };
```

## 🏷️ Semantic HTML

### Используйте правильные теги

```tsx
// ❌ Плохо
<div onClick={handleClick}>Click me</div>

// ✅ Хорошо
<button onClick={handleClick}>Click me</button>
```

### Landmarks

```tsx
<header role="banner">
  <nav aria-label="Главное меню">...</nav>
</header>

<main role="main">
  <article>...</article>
  <aside role="complementary">...</aside>
</main>

<footer role="contentinfo">...</footer>
```

## 📱 Touch Targets

Минимальный размер кликабельной области: **44x44px**

```tsx
// Используйте padding для увеличения touch target
<button className="p-3"> {/* 44px+ */}
  <Icon className="h-4 w-4" />
</button>
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Tab через весь интерфейс
- [ ] Проверить с VoiceOver/NVDA/JAWS
- [ ] Проверить с keyboard only
- [ ] Проверить с увеличенным шрифтом (200%)
- [ ] Проверить контраст в DevTools
- [ ] Проверить с `prefers-reduced-motion: reduce`
- [ ] Проверить с high contrast mode

### Automated Tools

- **axe DevTools** - браузерное расширение
- **WAVE** - онлайн проверка
- **Lighthouse** - встроено в Chrome DevTools

## 📚 Компоненты с A11y Support

### Button
```tsx
<Button
  aria-label="Delete item"
  aria-pressed={isActive} // для toggle buttons
  disabled={isLoading}
>
  {isLoading ? 'Loading...' : 'Delete'}
</Button>
```

### Dialog
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent aria-describedby="dialog-description">
    <DialogTitle id="dialog-title">Заголовок</DialogTitle>
    <DialogDescription id="dialog-description">
      Описание
    </DialogDescription>
  </DialogContent>
</Dialog>
```

### Tabs
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList role="tablist">
    <TabsTrigger 
      value="tab1" 
      role="tab"
      aria-selected={activeTab === 'tab1'}
    >
      Tab 1
    </TabsTrigger>
  </TabsList>
  <TabsContent value="tab1" role="tabpanel">
    Content
  </TabsContent>
</Tabs>
```

## 🎯 Quick Wins

1. ✅ Добавить `alt` ко всем изображениям
2. ✅ Использовать semantic HTML
3. ✅ Добавить `aria-label` к icon-only buttons
4. ✅ Обеспечить keyboard navigation
5. ✅ Добавить focus indicators
6. ✅ Использовать правильную heading hierarchy (h1→h2→h3)
7. ✅ Добавить `role="status"` к loading states
8. ✅ Добавить `role="alert"` к errors

## 📖 Дополнительные ресурсы

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
