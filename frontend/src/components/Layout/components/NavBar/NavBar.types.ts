export interface NavLinkItem {
  label: string;
  to: string;
  /** Only active on an exact match (otherwise nested routes also highlight it). */
  end?: boolean;
}
