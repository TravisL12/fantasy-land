/** Model output is untrusted, so links never get to reach back into the app. */
export const LINK_PROPS = {
  target: '_blank',
  rel: 'noopener noreferrer nofollow',
} as const;
