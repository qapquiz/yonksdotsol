import { useSettingsStore } from '../stores/settingsStore'
import { themeTokens, type ThemeTokens } from '../config/theme'

export function useThemeTokens(): ThemeTokens {
  const theme = useSettingsStore((s) => s.theme)
  return themeTokens[theme]
}

export type { ThemeTokens } from '../config/theme'
