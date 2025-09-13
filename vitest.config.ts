import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    // Only include tests inside our project folders and ignore node_modules
    include: ['tests/**/*.test.{ts,tsx}', 'tests/**/*.spec.{ts,tsx}', 'src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'playwright/**']
  }
})