import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 72; // px of pull needed to trigger
const MAX_PULL = THRESHOLD + 24;

function isScrolledToTop(target: EventTarget | null): boolean {
  let node = target as HTMLElement | null;
  while (node && node !== document.documentElement) {
    if (node.scrollTop > 2) return false;
    node = node.parentElement;
  }
  return true;
}

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef(0);
  const startX = useRef(0);
  const currentY = useRef(0);
  const active = useRef(false);
  const refreshing$ = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      active.current = false;
      currentY.current = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (refreshing$.current) return;
      const dy = e.touches[0].clientY - startY.current;
      const dx = e.touches[0].clientX - startX.current;

      // Ignore horizontal-dominant gestures
      if (Math.abs(dx) > Math.abs(dy) + 4) return;
      // Ignore upward drags
      if (dy <= 0) { active.current = false; currentY.current = 0; setPullY(0); return; }
      // Only trigger when the touched element's scroll container is at the top
      if (!isScrolledToTop(e.target)) return;

      active.current = true;
      currentY.current = Math.min(dy, MAX_PULL);
      setPullY(currentY.current);
    };

    const onTouchEnd = async () => {
      if (!active.current || refreshing$.current) return;
      active.current = false;
      const pulled = currentY.current;
      currentY.current = 0;
      setPullY(0);

      if (pulled >= THRESHOLD) {
        refreshing$.current = true;
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          refreshing$.current = false;
          setRefreshing(false);
        }
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh]);

  return { pullY, refreshing, progress: Math.min(pullY / THRESHOLD, 1) };
}
