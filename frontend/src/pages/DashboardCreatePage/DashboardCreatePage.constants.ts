export const CREATE_COPY = {
  heading: 'Create a dashboard',
  subheading:
    'Describe the view you want. The model looks the data up, designs the widgets, and the result appears on the right — sort it, tick rows, then save it.',
  placeholder: 'e.g. a table of the top 30 MLB hitters this season with HR, AVG and points…',
  back: 'Dashboards',
  save: 'Save dashboard',
  saving: 'Saving…',
  preview: 'Preview',
  empty: 'Nothing built yet. Ask for a table of players and it will appear here.',
} as const;

export const SUGGESTIONS = [
  'Top 25 NFL running backs this season, with a compare panel.',
  'MLB hitters ranked by home runs, showing AVG, OPS and points.',
  "Josh Allen's game log this season with passing yards and points.",
] as const;
