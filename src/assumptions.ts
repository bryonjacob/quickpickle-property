import type { AssumptionFn, AssumptionPattern } from './types.js'

const patterns: AssumptionPattern[] = []

/**
 * Register a custom assumption pattern for use in `Given`/`And` steps.
 *
 * When a `@property-based` scenario contains a Given/And step that matches
 * the pattern, the `build` function is called with regex captures to produce
 * an AssumptionFn. That function is called on every generated input; returning
 * `false` discards the input (maps to `fc.pre()`).
 *
 * @example
 * ```ts
 * import { registerAssumption } from 'quickpickle-property'
 *
 * registerAssumption(
 *   /^<(\w+)> has length greater than (\d+)$/,
 *   (varName, minStr) => (vals) =>
 *     String(vals[varName]).length > parseInt(minStr, 10)
 * )
 * ```
 *
 * Then in Gherkin:
 * ```gherkin
 * And <P> has length greater than 5
 * ```
 */
export function registerAssumption(
  pattern: RegExp,
  build: (...captures: string[]) => AssumptionFn
): void {
  patterns.push({ pattern, build })
}

/**
 * Try to parse a step text as an assumption.
 * Returns an AssumptionFn if a registered pattern matches, null otherwise.
 */
export function parseAssumption(step: string): AssumptionFn | null {
  for (const { pattern, build } of patterns) {
    const match = step.match(pattern)
    if (match) return build(...match.slice(1))
  }
  return null
}

/**
 * List all registered assumption patterns (for documentation/debugging).
 */
export function listAssumptionPatterns(): RegExp[] {
  return patterns.map((p) => p.pattern)
}

// ── Built-in Assumption Patterns ───────────────────────────────────────────
//
// These cover standard comparison and containment checks.
// Projects can register domain-specific assumptions in their setup files.

// Equality
registerAssumption(/^<(\w+)> is not equal to <(\w+)>$/, (a, b) => (vals) => vals[a] !== vals[b])
registerAssumption(/^<(\w+)> is equal to <(\w+)>$/, (a, b) => (vals) => vals[a] === vals[b])

// Numeric comparison (variable vs variable)
registerAssumption(
  /^<(\w+)> is greater than <(\w+)>$/,
  (a, b) => (vals) => (vals[a] as number) > (vals[b] as number)
)
registerAssumption(
  /^<(\w+)> is less than <(\w+)>$/,
  (a, b) => (vals) => (vals[a] as number) < (vals[b] as number)
)
registerAssumption(
  /^<(\w+)> is greater than or equal to <(\w+)>$/,
  (a, b) => (vals) => (vals[a] as number) >= (vals[b] as number)
)
registerAssumption(
  /^<(\w+)> is less than or equal to <(\w+)>$/,
  (a, b) => (vals) => (vals[a] as number) <= (vals[b] as number)
)

// Numeric comparison (variable vs literal)
registerAssumption(
  /^<(\w+)> is greater than (-?\d+(?:\.\d+)?)$/,
  (a, n) => (vals) => (vals[a] as number) > parseFloat(n)
)
registerAssumption(
  /^<(\w+)> is less than (-?\d+(?:\.\d+)?)$/,
  (a, n) => (vals) => (vals[a] as number) < parseFloat(n)
)
registerAssumption(
  /^<(\w+)> is greater than or equal to (-?\d+(?:\.\d+)?)$/,
  (a, n) => (vals) => (vals[a] as number) >= parseFloat(n)
)
registerAssumption(
  /^<(\w+)> is less than or equal to (-?\d+(?:\.\d+)?)$/,
  (a, n) => (vals) => (vals[a] as number) <= parseFloat(n)
)

// Emptiness
registerAssumption(/^<(\w+)> is not empty$/, (a) => (vals) => {
  const v = vals[a]
  if (typeof v === 'string') return v.length > 0
  if (Array.isArray(v)) return v.length > 0
  return v != null
})
registerAssumption(/^<(\w+)> is empty$/, (a) => (vals) => {
  const v = vals[a]
  if (typeof v === 'string') return v.length === 0
  if (Array.isArray(v)) return v.length === 0
  return v == null
})

// Length
registerAssumption(
  /^<(\w+)> has length greater than (\d+)$/,
  (a, n) => (vals) => String(vals[a]).length > parseInt(n, 10)
)
registerAssumption(
  /^<(\w+)> has length less than (\d+)$/,
  (a, n) => (vals) => String(vals[a]).length < parseInt(n, 10)
)

// Containment
registerAssumption(
  /^<(\w+)> contains <(\w+)>$/,
  (a, b) => (vals) => String(vals[a]).includes(String(vals[b]))
)
registerAssumption(
  /^<(\w+)> does not contain <(\w+)>$/,
  (a, b) => (vals) => !String(vals[a]).includes(String(vals[b]))
)

// Type checks
registerAssumption(/^<(\w+)> is a number$/, (a) => (vals) => typeof vals[a] === 'number')
registerAssumption(/^<(\w+)> is a string$/, (a) => (vals) => typeof vals[a] === 'string')
