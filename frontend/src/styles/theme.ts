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
  },
  spacing: (n: number) => `${n * 4}px`,
  radii: { sm: '4px', md: '8px', lg: '12px' },
  fonts: {
    body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, 'SF Mono', Menlo, monospace",
  },
} as const;

export type Theme = typeof theme;
