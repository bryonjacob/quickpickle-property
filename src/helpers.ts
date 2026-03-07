import { When, Then } from 'quickpickle'
import type { QuickPickleWorldInterface } from 'quickpickle'
import { isPropertyBased, ensurePropertyContext } from './context.js'

/**
 * Callback signature for property When/Then steps.
 *
 * @param vals - Generated values keyed by variable name (e.g., `{ P: "hello", Q: "world" }`)
 * @param results - Intermediate results from When steps (e.g., `{ H: "a1b2c3" }`)
 * @param captures - Regex capture groups from the step pattern
 */
type PropertyStepFn = (
  vals: Record<string, unknown>,
  results: Record<string, unknown>,
  ...captures: string[]
) => Promise<void>

/**
 * Register a When step for `@property-based` scenarios.
 *
 * Unlike regular `When()`, the callback is NOT executed immediately.
 * Instead, it's registered as an action callback that fast-check will
 * invoke on every generated input during Phase 2.
 *
 * Use `results` to store intermediate values for later assertion.
 *
 * @example
 * ```ts
 * import { propertyWhen } from 'quickpickle-property'
 *
 * propertyWhen(
 *   /^<(\w+)> is hashed producing <(\w+)>$/,
 *   async (vals, results, inputVar, outputVar) => {
 *     results[outputVar] = hashPassword(vals[inputVar] as string)
 *   }
 * )
 * ```
 *
 * Then in Gherkin:
 * ```gherkin
 * When <P> is hashed producing <H>
 * ```
 */
export function propertyWhen(pattern: RegExp, fn: PropertyStepFn): void {
  When(pattern, async function (world: QuickPickleWorldInterface, ...captures: string[]) {
    if (!isPropertyBased(world)) {
      throw new Error('This step is only valid in @property-based scenarios')
    }
    const ctx = ensurePropertyContext(world)
    ctx.actions.push(async (vals, results) => {
      await fn(vals, results, ...captures)
    })
  })
}

/**
 * Register a Then step for `@property-based` scenarios.
 *
 * Like `propertyWhen()`, the callback is registered (not executed)
 * during Phase 1. fast-check calls it during Phase 2.
 *
 * Throw an error to signal a property violation. fast-check will
 * then shrink to find the minimal counterexample.
 *
 * @example
 * ```ts
 * import { propertyThen } from 'quickpickle-property'
 *
 * propertyThen(
 *   /^<(\w+)> does not verify against <(\w+)>$/,
 *   async (vals, results, pwVar, hashVar) => {
 *     const pw = vals[pwVar] as string
 *     const hash = results[hashVar] as string
 *     if (verifyPassword(pw, hash)) {
 *       throw new Error(`"${pw}" should NOT verify against hash, but it did`)
 *     }
 *   }
 * )
 * ```
 */
export function propertyThen(pattern: RegExp, fn: PropertyStepFn): void {
  Then(pattern, async function (world: QuickPickleWorldInterface, ...captures: string[]) {
    if (!isPropertyBased(world)) {
      throw new Error('This step is only valid in @property-based scenarios')
    }
    const ctx = ensurePropertyContext(world)
    ctx.assertions.push(async (vals, results) => {
      await fn(vals, results, ...captures)
    })
  })
}
