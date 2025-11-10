/**
 * Accessibility Utilities
 * Helper functions for keyboard navigation, focus management, and screen readers
 */

import { RefObject, useEffect } from 'react';

// ============= KEYBOARD NAVIGATION =============

export type KeyboardHandler = (e: KeyboardEvent) => void;

interface KeyboardHandlers {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: () => void;
  onShiftTab?: () => void;
  onSpace?: () => void;
}

export const handleKeyboardNav = (e: KeyboardEvent, handlers: KeyboardHandlers): void => {
  switch (e.key) {
    case 'Enter':
      handlers.onEnter?.();
      break;
    case 'Escape':
      handlers.onEscape?.();
      break;
    case 'ArrowUp':
      e.preventDefault();
      handlers.onArrowUp?.();
      break;
    case 'ArrowDown':
      e.preventDefault();
      handlers.onArrowDown?.();
      break;
    case 'ArrowLeft':
      handlers.onArrowLeft?.();
      break;
    case 'ArrowRight':
      handlers.onArrowRight?.();
      break;
    case 'Tab':
      if (e.shiftKey) {
        handlers.onShiftTab?.();
      } else {
        handlers.onTab?.();
      }
      break;
    case ' ':
      e.preventDefault();
      handlers.onSpace?.();
      break;
  }
};

// ============= SCREEN READER ANNOUNCEMENTS =============

let announceElement: HTMLDivElement | null = null;

const getAnnounceElement = (): HTMLDivElement => {
  if (!announceElement) {
    announceElement = document.createElement('div');
    announceElement.setAttribute('role', 'status');
    announceElement.setAttribute('aria-live', 'polite');
    announceElement.setAttribute('aria-atomic', 'true');
    announceElement.style.position = 'absolute';
    announceElement.style.left = '-10000px';
    announceElement.style.width = '1px';
    announceElement.style.height = '1px';
    announceElement.style.overflow = 'hidden';
    document.body.appendChild(announceElement);
  }
  return announceElement;
};

export const announceToScreenReader = (
  message: string, 
  priority: 'polite' | 'assertive' = 'polite'
): void => {
  const element = getAnnounceElement();
  element.setAttribute('aria-live', priority);
  
  // Clear previous message
  element.textContent = '';
  
  // Set new message after a brief delay to ensure screen readers pick it up
  setTimeout(() => {
    element.textContent = message;
  }, 100);
};

// ============= FOCUS MANAGEMENT =============

export const trapFocus = (containerRef: RefObject<HTMLElement>): (() => void) => {
  if (!containerRef.current) return () => {};

  const container = containerRef.current;
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey as EventListener);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey as EventListener);
  };
};

export const restoreFocus = (previousElement: HTMLElement | null): void => {
  if (previousElement && document.body.contains(previousElement)) {
    previousElement.focus();
  }
};

// ============= FOCUS UTILITIES =============

export const saveFocus = (): HTMLElement | null => {
  return document.activeElement as HTMLElement;
};

export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const elements = container.querySelectorAll<HTMLElement>(
    'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(elements);
};

// ============= ARIA UTILITIES =============

export const generateAriaLabel = (
  label: string,
  value?: string | number,
  unit?: string
): string => {
  if (!value) return label;
  if (!unit) return `${label}: ${value}`;
  return `${label}: ${value} ${unit}`;
};

export const generateAriaDescription = (parts: (string | undefined)[]): string => {
  return parts.filter(Boolean).join('. ');
};

// ============= HOOK FOR ESCAPE KEY =============

export const useEscapeKey = (callback: () => void): void => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [callback]);
};
