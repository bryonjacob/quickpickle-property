import type { Arbitrary } from 'fast-check'

/**
 * A factory function that produces a fast-check Arbitrary.
 * Registered via `registerStrategy('name', factory)`.
 *
 * @example
 * ```ts
 * const passwordFactory: StrategyFactory = () =>
 *   fc.string({ minLength: 8, maxLength: 128 })
 * ```
 */
export type StrategyFactory = () => Arbitrary<unknown>

/**
 * A callback registered by `propertyWhen()` or `propertyThen()`.
 *
 * @param vals - Generated values keyed by variable name (e.g., `{ P: "hello", Q: "world" }`)
 * @param results - Intermediate results produced by When steps (e.g., `{ H: "a1b2c3..." }`)
 */
export type StepCallback = (
  vals: Record<string, unknown>,
  results: Record<string, unknown>
) => Promise<void>

/**
 * A predicate that filters generated inputs.
 * Returns `true` to keep the input, `false` to discard and regenerate.
 */
export type AssumptionFn = (vals: Record<string, unknown>) => boolean

/**
 * A registered assumption pattern that maps Gherkin step text to a filter predicate.
 */
export interface AssumptionPattern {
  pattern: RegExp
  build: (...captures: string[]) => AssumptionFn
}

/**
 * Accumulated state for a single `@property-based` scenario.
 * Built up during Phase 1 (registration), consumed during Phase 2 (execution).
 */
export interface PropertyContext {
  strategies: Record<string, Arbitrary<unknown>>
  assumptions: AssumptionFn[]
  actions: StepCallback[]
  assertions: StepCallback[]
  settings: {
    numRuns?: number
    seed?: number
    verbose?: boolean
  }
}
