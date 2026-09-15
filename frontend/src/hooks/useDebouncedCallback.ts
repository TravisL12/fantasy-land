import { useCallback, useEffect, useRef } from 'react';

/** Delays calls until `delayMs` passes without another call; pending calls are dropped on unmount. */
export const useDebouncedCallback = <TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delayMs: number,
) => {
  const callbackRef = useRef(callback);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  return useCallback(
    (...args: TArgs) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => callbackRef.current(...args), delayMs);
    },
    [delayMs],
  );
};
