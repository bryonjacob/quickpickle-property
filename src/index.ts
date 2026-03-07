/**
 * quickpickle-property — Property-based testing for Gherkin scenarios
 *
 * Import this module in your Vitest setup file to enable `@property-based`
 * scenarios in your QuickPickle feature files.
 *
 * @example
 * ```ts
 * // vitest setup file
 * import 'quickpickle-property'
 * ```
 *
 * @example
 * ```gherkin
 * @property-based
 * Scenario: Wrong password never verifies
 *   Given any text <P>
 *   And any text <Q>
 *   And <P> is not equal to <Q>
 *   When <P> is hashed producing <H>
 *   Then <Q> does not verify against <H>
 * ```
 */

// Register built-in step definitions (Given any ..., assumption catch-all)
import './steps.js'

// Register the After hook that executes fc.assert
import './runner.js'

// Register the Before hook that parses @num-runs, @seed, @verbose tags
import './settings.js'

// ── Public API ─────────────────────────────────────────────────────────────

export { registerStrategy, resolveStrategy, listStrategies } from './registry.js'
export { registerAssumption, parseAssumption, listAssumptionPatterns } from './assumptions.js'
export { propertyWhen, propertyThen } from './helpers.js'
export {
  isPropertyBased,
  getPropertyContext,
  ensurePropertyContext,
  createPropertyContext,
} from './context.js'
export type {
  PropertyContext,
  StrategyFactory,
  StepCallback,
  AssumptionFn,
  AssumptionPattern,
} from './types.js'
