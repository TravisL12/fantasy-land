import { useEffect, useRef, useState } from 'react';

/**
 * Plot renders to a fixed pixel width, so the figure has to be measured. Falls
 * back to a sensible width where ResizeObserver is missing (jsdom, older
 * browsers) rather than rendering nothing.
 */
export const useElementWidth = (fallback: number) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      const measured = entry?.contentRect.width ?? 0;
      if (measured > 0) setWidth(measured);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
};
