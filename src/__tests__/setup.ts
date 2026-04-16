import { vi } from 'vitest'

// Mock React Native modules
vi.mock('react-native', () => ({
  Platform: { OS: 'android', select: (obj: any) => obj.android || obj.default },
  StyleSheet: { create: (styles: any) => styles },
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
  Appearance: { getColorScheme: () => 'dark' },
}))

// Mock expo modules
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
  Stack: { Screen: 'Screen' },
}))

// Mock @meteora-ag/dlmm
vi.mock('@meteora-ag/dlmm', () => ({
  // Add mocks as needed
}))

// Mock metcomet
vi.mock('metcomet', () => ({
  fetchPositionPnL: vi.fn(),
}))

// Polyfill for BigInt in tests
if (typeof BigInt === 'undefined') {
  ;(global as any).BigInt = (value: any) => BigInt(value)
}

// Mock console methods for cleaner test output
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('act(...)') ||
        args[0].includes('Warning: An update to'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})
