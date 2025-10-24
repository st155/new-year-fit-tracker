# Error Handling и Error Boundaries

Этот документ описывает систему обработки ошибок в проекте.

## Содержание

1. [Error Boundaries](#error-boundaries)
2. [Error Logging](#error-logging)
3. [Async Error Boundary](#async-error-boundary)
4. [Best Practices](#best-practices)
5. [Примеры использования](#примеры-использования)

---

## Error Boundaries

### ErrorBoundary Component

Главный компонент для перехвата ошибок React:

```tsx
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Возможности

- **Автоматический перехват ошибок** - ловит все ошибки в дочерних компонентах
- **Логирование** - автоматически отправляет ошибки в базу данных
- **Fallback UI** - показывает красивый экран ошибки
- **Сброс состояния** - позволяет пользователю восстановить работу
- **Reset Keys** - автоматический сброс при изменении ключей

### Props

```tsx
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;              // Кастомный UI ошибки
  onError?: (error, errorInfo) => void; // Кастомный обработчик
  resetKeys?: Array<string | number>;   // Ключи для автосброса
}
```

### Пример с кастомным fallback

```tsx
<ErrorBoundary
  fallback={
    <div className="p-6 text-center">
      <h2>Что-то пошло не так</h2>
      <button onClick={() => window.location.reload()}>
        Перезагрузить
      </button>
    </div>
  }
>
  <MyComponent />
</ErrorBoundary>
```

### Пример с resetKeys

```tsx
function UserProfile({ userId }) {
  return (
    <ErrorBoundary resetKeys={[userId]}>
      <ProfileDetails userId={userId} />
    </ErrorBoundary>
  );
}
```

Когда `userId` изменится, ErrorBoundary автоматически сбросит состояние ошибки.

---

## Error Fallback UI

### ErrorFallback Component

Красивый экран ошибки с несколькими вариантами действий:

```tsx
import { ErrorFallback } from "@/components/error/ErrorFallback";

// Используется автоматически в ErrorBoundary
<ErrorFallback
  error={error}
  errorInfo={errorInfo}
  resetError={resetFunction}
/>
```

### Возможности

- **Перезагрузка страницы** - кнопка для reload
- **Возврат на главную** - навигация на главную страницу
- **Детали ошибки** - collapsible блок с stack trace (только в dev mode)
- **Анимации** - плавное появление и bounce эффекты
- **Адаптивность** - работает на всех экранах

### MiniErrorFallback

Компактная версия для небольших компонентов:

```tsx
import { MiniErrorFallback } from "@/components/error/ErrorFallback";

<MiniErrorFallback
  error={error}
  resetError={() => window.location.reload()}
/>
```

**Где использовать:**
- Небольшие секции страницы
- Виджеты и карточки
- Встроенные компоненты

---

## Async Error Boundary

### AsyncErrorBoundary Component

Комбинирует `ErrorBoundary` и `Suspense` для обработки асинхронных компонентов:

```tsx
import { AsyncErrorBoundary } from "@/components/error/AsyncErrorBoundary";

<AsyncErrorBoundary
  fallback={<LoadingSpinner />}
  errorFallback={<CustomErrorUI />}
>
  <LazyComponent />
</AsyncErrorBoundary>
```

### Props

```tsx
interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;         // Loading fallback (для Suspense)
  errorFallback?: ReactNode;    // Error fallback (для ErrorBoundary)
  onError?: (error, errorInfo) => void;
}
```

### Пример с lazy loaded компонентом

```tsx
const HeavyChart = lazy(() => import("./HeavyChart"));

function Dashboard() {
  return (
    <AsyncErrorBoundary
      fallback={<ChartSkeleton />}
      errorFallback={<MiniErrorFallback error={null} resetError={() => {}} />}
    >
      <HeavyChart data={data} />
    </AsyncErrorBoundary>
  );
}
```

### MiniAsyncErrorBoundary

Минимальная версия для компактных случаев:

```tsx
import { MiniAsyncErrorBoundary } from "@/components/error/AsyncErrorBoundary";

<MiniAsyncErrorBoundary fallback={<div>Загрузка...</div>}>
  <LazyWidget />
</MiniAsyncErrorBoundary>
```

---

## Error Logging

### ErrorLogger Class

Централизованная система логирования ошибок:

```tsx
import { ErrorLogger } from "@/lib/error-logger";

// Базовое логирование
await ErrorLogger.logError({
  errorType: 'api_error',
  errorMessage: 'Failed to fetch data',
  errorDetails: { endpoint: '/api/users' },
  source: 'api',
  stackTrace: error.stack,
});
```

### Специализированные методы

#### UI Errors

```tsx
await ErrorLogger.logUIError(
  'Component render failed',
  'UserProfile' // component name
);
```

#### API Errors

```tsx
await ErrorLogger.logAPIError(
  'Request failed',
  '/api/users',        // endpoint
  { status: 500, ... } // response data
);
```

#### File Upload Errors

```tsx
await ErrorLogger.logFileUploadError(
  'Upload failed',
  {
    fileName: 'image.jpg',
    fileSize: 2048000,
    fileType: 'image/jpeg'
  }
);
```

#### Integration Errors (Terra, Apple Health, etc.)

```tsx
await ErrorLogger.logTerraError(
  'Token refresh failed',
  { provider: 'WHOOP', tokenExpiry: '2024-01-01' }
);

await ErrorLogger.logAppleHealthError(
  'Data parsing failed',
  { recordType: 'HKQuantityTypeIdentifierStepCount' }
);
```

### Глобальный обработчик ошибок

ErrorLogger автоматически устанавливает глобальные обработчики:

```tsx
// Автоматически инициализируется при импорте
import { ErrorLogger } from "@/lib/error-logger";

// Ловит:
// - Необработанные JavaScript ошибки (window.onerror)
// - Необработанные promise rejections (unhandledrejection)
// - Сетевые события (online/offline)
```

### Ручная инициализация (опционально)

```tsx
ErrorLogger.initGlobalErrorHandler();
```

---

## HOC для Error Boundary

### withErrorBoundary

Higher-Order Component для оборачивания компонентов:

```tsx
import { withErrorBoundary } from "@/components/error/ErrorBoundary";

const MyComponent = ({ data }) => {
  return <div>{data.value}</div>;
};

// Оборачиваем в Error Boundary
export default withErrorBoundary(MyComponent, {
  fallback: <MiniErrorFallback error={null} resetError={() => {}} />,
  onError: (error, errorInfo) => {
    console.log('Custom error handler:', error);
  }
});
```

### Пример с несколькими HOC

```tsx
import { withErrorBoundary } from "@/components/error/ErrorBoundary";
import { memo } from "react";

const ExpensiveComponent = memo(({ data }) => {
  // Heavy computation
  return <div>{data}</div>;
});

// Combine HOCs
export default withErrorBoundary(
  ExpensiveComponent,
  {
    onError: (error) => analytics.track('component_error', { error })
  }
);
```

---

## Best Practices

### 1. Гранулярность Error Boundaries

```tsx
// ✅ Правильно - каждая секция имеет свой boundary
function Dashboard() {
  return (
    <div>
      <ErrorBoundary fallback={<MiniErrorFallback />}>
        <Header />
      </ErrorBoundary>
      
      <ErrorBoundary fallback={<MiniErrorFallback />}>
        <MainContent />
      </ErrorBoundary>
      
      <ErrorBoundary fallback={<MiniErrorFallback />}>
        <Sidebar />
      </ErrorBoundary>
    </div>
  );
}

// ❌ Неправильно - одна ошибка рушит весь экран
function Dashboard() {
  return (
    <ErrorBoundary>
      <Header />
      <MainContent />
      <Sidebar />
    </ErrorBoundary>
  );
}
```

### 2. Использование с lazy loading

```tsx
// ✅ Правильно - объединяем ErrorBoundary и Suspense
<AsyncErrorBoundary fallback={<Skeleton />}>
  <LazyComponent />
</AsyncErrorBoundary>

// ❌ Неправильно - отдельно Suspense без ErrorBoundary
<Suspense fallback={<Skeleton />}>
  <LazyComponent /> {/* Ошибки не обработаны */}
</Suspense>
```

### 3. Логирование ошибок

```tsx
// ✅ Правильно - логируем с контекстом
<ErrorBoundary
  onError={(error, errorInfo) => {
    ErrorLogger.logError({
      errorType: 'component_error',
      errorMessage: error.message,
      errorDetails: {
        componentStack: errorInfo.componentStack,
        userAction: 'viewing_dashboard'
      },
      source: 'ui',
      stackTrace: error.stack
    });
  }}
>
  <Dashboard />
</ErrorBoundary>

// ❌ Неправильно - просто console.log
<ErrorBoundary onError={(error) => console.log(error)}>
  <Dashboard />
</ErrorBoundary>
```

### 4. Reset Keys

```tsx
// ✅ Правильно - сбрасываем при изменении критических props
<ErrorBoundary resetKeys={[userId, challengeId]}>
  <UserChallenge userId={userId} challengeId={challengeId} />
</ErrorBoundary>

// ❌ Неправильно - не сбрасываем, old error state persists
<ErrorBoundary>
  <UserChallenge userId={userId} challengeId={challengeId} />
</ErrorBoundary>
```

### 5. Fallback UI адаптация

```tsx
// ✅ Правильно - разные fallback для разных контекстов
function App() {
  return (
    <>
      {/* Критическая страница - полный экран */}
      <ErrorBoundary fallback={<ErrorFallback />}>
        <MainApp />
      </ErrorBoundary>
      
      {/* Виджет - компактный fallback */}
      <ErrorBoundary fallback={<MiniErrorFallback />}>
        <WeatherWidget />
      </ErrorBoundary>
    </>
  );
}
```

---

## Примеры использования

### Полная страница

```tsx
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
```

### Секция страницы

```tsx
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { MiniErrorFallback } from "@/components/error/ErrorFallback";

function Dashboard() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ErrorBoundary fallback={<MiniErrorFallback />}>
        <MetricsCard />
      </ErrorBoundary>
      
      <ErrorBoundary fallback={<MiniErrorFallback />}>
        <GoalsCard />
      </ErrorBoundary>
    </div>
  );
}
```

### Lazy loaded компонент

```tsx
import { AsyncErrorBoundary } from "@/components/error/AsyncErrorBoundary";
import { lazy } from "react";

const HeavyChart = lazy(() => import("./HeavyChart"));

function Analytics() {
  return (
    <AsyncErrorBoundary
      fallback={<ChartSkeleton />}
      onError={(error) => console.error('Chart failed:', error)}
    >
      <HeavyChart data={data} />
    </AsyncErrorBoundary>
  );
}
```

### С кастомной обработкой

```tsx
function UserProfile({ userId }) {
  const handleError = (error, errorInfo) => {
    // Send to analytics
    analytics.track('profile_error', {
      userId,
      error: error.message,
      component: errorInfo.componentStack
    });
    
    // Log to database
    ErrorLogger.logUIError(error.message, 'UserProfile', userId);
  };

  return (
    <ErrorBoundary
      resetKeys={[userId]}
      onError={handleError}
    >
      <ProfileDetails userId={userId} />
    </ErrorBoundary>
  );
}
```

### Множественные boundaries

```tsx
function ComplexPage() {
  return (
    <ErrorBoundary> {/* Top-level boundary */}
      <Header />
      
      <main className="grid grid-cols-3 gap-4">
        <ErrorBoundary fallback={<MiniErrorFallback />}>
          <Sidebar />
        </ErrorBoundary>
        
        <div className="col-span-2 space-y-4">
          <ErrorBoundary fallback={<MiniErrorFallback />}>
            <MainContent />
          </ErrorBoundary>
          
          <ErrorBoundary fallback={<MiniErrorFallback />}>
            <CommentsSection />
          </ErrorBoundary>
        </div>
      </main>
    </ErrorBoundary>
  );
}
```

---

## Интеграция с приложением

### App.tsx

Главный Error Boundary оборачивает все приложение:

```tsx
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider>
        <RouterProvider>
          <YourApp />
        </RouterProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

### В существующих страницах

✅ **Feed** - готов, использует AsyncErrorBoundary
✅ **Dashboard** - готов, top-level ErrorBoundary
✅ **Progress** - готов, можно добавить per-section boundaries
✅ **Challenges** - готов, можно добавить per-card boundaries

---

## Связанные компоненты

- `src/components/error/ErrorBoundary.tsx` - главный Error Boundary
- `src/components/error/ErrorFallback.tsx` - UI для ошибок
- `src/components/error/AsyncErrorBoundary.tsx` - для async компонентов
- `src/lib/error-logger.ts` - система логирования
- `src/components/ui/error-logs-viewer.tsx` - просмотр логов

## Связанные документы

- **LOADING_STATES.md** - skeleton screens и loading states
- **PERFORMANCE_OPTIMIZATION.md** - lazy loading и code splitting
- **MICRO_INTERACTIONS.md** - анимации для error states
