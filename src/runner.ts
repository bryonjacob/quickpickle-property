import fc from 'fast-check'
import { After } from 'quickpickle'
import { getPropertyContext, isPropertyBased } from './context.js'
import type { PropertyContext } from './types.js'

/**
 * Run the property test using fc.assert with all registered strategies,
 * assumptions, actions, and assertions.
 */
export async function runPropertyTest(propCtx: PropertyContext): Promise<void> {
  const recordArbitrary = fc.record(propCtx.strategies as Record<string, fc.Arbitrary<unknown>>)

  const fcParams: fc.Parameters<[Record<string, unknown>]> = {
    numRuns: propCtx.settings.numRuns ?? 100,
    seed: propCtx.settings.seed,
    verbose: propCtx.settings.verbose ? fc.VerbosityLevel.Verbose : fc.VerbosityLevel.None,
    endOnFailure: true,
  }

  await fc.assert(
    fc.asyncProperty(recordArbitrary, async (vals) => {
      const generated = vals as Record<string, unknown>

      for (const check of propCtx.assumptions) {
        fc.pre(check(generated))
      }

      const results: Record<string, unknown> = {}
      for (const action of propCtx.actions) {
        await action(generated, results)
      }

      for (const assertion of propCtx.assertions) {
        await assertion(generated, results)
      }
    }),
    fcParams
  )
}

/**
 * After hook: execute the accumulated property test via fc.assert.
 *
 * This is Phase 2 of the two-phase execution model.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
After(async function (world: any) {
  if (!isPropertyBased(world)) return

  const propCtx = getPropertyContext(world)
  if (!propCtx) {
    throw new Error(
      '@property-based scenario completed without any strategy registrations. ' +
        'Did you forget "Given any ..." steps?'
    )
  }

  const strategyNames = Object.keys(propCtx.strategies)
  if (strategyNames.length === 0) {
    throw new Error('No strategies registered in @property-based scenario')
  }

  await runPropertyTest(propCtx)
})
