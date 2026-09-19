/** What the toolbar offers and what the table shows, for one sport's schedule. */
export interface ScheduleView {
  season: string | undefined;
  week: string;
  startDate: string | undefined;
  endDate: string | undefined;
  /** The weeks this sport indexes games by, or null where dates are the index. */
  weeks: number[] | null;
  /** Dates and weeks filter each other, so the date range hides behind a week. */
  showDates: boolean;
  /** Whether any game in the window has an announced starter to show. */
  hasStarters: boolean;
}
