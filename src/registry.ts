import fc from 'fast-check'
import type { StrategyFactory } from './types.js'

const strategies = new Map<string, StrategyFactory>()

/**
 * Register a named strategy (input generator) for use in `Given any <type> <var>` steps.
 *
 * Strategy names are case-insensitive. Registering a name that already exists
 * overwrites the previous factory.
 *
 * @example
 * ```ts
 * import { registerStrategy } from 'quickpickle-property'
 * import fc from 'fast-check'
 *
 * registerStrategy('valid password', () =>
 *   fc.string({ minLength: 8, maxLength: 128 })
 *     .filter(s => /[A-Z]/.test(s) && /[a-z]/.test(s) && /\d/.test(s))
 * )
 * ```
 *
 * Then in Gherkin:
 * ```gherkin
 * Given any valid password <P>
 * ```
 */
export function registerStrategy(name: string, factory: StrategyFactory): void {
  strategies.set(name.toLowerCase(), factory)
}

/**
 * Resolve a strategy name to a fast-check Arbitrary.
 * Throws with a helpful error listing available strategies if the name is unknown.
 */
export function resolveStrategy(name: string): fc.Arbitrary<unknown> {
  const factory = strategies.get(name.toLowerCase())
  if (!factory) {
    const available = [...strategies.keys()].sort().join(', ')
    throw new Error(`Unknown strategy "${name}". Registered strategies: ${available}`)
  }
  return factory()
}

/**
 * List all registered strategy names (for documentation/debugging).
 */
export function listStrategies(): string[] {
  return [...strategies.keys()].sort()
}

// ── Built-in Strategies ────────────────────────────────────────────────────
//
// These cover the most common types for property-based testing.
// Projects should register domain-specific strategies in their setup files.

// Primitives
registerStrategy('text', () => fc.string())
registerStrategy('non-empty text', () => fc.string({ minLength: 1 }))
registerStrategy('integer', () => fc.integer())
registerStrategy('positive integer', () => fc.integer({ min: 1 }))
registerStrategy('negative integer', () => fc.integer({ max: -1 }))
registerStrategy('natural', () => fc.nat())
registerStrategy('float', () => fc.float({ noNaN: true, noDefaultInfinity: true }))
registerStrategy('boolean', () => fc.boolean())

// Strings
registerStrategy('ascii text', () => fc.asciiString())
registerStrategy('alphanumeric', () =>
  fc
    .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
      minLength: 1,
    })
    .noBias()
)
registerStrategy('hex string', () =>
  fc.stringOf(fc.constantFrom(...'0123456789abcdef'.split('')), { minLength: 1 }).noBias()
)

// Identifiers
registerStrategy('uuid', () => fc.uuid())
registerStrategy('email', () => fc.emailAddress())
registerStrategy('url', () => fc.webUrl())

// Temporal
registerStrategy('date', () => fc.date())

// Structured
registerStrategy('json value', () => fc.jsonValue())
registerStrategy('json object', () => fc.dictionary(fc.string(), fc.jsonValue()))

// Common domain types (sensible defaults — projects should override)
registerStrategy('password', () => fc.string({ minLength: 8, maxLength: 128 }).noBias())
registerStrategy('username', () =>
  fc
    .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), {
      minLength: 3,
      maxLength: 32,
    })
    .noBias()
)
