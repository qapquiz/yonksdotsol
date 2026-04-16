import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],

    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'android', 'ios'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/utils/**/*.ts', 'src/stores/**/*.ts', 'src/hooks/**/*.ts'],
      exclude: ['src/__tests__/**', '**/*.test.{ts,tsx}', '**/*.d.ts'],
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
