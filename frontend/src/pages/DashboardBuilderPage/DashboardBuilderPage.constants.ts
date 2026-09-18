export const BUILDER_COPY = {
  placeholder: 'e.g. a table of the top 30 MLB hitters this season with HR, AVG and points…',
  examples: 'See an example',
  saving: 'Saving…',
  empty: 'Nothing built yet. Ask for a table of players and it will appear here.',
  loading: 'Loading dashboard…',
  missing: 'That dashboard could not be found.',
} as const;

/** The two jobs this page does: build one from nothing, or refine a saved one. */
export const BUILDER_MODES = {
  create: {
    heading: 'Create a dashboard',
    subheading:
      'Describe the view you want. The model looks the data up, designs the widgets, and the result appears on the right — sort it, tick rows, then save it.',
    back: 'Dashboards',
    save: 'Save dashboard',
  },
  edit: {
    heading: 'Edit dashboard',
    subheading:
      'Ask for the change you want. The model works from the dashboard on the right and rebuilds it — saving overwrites the original.',
    back: 'Dashboard',
    save: 'Save changes',
  },
} as const;

export const SUGGESTIONS = [
  'Top 25 NFL running backs this season, with a compare panel.',
  'MLB hitters ranked by home runs, showing AVG, OPS and points.',
  "Josh Allen's game log this season with passing yards and points.",
] as const;

/** Edits are phrased against what is already on screen, so they read differently. */
export const EDIT_SUGGESTIONS = [
  'Add a bar chart of fantasy points.',
  'Show only the top 10 rows.',
  'Add a column for points per game.',
] as const;

/** Each request is kept on its own line, so the saved prompt reads as a history. */
export const PROMPT_SEPARATOR = '\n\n';
