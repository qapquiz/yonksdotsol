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
  /** Secondary accent, dimmed variant */
  secondaryDim: string
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

export const themeTokens: Record<ThemeMode, ThemeTokens> = {
  dark: {
    bg: '#050505',
    primary: '#8FA893',
    primaryDim: '#2a332c',
    primaryDark: '#3e4f43',
    secondary: '#d4955f',
    secondaryDim: '#332619',
    surface: '#151515',
    surfaceHighlight: '#252525',
    text: '#ffffff',
    textSecondary: '#aaaaaa',
    textMuted: '#777777',
    border: '#333333',
    refreshTint: '#8FA893',
    statusBar: 'light',
  },
  light: {
    bg: '#f5f5f5',
    primary: '#6b8f71',
    primaryDim: '#dce8de',
    primaryDark: '#a3c4a8',
    secondary: '#c07a3e',
    secondaryDim: '#f5e6d5',
    surface: '#ffffff',
    surfaceHighlight: '#eeeeee',
    text: '#1a1a1a',
    textSecondary: '#666666',
    textMuted: '#999999',
    border: '#e0e0e0',
    refreshTint: '#6b8f71',
    statusBar: 'dark',
  },
}
