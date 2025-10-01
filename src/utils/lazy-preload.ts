import { ComponentType, lazy } from "react";

/**
 * Utility для создания lazy компонентов с возможностью preload
 */
interface LazyComponent<T extends ComponentType<any>> {
  (): Promise<{ default: T }>;
  preload: () => Promise<{ default: T }>;
}

/**
 * lazyWithPreload - создает lazy компонент с методом preload
 * Позволяет предзагрузить компонент перед его использованием
 * 
 * @example
 * const MyComponent = lazyWithPreload(() => import('./MyComponent'));
 * 
 * // Предзагрузка при hover
 * <button onMouseEnter={() => MyComponent.preload()}>
 *   Open
 * </button>
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyComponent<T> {
  let componentPromise: Promise<{ default: T }> | null = null;

  const load = () => {
    if (!componentPromise) {
      componentPromise = factory();
    }
    return componentPromise;
  };

  const LazyComponent = lazy(load) as any;
  LazyComponent.preload = load;

  return LazyComponent as LazyComponent<T>;
}

/**
 * Preload множественных компонентов
 */
export function preloadComponents(...components: LazyComponent<any>[]) {
  return Promise.all(components.map(component => component.preload()));
}

/**
 * Preload компонентов при idle браузера
 */
export function preloadOnIdle(...components: LazyComponent<any>[]) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => preloadComponents(...components));
  } else {
    // Fallback для браузеров без requestIdleCallback
    setTimeout(() => preloadComponents(...components), 1);
  }
}

/**
 * Preload компонентов при hover на элементе
 */
export function preloadOnHover(
  element: HTMLElement | null,
  ...components: LazyComponent<any>[]
) {
  if (!element) return;

  const handleMouseEnter = () => {
    preloadComponents(...components);
    // Удаляем слушатель после первой загрузки
    element.removeEventListener('mouseenter', handleMouseEnter);
  };

  element.addEventListener('mouseenter', handleMouseEnter);

  return () => {
    element.removeEventListener('mouseenter', handleMouseEnter);
  };
}
