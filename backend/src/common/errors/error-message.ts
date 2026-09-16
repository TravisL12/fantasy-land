import { HttpException } from '@nestjs/common';

/**
 * Nest's HTTP exceptions carry the useful detail in their response body —
 * "Unknown stat group" is worth telling the model so it can correct itself.
 */
export const toErrorMessage = (error: unknown): string => {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    const message =
      typeof response === 'object' && response !== null
        ? (response as { message?: string | string[] }).message
        : response;
    return String(
      Array.isArray(message) ? message.join('; ') : (message ?? error.message),
    );
  }
  return error instanceof Error ? error.message : String(error);
};
