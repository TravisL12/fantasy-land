export const DASHBOARDS_COPY = {
  heading: 'Dashboards',
  subheading:
    'Views you asked for in plain English. Each one stores the questions, not the answers, so it re-fetches every time you open it.',
  create: 'New dashboard',
  examples: 'See an example',
  loading: 'Loading your dashboards…',
  empty: 'No dashboards yet. Describe the view you want and one gets built for you.',
  updated: (date: string) => `Updated ${date}`,
  open: 'Open',
  remove: 'Delete',
  confirmRemove: (title: string) => `Delete "${title}"?`,
} as const;

export const CARD_MIN_WIDTH = '280px';
