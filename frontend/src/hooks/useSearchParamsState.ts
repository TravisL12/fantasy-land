import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

type ParamValue = string | number | null | undefined;

/** URL query params as page state, so filtered views can be bookmarked and shared. */
export const useSearchParamsState = () => {
  const [params, setParams] = useSearchParams();

  const update = useCallback(
    (changes: Record<string, ParamValue>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === undefined || value === '')
              next.delete(key);
            else next.set(key, String(value));
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  return { params, update };
};
