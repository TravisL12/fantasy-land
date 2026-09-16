export const CHAT_COPY = {
  heading: 'Ask about your team',
  subheading:
    'A local model with live Sleeper data. It calls tools to look things up — expand any call to see exactly what it fetched.',
  placeholder: 'Ask about a matchup, a waiver target, or a start/sit call…',
  send: 'Send',
  stop: 'Stop',
  empty: 'Ask a question to get started.',
  thinkingLabel: 'Reasoning',
  emptyAnswer: 'No answer — see the tool calls above.',
} as const;

export const SUGGESTIONS = [
  'What NFL week is it?',
  'Who are the top trending adds right now?',
  'Compare Bijan Robinson and Jahmyr Gibbs.',
  'My Sleeper username is …, show my leagues.',
] as const;

export const TOOL_STATUSES = {
  running: 'running',
  ok: 'ok',
  error: 'error',
} as const;

export const SUBMIT_KEY = 'Enter';
