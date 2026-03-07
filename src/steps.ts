import { Given } from 'quickpickle'
import { resolveStrategy } from './registry.js'
import { parseAssumption } from './assumptions.js'
import { ensurePropertyContext, isPropertyBased } from './context.js'

/**
 * Built-in step: `Given any <type> <variable>`
 *
 * Registers a strategy (fast-check Arbitrary) for the named variable.
 * The `<type>` is resolved against the strategy registry.
 *
 * Examples:
 *   Given any text <P>
 *   Given any positive integer <N>
 *   Given any valid password <P>
 */
Given(/^any (.+) <(\w+)>$/, async function (world, type: string, varName: string) {
  if (!isPropertyBased(world)) {
    throw new Error(`"Given any ${type} <${varName}>" is only valid in @property-based scenarios`)
  }
  const ctx = ensurePropertyContext(world)
  ctx.strategies[varName] = resolveStrategy(type)
})

/**
 * Built-in step: catch-all for assumption patterns.
 *
 * Matches steps like:
 *   And <P> is not equal to <Q>
 *   And <N> is greater than <M>
 *   And <S> does not contain <T>
 *   And <X> has length greater than 5
 *   And <A> is not empty
 *   And <B> is a string
 *
 * The step text is matched against registered assumption patterns.
 * If no pattern matches, an error is thrown with guidance.
 */
Given(
  /^<(\w+)> (?:is |has |does |contains ).+$/,
  async function (world) {
    if (!isPropertyBased(world)) return

    const ctx = ensurePropertyContext(world)
    const stepText = world.info.step ?? ''

    const assumption = parseAssumption(stepText)
    if (assumption) {
      ctx.assumptions.push(assumption)
    } else {
      throw new Error(
        `Could not parse assumption: "${stepText}". ` +
          `Register a custom pattern with registerAssumption().`
      )
    }
  },
  -1 // Low priority: specific propertyWhen/propertyThen patterns should win
)
