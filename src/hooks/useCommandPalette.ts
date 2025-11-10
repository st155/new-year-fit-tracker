/**
 * Command Palette Hook
 * Manages command palette state and shortcuts
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleCommand = (command: () => void) => {
    command();
    setOpen(false);
  };

  return {
    open,
    setOpen,
    handleCommand,
    navigate,
  };
}
