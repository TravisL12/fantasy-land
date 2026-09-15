export const PAGINATION_COPY = {
  previous: '← Previous',
  next: 'Next →',
  range: (from: number, to: number, total: number) =>
    `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} players`,
} as const;
