import { defineConfig } from 'vitest/config'

// The unit tests cover plain functions (quote checks, time math, calendar files), so they run in Node without the
// Worker runtime that vite.config.ts brings in.
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] },
})
