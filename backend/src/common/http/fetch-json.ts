import { BadGatewayException, HttpStatus } from '@nestjs/common';

export const EXTERNAL_REQUEST_TIMEOUT_MS = 30_000;

const request = async (url: string) => {
  try {
    return await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(EXTERNAL_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new BadGatewayException(
      `Upstream request failed: ${new URL(url).host}`,
      {
        cause: error,
      },
    );
  }
};

const parse = async <T>(url: string, response: Response): Promise<T> => {
  if (!response.ok) {
    throw new BadGatewayException(
      `Upstream ${new URL(url).host} responded ${response.status}`,
    );
  }
  return (await response.json()) as T;
};

/** GETs JSON from a third-party API, turning network/HTTP failures into a 502. */
export const fetchJson = async <T>(url: string): Promise<T> =>
  parse<T>(url, await request(url));

/** Like fetchJson, but an upstream 404 resolves to null. */
export const fetchJsonOrNull = async <T>(url: string): Promise<T | null> => {
  const response = await request(url);
  return response.status === HttpStatus.NOT_FOUND
    ? null
    : parse<T>(url, response);
};
