export type ThemeMode = 'dark' | 'light'

export interface ThemeTokens {
  /** Background color */
  bg: string
  /** Primary accent */
  primary: string
  /** Primary accent, dimmed variant */
  primaryDim: string
  /** Primary accent, dark variant */
  primaryDark: string
  /** Secondary accent */
  secondary: string
  /** Negative / loss accent */
  negative: string
  /** Negative / loss accent, dimmed variant (badge backgrounds) */
  negativeDim: string
  /** Secondary accent, dimmed variant */
  secondaryDim: string
  /** Text color for content sitting on `secondaryDim` (container/on-container pair) */
  secondaryDimText: string
  /** Text color for content sitting on `primaryDim` (container/on-container pair) */
  primaryDimText: string
  /** Text/icon color on full-strength `primary` fills (on-accent pair) */
  onPrimary: string
  /** Text/icon color on full-strength `secondary` fills (on-accent pair) */
  onSecondary: string
  /** Text color for content sitting on `negativeDim` (container/on-container pair) */
  negativeDimText: string
  /** Surface/card background */
  surface: string
  /** Surface highlight (borders, subtle backgrounds) */
  surfaceHighlight: string
  /** Main text color */
  text: string
  /** Secondary text color */
  textSecondary: string
  /** Muted/tertiary text */
  textMuted: string
  /** Border color */
  border: string
  /** RefreshControl tint color */
  refreshTint: string
  /** StatusBar style for expo-status-bar */
  statusBar: 'light' | 'dark'
}

export const themeTokens = {
  dark: {
    bg: '#050505',
    primary: '#8FA893',
    primaryDim: '#2a332c',
    primaryDark: '#3e4f43',
    secondary: '#d4955f',
    secondaryDim: '#332619',
    secondaryDimText: '#d4955f',
    primaryDimText: '#8FA893',
    onPrimary: '#050505',
    onSecondary: '#1a1a1a',
    negative: '#c97064',
    // Pairing note: use negativeDimText (not negative) for copy on negativeDim —
    // raw negative on negativeDim is 4.18:1, below AA for small text.
    negativeDim: '#3a2222',
    negativeDimText: '#d4897e',
    surface: '#151515',
    surfaceHighlight: '#252525',
    text: '#ffffff',
    textSecondary: '#aaaaaa',
    textMuted: '#909090',
    border: '#333333',
    refreshTint: '#8FA893',
    statusBar: 'light',
  },
  light: {
    bg: '#f5f5f5',
    primary: '#5a7a60',
    primaryDim: '#dce8de',
    primaryDark: '#a3c4a8',
    secondary: '#a5652f',
    secondaryDim: '#f5e6d5',
    secondaryDimText: '#7d4a20',
    primaryDimText: '#3e5a45',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    negative: '#b55044',
    negativeDim: '#f5ddd8',
    negativeDimText: '#8a3d33',
    surface: '#ffffff',
    surfaceHighlight: '#eeeeee',
    text: '#1a1a1a',
    textSecondary: '#666666',
    textMuted: '#737373',
    border: '#e0e0e0',
    refreshTint: '#5a7a60',
    statusBar: 'dark',
  },
} as const satisfies Record<ThemeMode, ThemeTokens>
