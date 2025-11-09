import { useEffect, useRef } from 'react';

interface ScreenReaderAnnouncementProps {
  message: string;
  politeness?: 'polite' | 'assertive';
}

/**
 * Screen reader announcement component for accessibility
 * Announces dynamic content changes to screen reader users
 */
export function ScreenReaderAnnouncement({ 
  message, 
  politeness = 'polite' 
}: ScreenReaderAnnouncementProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && ref.current) {
      // Force screen reader to re-read by clearing and setting
      ref.current.textContent = '';
      setTimeout(() => {
        if (ref.current) {
          ref.current.textContent = message;
        }
      }, 100);
    }
  }, [message]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    />
  );
}
