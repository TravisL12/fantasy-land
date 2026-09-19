export const theme = {
  colors: {
    background: '#0f1117',
    surface: '#181b24',
    surfaceHover: '#1f2330',
    border: '#2a2f3d',
    text: '#e6e8ee',
    textMuted: '#9aa1b2',
    primary: '#7c5cff',
    primaryHover: '#6a48f5',
    onPrimary: '#ffffff',
    success: '#3ecf8e',
    danger: '#ef5b5b',
    /**
     * Chart series, assigned in this fixed order and never cycled. These are the
     * dark steps of the reference categorical palette, validated against our
     * surface (#181b24): every adjacent pair clears the CVD and normal-vision
     * gates. Only the first three clear those gates for *every* pair, so charts
     * cap at four series and always carry a legend plus direct labels.
     */
    series: [
      '#3987e5',
      '#d95926',
      '#199e70',
      '#c98500',
      '#d55181',
      '#008300',
      '#9085e9',
      '#e66767',
    ],
    /** Reserved for state — never reused as a series color. */
    status: {
      good: '#0ca30c',
      warning: '#fab219',
      serious: '#ec835a',
      critical: '#d03b3b',
      neutral: '#9aa1b2',
    },
    /** Recessive chart chrome: gridlines and axis rules, one step off surface. */
    grid: '#2a2f3d',
  },
  spacing: (n: number) => `${n * 4}px`,
  radii: { sm: '4px', md: '8px', lg: '12px' },
  fonts: {
    body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, 'SF Mono', Menlo, monospace",
  },
} as const;

export type Theme = typeof theme;

/** The state palette's keys. Anything that colors by status picks one of these. */
export type StatusTone = keyof Theme['colors']['status'];
