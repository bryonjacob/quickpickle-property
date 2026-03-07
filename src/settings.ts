import { Before } from 'quickpickle'
import { ensurePropertyContext, isPropertyBased } from './context.js'

/**
 * Before hook: parse PBT configuration from scenario tags.
 *
 * Supported tags:
 *   @num-runs:500  — override the number of generated examples (default: 100)
 *   @seed:42       — fix the random seed for reproducibility
 *   @verbose       — enable verbose output showing all generated examples
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Before(async function (world: any) {
  if (!isPropertyBased(world)) return

  const ctx = ensurePropertyContext(world)
  const tags = world.info.tags

  for (const tag of tags) {
    const numRunsMatch = tag.match(/^@num-runs:(\d+)$/)
    if (numRunsMatch) {
      ctx.settings.numRuns = parseInt(numRunsMatch[1], 10)
    }

    const seedMatch = tag.match(/^@seed:(\d+)$/)
    if (seedMatch) {
      ctx.settings.seed = parseInt(seedMatch[1], 10)
    }

    if (tag === '@verbose') {
      ctx.settings.verbose = true
    }
  }
})
