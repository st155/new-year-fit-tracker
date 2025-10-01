# ⚡ Performance Optimization Guide

Документация по оптимизации производительности приложения.

---

## 📦 Lazy Loading

### Code Splitting на уровне роутов

Все страницы загружаются лениво с использованием `React.lazy()`:

```tsx
// ❌ Плохо - синхронная загрузка
import Dashboard from "./pages/Dashboard";

// ✅ Хорошо - ленивая загрузка
const Dashboard = lazy(() => import("./pages/Dashboard"));
```

### Использование в App.tsx

```tsx
import { Suspense, lazy } from "react";
import { PageLoader } from "@/components/ui/page-loader";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));

function App() {
  return (
    <Suspense fallback={<PageLoader message="Загрузка..." />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}
```

---

## 🎯 Lazy Loading с Preload

### lazyWithPreload

Создавайте компоненты с возможностью предзагрузки:

```tsx
import { lazyWithPreload } from "@/utils/lazy-preload";

const HeavyComponent = lazyWithPreload(
  () => import("./HeavyComponent")
);

// Предзагрузка при hover
<button onMouseEnter={() => HeavyComponent.preload()}>
  Открыть
</button>

// Использование
<Suspense fallback={<Loader />}>
  <HeavyComponent />
</Suspense>
```

### Preload стратегии

#### 1. Preload On Idle (при простое)

```tsx
import { preloadOnIdle } from "@/utils/lazy-preload";

const Profile = lazyWithPreload(() => import("./pages/Profile"));
const Settings = lazyWithPreload(() => import("./pages/Settings"));

// В компоненте App
useEffect(() => {
  // Предзагрузка после загрузки основного контента
  preloadOnIdle(Profile, Settings);
}, []);
```

#### 2. Preload On Hover

```tsx
import { preloadOnHover } from "@/utils/lazy-preload";

const Details = lazyWithPreload(() => import("./Details"));

function ListItem() {
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return preloadOnHover(itemRef.current, Details);
  }, []);

  return (
    <div ref={itemRef}>
      Hover to preload
    </div>
  );
}
```

#### 3. Preload On Interaction

```tsx
const Modal = lazyWithPreload(() => import("./Modal"));

<button 
  onClick={() => setModalOpen(true)}
  onFocus={() => Modal.preload()}
  onMouseEnter={() => Modal.preload()}
>
  Open Modal
</button>
```

---

## 🖼️ Lazy Loading Images

### LazyImage Component

Автоматическая загрузка изображений при появлении в viewport:

```tsx
import { LazyImage } from "@/components/lazy/LazyImage";

<LazyImage
  src="/path/to/image.jpg"
  alt="Description"
  fallback="/placeholder.svg"
  className="w-full h-auto"
  threshold={0.1} // Загрузка при 10% видимости
/>
```

### Особенности

- **Intersection Observer** - загрузка только видимых изображений
- **Плавное появление** - fade-in анимация
- **Fallback** - запасное изображение при ошибке
- **Loading состояние** - спиннер во время загрузки

### Оптимизация изображений

```tsx
// ✅ Используйте правильные размеры
<LazyImage
  src="/image.jpg"
  alt="Photo"
  width={800}
  height={600}
  loading="lazy" // Native lazy loading как fallback
/>

// ✅ WebP формат с fallback
<picture>
  <source srcSet="/image.webp" type="image/webp" />
  <LazyImage src="/image.jpg" alt="Photo" />
</picture>
```

---

## 📊 Lazy Loading Charts

### LazyChart Component

Ленивая загрузка тяжелых библиотек графиков:

```tsx
import { LazyChart } from "@/components/lazy/LazyChart";
import { LineChart, Line, XAxis, YAxis } from "recharts";

<LazyChart height={300}>
  <LineChart data={data}>
    <Line dataKey="value" />
    <XAxis dataKey="date" />
    <YAxis />
  </LineChart>
</LazyChart>
```

### Когда использовать

- Графики вне первого экрана
- Дашборды с множественными графиками
- Модальные окна с аналитикой

---

## 🎨 Component-Level Code Splitting

### Тяжелые UI компоненты

```tsx
// Ленивая загрузка редакторов, модалей и т.д.
const RichTextEditor = lazy(() => import("./RichTextEditor"));
const ImageCropper = lazy(() => import("./ImageCropper"));
const VideoPlayer = lazy(() => import("./VideoPlayer"));

function Editor() {
  return (
    <Suspense fallback={<ComponentLoader />}>
      <RichTextEditor />
    </Suspense>
  );
}
```

### Условная загрузка

```tsx
const AdminPanel = lazy(() => import("./AdminPanel"));

function Dashboard({ isAdmin }) {
  return (
    <div>
      <MainContent />
      {isAdmin && (
        <Suspense fallback={<Loader />}>
          <AdminPanel />
        </Suspense>
      )}
    </div>
  );
}
```

---

## 🔧 Best Practices

### 1. Размер бандла

✅ **DO**
- Lazy load страницы (routes)
- Lazy load модальные окна
- Lazy load тяжелые библиотеки (charts, editors)
- Lazy load компоненты вне первого экрана

❌ **DON'T**
- Lazy load мелких компонентов (<5KB)
- Lazy load компонентов на первом экране
- Чрезмерное дробление бандла

### 2. Loading States

```tsx
// ✅ Хороший loading state
<Suspense fallback={
  <PageLoader message="Загрузка профиля..." />
}>
  <Profile />
</Suspense>

// ❌ Плохой loading state (без feedback)
<Suspense fallback={null}>
  <Profile />
</Suspense>
```

### 3. Error Boundaries

```tsx
import { ErrorBoundary } from "react-error-boundary";

<ErrorBoundary fallback={<ErrorPage />}>
  <Suspense fallback={<Loader />}>
    <LazyComponent />
  </Suspense>
</ErrorBoundary>
```

### 4. Preload критичных ресурсов

```tsx
// В index.html
<link rel="preload" href="/critical-font.woff2" as="font" />
<link rel="preconnect" href="https://api.example.com" />

// В коде
useEffect(() => {
  // Предзагрузка следующей страницы
  const nextPage = lazyWithPreload(() => import("./NextPage"));
  nextPage.preload();
}, []);
```

---

## 📈 Measuring Performance

### React DevTools Profiler

```tsx
import { Profiler } from "react";

function onRenderCallback(
  id, phase, actualDuration, baseDuration,
  startTime, commitTime
) {
  console.log(`${id} took ${actualDuration}ms`);
}

<Profiler id="Dashboard" onRender={onRenderCallback}>
  <Dashboard />
</Profiler>
```

### Bundle Analysis

```bash
# Анализ размера бандла
npm run build -- --stats

# Визуализация с webpack-bundle-analyzer
npm install -D webpack-bundle-analyzer
```

### Performance Metrics

```tsx
// Web Vitals
import { onCLS, onFID, onLCP } from 'web-vitals';

onCLS(console.log);
onFID(console.log);
onLCP(console.log);
```

---

## 🎯 Optimization Checklist

- [ ] Все роуты используют React.lazy()
- [ ] Suspense с понятными loading states
- [ ] Тяжелые компоненты lazy loaded
- [ ] Изображения с lazy loading
- [ ] Критичные ресурсы preloaded
- [ ] Bundle size < 200KB (gzipped) для initial load
- [ ] LCP < 2.5s
- [ ] Error boundaries для lazy компонентов

---

## 🚀 Advanced Techniques

### Dynamic Imports с условиями

```tsx
async function loadComponent(type: string) {
  if (type === 'chart') {
    return import('./ChartComponent');
  } else if (type === 'table') {
    return import('./TableComponent');
  }
}
```

### Prefetch для вероятных переходов

```tsx
function Navigation() {
  return (
    <nav>
      <Link
        to="/dashboard"
        onMouseEnter={() => {
          import("./pages/Dashboard"); // Prefetch
        }}
      >
        Dashboard
      </Link>
    </nav>
  );
}
```

### Progressive Enhancement

```tsx
// Базовая версия загружается сразу
import BasicChart from "./BasicChart";

// Расширенная версия lazy loaded
const AdvancedChart = lazy(() => import("./AdvancedChart"));

function Chart({ data, interactive = false }) {
  if (!interactive) {
    return <BasicChart data={data} />;
  }

  return (
    <Suspense fallback={<BasicChart data={data} />}>
      <AdvancedChart data={data} />
    </Suspense>
  );
}
```

---

## 📚 Resources

- [React Lazy Loading](https://react.dev/reference/react/lazy)
- [Code Splitting Guide](https://webpack.js.org/guides/code-splitting/)
- [Web Vitals](https://web.dev/vitals/)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
