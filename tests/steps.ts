// Activate the property-based testing plugin
import '../src/index.js'

import { propertyWhen, propertyThen } from '../src/helpers.js'

// ── When steps ─────────────────────────────────────────────────────────────

propertyWhen(
  /^<(\w+)> and <(\w+)> are concatenated producing <(\w+)>$/,
  async (vals, results, aVar, bVar, outVar) => {
    results[outVar] = String(vals[aVar]) + String(vals[bVar])
  }
)

propertyWhen(
  /^<(\w+)> and <(\w+)> are added producing <(\w+)>$/,
  async (vals, results, aVar, bVar, outVar) => {
    results[outVar] = (vals[aVar] as number) + (vals[bVar] as number)
  }
)

// ── Then steps ─────────────────────────────────────────────────────────────

propertyThen(/^<(\w+)> includes <(\w+)>$/, async (vals, results, containerVar, contentVar) => {
  const container = (results[containerVar] ?? vals[containerVar]) as string
  const content = (results[contentVar] ?? vals[contentVar]) as string
  if (!container.includes(content)) {
    throw new Error(`Expected "${container}" to contain "${content}"`)
  }
})

propertyThen(
  /^<(\w+)> has length equal to sum of <(\w+)> and <(\w+)>$/,
  async (vals, results, outVar, aVar, bVar) => {
    const out = (results[outVar] ?? vals[outVar]) as string
    const a = (results[aVar] ?? vals[aVar]) as string
    const b = (results[bVar] ?? vals[bVar]) as string
    if (out.length !== a.length + b.length) {
      throw new Error(
        `Expected length ${a.length} + ${b.length} = ${a.length + b.length}, got ${out.length}`
      )
    }
  }
)

propertyThen(
  /^<(\w+)> reversed is not always equal to <(\w+)>$/,
  async (vals, _results, xVar, yVar) => {
    const x = vals[xVar] as string
    const y = vals[yVar] as string
    // This is a weak property — just check they're different strings
    // (the assumption already guarantees x !== y)
    if (x === y) {
      throw new Error(`Expected "${x}" !== "${y}"`)
    }
  }
)

propertyThen(/^<(\w+)> is equal to <(\w+)>$/, async (vals, results, aVar, bVar) => {
  const a = results[aVar] ?? vals[aVar]
  const b = results[bVar] ?? vals[bVar]
  if (a !== b) {
    throw new Error(`Expected ${String(a)} to equal ${String(b)}`)
  }
})
