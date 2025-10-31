import { useState, useEffect, useRef, useCallback } from 'react';

export const useSmartScroll = (messagesCount: number) => {
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollableElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollableElement) {
        scrollableElement.scrollTo({ 
          top: scrollableElement.scrollHeight, 
          behavior: 'smooth' 
        });
        setIsUserScrolling(false);
        setShowScrollButton(false);
      }
    }
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    
    setIsUserScrolling(!isAtBottom);
    setShowScrollButton(!isAtBottom);
  }, []);

  useEffect(() => {
    if (!isUserScrolling && scrollRef.current) {
      requestAnimationFrame(() => {
        const scrollableElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (scrollableElement) {
          scrollableElement.scrollTop = scrollableElement.scrollHeight;
        }
      });
    }
  }, [messagesCount, isUserScrolling]);

  return {
    scrollRef,
    isUserScrolling,
    showScrollButton,
    scrollToBottom,
    handleScroll
  };
};
