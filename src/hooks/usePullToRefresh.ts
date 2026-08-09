import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 130;
const MAX_PULL = THRESHOLD + 24;

function scrolledFromTop(target: EventTarget | null): number {
  let node = target as HTMLElement | null;
  while (node && node !== document.documentElement) {
    if (node.scrollTop > 2) return node.scrollTop;
    node = node.parentElement;
  }
  return 0;
}

export function usePullToRefresh(
  onRefresh: () => Promise<void> | void,
  enabled: boolean,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef(0);
  const startX = useRef(0);
  const currentPull = useRef(0);
  const active = useRef(false);
  const busy = useRef(false);
  const enabledRef = useRef(enabled);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  useEffect(() => {
    // SVG arc constants — match the JSX values exactly
    const R = 11.5;
    const CIRC = 2 * Math.PI * R;

    // Direct DOM update — no React state, no re-renders
    const applyPull = (pull: number) => {
      const el = wrapRef.current;
      const circle = circleRef.current;
      if (!el) return;
      if (pull <= 0) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(0px)';
        if (circle) circle.style.strokeDashoffset = String(CIRC);
        return;
      }
      const progress = Math.min(pull / THRESHOLD, 1);
      el.style.opacity = String(Math.min(progress * 1.8, 1));
      el.style.transform = `translateY(${Math.min(pull * 0.65, 52)}px)`;
      if (circle) circle.style.strokeDashoffset = String(CIRC * (1 - progress * 0.8));
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!enabledRef.current || busy.current) return;
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      active.current = false;
      currentPull.current = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!enabledRef.current || busy.current) return;
      const dy = e.touches[0].clientY - startY.current;
      const dx = e.touches[0].clientX - startX.current;
      // Ignore horizontal-dominant gestures
      if (Math.abs(dx) > Math.abs(dy) + 8) return;
      // Ignore upward drags
      if (dy <= 0) { active.current = false; currentPull.current = 0; applyPull(0); return; }
      // Only fire when the page is actually at the top
      if (scrolledFromTop(e.target) > 0) return;
      active.current = true;
      currentPull.current = Math.min(dy, MAX_PULL);
      applyPull(currentPull.current);
    };

    const onTouchEnd = async () => {
      if (!active.current || busy.current) return;
      active.current = false;
      const pulled = currentPull.current;
      currentPull.current = 0;
      applyPull(0);
      if (pulled < THRESHOLD) return;
      busy.current = true;
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        busy.current = false;
        setRefreshing(false);
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

  return { wrapRef, circleRef, refreshing };
}
