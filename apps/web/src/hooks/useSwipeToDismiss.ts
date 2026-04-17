import { useRef, useCallback, type CSSProperties, type TouchEventHandler } from 'react';

interface SwipeToDismissOptions {
  onDismiss: () => void;
  threshold?: number;
}

interface SwipeToDismissResult {
  handlers: {
    onTouchStart: TouchEventHandler;
    onTouchMove: TouchEventHandler;
    onTouchEnd: TouchEventHandler;
  };
  style: CSSProperties;
}

export function useSwipeToDismiss({
  onDismiss,
  threshold = 80,
}: SwipeToDismissOptions): SwipeToDismissResult {
  const startY = useRef(0);
  const currentY = useRef(0);
  const swiping = useRef(false);
  const elementRef = useRef<HTMLElement | null>(null);

  const onTouchStart: TouchEventHandler = useCallback((e) => {
    const el = e.currentTarget as HTMLElement;
    elementRef.current = el;
    // Only allow swipe when scrolled to top
    if (el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
    swiping.current = true;
    el.style.transition = 'none';
  }, []);

  const onTouchMove: TouchEventHandler = useCallback((e) => {
    if (!swiping.current) return;
    const delta = e.touches[0].clientY - startY.current;
    // Only track downward swipes
    if (delta < 0) {
      currentY.current = 0;
      if (elementRef.current) {
        elementRef.current.style.transform = '';
      }
      return;
    }
    currentY.current = delta;
    if (elementRef.current) {
      elementRef.current.style.transform = `translateY(${delta}px)`;
    }
  }, []);

  const onTouchEnd: TouchEventHandler = useCallback(() => {
    if (!swiping.current) return;
    swiping.current = false;
    const el = elementRef.current;
    if (!el) return;

    if (currentY.current > threshold) {
      el.style.transition = 'transform 200ms ease-out';
      el.style.transform = 'translateY(100%)';
      setTimeout(onDismiss, 200);
    } else {
      el.style.transition = 'transform 200ms ease-out';
      el.style.transform = '';
    }
    currentY.current = 0;
  }, [onDismiss, threshold]);

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    style: {},
  };
}
