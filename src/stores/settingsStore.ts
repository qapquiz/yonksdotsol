import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createMMKV } from 'react-native-mmkv'
import type { ThemeMode } from '../config/theme'
import { DEFAULT_PIXEL_FONT } from '../config/fonts'
import type { DisplayCurrency } from '../utils/positions/formatters'

const mmkv = createMMKV({ id: 'settings' })

const storage = {
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}

export type { ThemeMode }
export type { DisplayCurrency }

interface SettingsState {
  // Display preferences
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void

  // Font preferences
  pixelFont: string
  setPixelFont: (id: string) => void

  // Alert preferences
  alertsEnabled: boolean
  setAlertsEnabled: (enabled: boolean) => void

  // Display currency (SOL/USD toggle for portfolio values)
  displayCurrency: DisplayCurrency
  setDisplayCurrency: (currency: DisplayCurrency) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),

      pixelFont: DEFAULT_PIXEL_FONT,
      setPixelFont: (pixelFont) => set({ pixelFont }),

      alertsEnabled: false,
      setAlertsEnabled: (alertsEnabled) => set({ alertsEnabled }),

      displayCurrency: 'SOL',
      setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => storage),
    },
  ),
)
