import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useSettingsStore } from '../../stores/settingsStore'

// Mock MMKV — in-memory store simulating the real native module
const store = new Map<string, string>()

vi.mock('react-native-mmkv', () => {
  return {
    createMMKV: () => ({
      getString: (key: string) => store.get(key) ?? undefined,
      set: (key: string, value: string) => {
        store.set(key, value)
      },
      remove: (key: string) => {
        store.delete(key)
        return true
      },
      clearAll: () => {
        store.clear()
      },
    }),
  }
})

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset both the Zustand store and the in-memory MMKV store
    useSettingsStore.setState({
      theme: 'dark',
    })
    store.clear()
  })

  describe('initial state', () => {
    it('defaults to dark theme', () => {
      const state = useSettingsStore.getState()
      expect(state.theme).toBe('dark')
    })
  })

  describe('setTheme', () => {
    it('sets theme to light', () => {
      useSettingsStore.getState().setTheme('light')

      expect(useSettingsStore.getState().theme).toBe('light')
    })

    it('sets theme back to dark', () => {
      useSettingsStore.getState().setTheme('light')
      useSettingsStore.getState().setTheme('dark')

      expect(useSettingsStore.getState().theme).toBe('dark')
    })
  })

  describe('toggleTheme', () => {
    it('toggles from dark to light', () => {
      useSettingsStore.getState().toggleTheme()

      expect(useSettingsStore.getState().theme).toBe('light')
    })

    it('toggles from light to dark', () => {
      useSettingsStore.getState().setTheme('light')
      useSettingsStore.getState().toggleTheme()

      expect(useSettingsStore.getState().theme).toBe('dark')
    })

    it('round-trips correctly', () => {
      const { toggleTheme } = useSettingsStore.getState()

      toggleTheme()
      expect(useSettingsStore.getState().theme).toBe('light')

      toggleTheme()
      expect(useSettingsStore.getState().theme).toBe('dark')
    })
  })

  describe('persistence', () => {
    it('writes to MMKV storage on state change', async () => {
      useSettingsStore.getState().setTheme('light')

      // Zustand persist is async — wait for the write
      await new Promise((r) => setTimeout(r, 50))

      // The persist middleware writes JSON under the key "settings-store"
      const stored = store.get('settings-store')
      expect(stored).toBeDefined()
      expect(JSON.parse(stored!).state.theme).toBe('light')
    })

    it('stores dark theme correctly', async () => {
      useSettingsStore.getState().setTheme('dark')

      await new Promise((r) => setTimeout(r, 50))

      const stored = store.get('settings-store')
      expect(stored).toBeDefined()
      expect(JSON.parse(stored!).state.theme).toBe('dark')
    })
  })
})
