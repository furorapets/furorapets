'use client';

import { useEffect } from 'react';

/**
 * Robust scroll lock hook that disables scrolling on <body>, <html>, and <main>
 * when a modal, drawer, or popup is open. Restores previous overflow styles on cleanup.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked || typeof window === 'undefined') return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyPaddingRight = document.body.style.paddingRight;

    // Measure scrollbar width to prevent visual layout jump when scrollbar disappears
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.classList.add('modal-open');

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.paddingRight = originalBodyPaddingRight;
      document.body.classList.remove('modal-open');
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
