/**
 * Keyboard Shortcuts Hook
 * Global keyboard shortcuts management
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;
      const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        e.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

// Pre-defined shortcuts
export const COMMON_SHORTCUTS = {
  COMMAND_PALETTE: { key: 'k', ctrl: true, description: 'Open command palette' },
  SEARCH: { key: '/', description: 'Focus search' },
  ESCAPE: { key: 'Escape', description: 'Close modal/dialog' },
  SAVE: { key: 's', ctrl: true, description: 'Save' },
  NEW: { key: 'n', ctrl: true, description: 'Create new' },
} as const;
