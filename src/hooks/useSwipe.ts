import { useState, useCallback } from 'react';
import { Direction } from './types';

export const useSwipe = (onSwipe: (direction: Direction) => void) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const dx = touchEnd.x - touchStart.x;
    const dy = touchEnd.y - touchStart.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < 20 && absY < 20) return; // Ignore small movements

    let direction: Direction = null;

    if (absY > absX) {
      if (dy < 0) {
        // Upward
        if (dx < -30) direction = 'top-left';
        else if (dx > 30) direction = 'top-right';
        else direction = 'center';
      } else {
        // Downward is usually center/low
        direction = 'center';
      }
    } else {
      if (dx < 0) direction = 'left';
      else direction = 'right';
    }

    onSwipe(direction);
    setTouchStart(null);
  }, [touchStart, onSwipe]);

  return { onTouchStart, onTouchEnd };
};
