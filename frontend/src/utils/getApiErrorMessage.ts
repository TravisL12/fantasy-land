import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

interface ApiErrorBody {
  error?: { message?: string | string[] } | string;
}

/** Pulls a human-readable message out of the backend's HttpExceptionFilter shape. */
export const getApiErrorMessage = (
  error: FetchBaseQueryError | SerializedError | undefined,
): string | undefined => {
  if (!error) return undefined;
  if (!('status' in error)) return error.message ?? DEFAULT_ERROR_MESSAGE;

  const body = error.data as ApiErrorBody | undefined;
  const payload = body?.error;
  const message = typeof payload === 'string' ? payload : payload?.message;
  const first = Array.isArray(message) ? message[0] : message;
  return first ?? DEFAULT_ERROR_MESSAGE;
};
