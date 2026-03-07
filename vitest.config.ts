import { defineConfig } from 'vitest/config'
import quickpickle from 'quickpickle'

export default defineConfig({
  plugins: [quickpickle()],
  test: {
    include: ['tests/features/**/*.feature'],
    setupFiles: ['tests/steps.ts'],
  },
})
