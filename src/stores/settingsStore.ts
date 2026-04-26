import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createMMKV } from 'react-native-mmkv'
import type { ThemeMode } from '../config/theme'

const mmkv = createMMKV({ id: 'settings' })

const storage = {
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}

export type { ThemeMode }

interface SettingsState {
  // Display preferences
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => storage),
    },
  ),
)
