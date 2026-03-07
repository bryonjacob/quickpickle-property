import { defineConfig } from 'vitest/config'
import quickpickle from 'quickpickle'

export default defineConfig({
  plugins: [quickpickle()],
  test: {
    include: [
      'tests/features/**/*.feature',
      'tests/plugin/plugin.test.ts',
      'tests/plugin/hooks.test.ts',
      'specs/_specdrive/**/*.feature',
    ],
    setupFiles: ['tests/steps.ts', 'specs/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/types.ts'],
    },
  },
})
