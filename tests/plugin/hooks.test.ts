/**
 * Tests that exercise QuickPickle hook handlers directly.
 * These test the actual registered Given/When/Then/Before/After hooks
 * rather than the pure functions they call internally.
 *
 * Uses vi.mock + vi.resetModules to capture hook registrations.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import type { QuickPickleWorldInterface } from 'quickpickle'

type Handler = (...args: unknown[]) => Promise<void>

interface CapturedStep {
  pattern: RegExp
  fn: Handler
  priority?: number
}

const capturedGiven: CapturedStep[] = []
const capturedWhen: CapturedStep[] = []
const capturedThen: CapturedStep[] = []
const capturedBefore: Handler[] = []
const capturedAfter: Handler[] = []

vi.mock('quickpickle', () => ({
  Given: (pattern: RegExp, fn: Handler, priority?: number) => {
    capturedGiven.push({ pattern, fn, priority })
  },
  When: (pattern: RegExp, fn: Handler) => {
    capturedWhen.push({ pattern, fn })
  },
  Then: (pattern: RegExp, fn: Handler) => {
    capturedThen.push({ pattern, fn })
  },
  Before: (fn: Handler) => {
    capturedBefore.push(fn)
  },
  After: (fn: Handler) => {
    capturedAfter.push(fn)
  },
}))

let propertyWhenFn: typeof import('../../src/helpers.js').propertyWhen
let propertyThenFn: typeof import('../../src/helpers.js').propertyThen
let ensurePropertyContextFn: typeof import('../../src/context.js').ensurePropertyContext

beforeAll(async () => {
  vi.resetModules()
  await import('../../src/registry.js')
  await import('../../src/assumptions.js')
  const ctx = await import('../../src/context.js')
  ensurePropertyContextFn = ctx.ensurePropertyContext
  const helpers = await import('../../src/helpers.js')
  propertyWhenFn = helpers.propertyWhen
  propertyThenFn = helpers.propertyThen
  await import('../../src/steps.js')
  await import('../../src/settings.js')
  await import('../../src/runner.js')
})

// ── Helpers ──────────────────────────────────────────────────────────

interface MockWorldData {
  _property?: {
    strategies: Record<string, unknown>
    assumptions: unknown[]
    actions: unknown[]
    assertions: unknown[]
    settings: { numRuns?: number; seed?: number; verbose?: boolean }
  }
  [key: string]: unknown
}

function mockWorld(
  tags: string[] = ['@property-based'],
  step?: string
): QuickPickleWorldInterface & { data: MockWorldData } {
  return {
    data: {} as MockWorldData,
    info: { tags, step },
    context: {},
  } as unknown as QuickPickleWorldInterface & { data: MockWorldData }
}

function findGiven(text: string) {
  for (const g of capturedGiven) {
    const m = text.match(g.pattern)
    if (m) return { fn: g.fn, captures: m.slice(1) }
  }
  return null
}

function findWhen(text: string) {
  for (const w of capturedWhen) {
    const m = text.match(w.pattern)
    if (m) return { fn: w.fn, captures: m.slice(1) }
  }
  return null
}

function findThen(text: string) {
  for (const t of capturedThen) {
    const m = text.match(t.pattern)
    if (m) return { fn: t.fn, captures: m.slice(1) }
  }
  return null
}

// ══════════════════════════════════════════════════════════════════════
// Step Dispatch — Given handler tests
// ══════════════════════════════════════════════════════════════════════

describe('Step Dispatch (hooks)', () => {
  it('RID-PLG-DISPATCH-001: Given "any <type> <var>" binds a strategy', async () => {
    const world = mockWorld()
    const match = findGiven('any text <P>')
    expect(match).not.toBeNull()
    await match!.fn(world, ...match!.captures)
    expect(world.data._property).toBeDefined()
    expect(world.data._property!.strategies['P']).toBeDefined()
  })

  it('RID-PLG-DISPATCH-003: Given step in non-property scenario is skipped', async () => {
    const world = mockWorld([], '<P> is not equal to <Q>')
    const match = findGiven('<P> is not equal to <Q>')
    if (match) {
      await match.fn(world, ...match.captures)
      expect(world.data._property).toBeUndefined()
    }
  })

  it('RID-PLG-DISPATCH-004: When step dispatches to propertyWhen and registers action', async () => {
    propertyWhenFn(
      /^hook-test-action <(\w+)>$/,
      async (_vals: Record<string, unknown>, results: Record<string, unknown>, v: string) => {
        results[v] = 'done'
      }
    )
    const match = findWhen('hook-test-action <Z>')
    const world = mockWorld()
    await match!.fn(world, ...match!.captures)
    expect(world.data._property!.actions.length).toBe(1)
  })

  it('RID-PLG-DISPATCH-005: Then step dispatches to propertyThen and registers assertion', async () => {
    propertyThenFn(/^hook-test-assert <(\w+)>$/, async () => {})
    const match = findThen('hook-test-assert <Z>')
    const world = mockWorld()
    await match!.fn(world, ...match!.captures)
    expect(world.data._property!.assertions.length).toBe(1)
  })
})

// ══════════════════════════════════════════════════════════════════════
// Step Helpers — propertyWhen/propertyThen hook behavior
// ══════════════════════════════════════════════════════════════════════

describe('Property Step Helpers (hooks)', () => {
  it('RID-PLG-HELP-001: propertyWhen registers an action on the context', async () => {
    propertyWhenFn(/^hook-help-when <(\w+)>$/, async () => {})
    const match = findWhen('hook-help-when <X>')
    const world = mockWorld()
    await match!.fn(world, ...match!.captures)
    expect(world.data._property!.actions.length).toBeGreaterThanOrEqual(1)
  })

  it('RID-PLG-HELP-004: unmatched step text returns no match', () => {
    const match = findWhen('completely unrelated step text')
    expect(match).toBeNull()
  })

  it('RID-PLG-HELP-002: propertyThen registers an assertion on the context', async () => {
    propertyThenFn(/^hook-help-then <(\w+)>$/, async () => {})
    const match = findThen('hook-help-then <X>')
    const world = mockWorld()
    await match!.fn(world, ...match!.captures)
    expect(world.data._property!.assertions.length).toBeGreaterThanOrEqual(1)
  })
})

// ══════════════════════════════════════════════════════════════════════
// Settings — Before hook tests
// ══════════════════════════════════════════════════════════════════════

describe('Settings Parsing from Tags (hooks)', () => {
  it('RID-PLG-SET-001: @num-runs:N sets numRuns', async () => {
    const world = mockWorld(['@property-based', '@num-runs:50'])
    for (const handler of capturedBefore) await handler(world)
    expect(world.data._property!.settings.numRuns).toBe(50)
  })

  it('RID-PLG-SET-002: @seed:N sets seed', async () => {
    const world = mockWorld(['@property-based', '@seed:42'])
    for (const handler of capturedBefore) await handler(world)
    expect(world.data._property!.settings.seed).toBe(42)
  })

  it('RID-PLG-SET-003: @verbose enables verbose', async () => {
    const world = mockWorld(['@property-based', '@verbose'])
    for (const handler of capturedBefore) await handler(world)
    expect(world.data._property!.settings.verbose).toBe(true)
  })

  it('RID-PLG-SET-004: unrecognized tags are ignored', async () => {
    const world = mockWorld(['@property-based', '@unknown-tag'])
    for (const handler of capturedBefore) await handler(world)
    const settings = world.data._property!.settings
    expect(settings.numRuns).toBeUndefined()
    expect(settings.seed).toBeUndefined()
    expect(settings.verbose).toBeUndefined()
  })
})

// ══════════════════════════════════════════════════════════════════════
// Runner — After hook tests
// ══════════════════════════════════════════════════════════════════════

describe('Property Test Execution — After hook', () => {
  it('RID-PLG-RUN-006: no strategies raises an error (no context)', async () => {
    const world = mockWorld(['@property-based'])
    for (const handler of capturedAfter) {
      await expect(handler(world)).rejects.toThrow(/strategy/)
    }
  })

  it('RID-PLG-RUN-006: no strategies raises an error (empty context)', async () => {
    const world = mockWorld(['@property-based'])
    ensurePropertyContextFn(world)
    for (const handler of capturedAfter) {
      await expect(handler(world)).rejects.toThrow(/strateg/i)
    }
  })
})

// ══════════════════════════════════════════════════════════════════════
// Error Handling — hook-level error tests
// ══════════════════════════════════════════════════════════════════════

describe('Error Handling (hooks)', () => {
  it('RID-PLG-ERR-001: Given "any ..." outside @property-based throws', async () => {
    const world = mockWorld([])
    const match = findGiven('any text <P>')
    expect(match).not.toBeNull()
    await expect(match!.fn(world, ...match!.captures)).rejects.toThrow(/@property-based/)
  })

  it('RID-PLG-ERR-003: unrecognized assumption pattern throws with guidance', async () => {
    const world = mockWorld(['@property-based'], '<X> is wibble wobble')
    ensurePropertyContextFn(world)
    const match = findGiven('<X> is wibble wobble')
    if (match) {
      await expect(match.fn(world, ...match.captures)).rejects.toThrow(/registerAssumption/)
    }
  })

  it('RID-PLG-ERR-004: propertyWhen outside @property-based throws', async () => {
    propertyWhenFn(/^hook-err-when <(\w+)>$/, async () => {})
    const match = findWhen('hook-err-when <X>')
    expect(match).not.toBeNull()
    const world = mockWorld([])
    await expect(match!.fn(world, ...match!.captures)).rejects.toThrow(/@property-based/)
  })

  it('RID-PLG-ERR-004: propertyThen outside @property-based throws', async () => {
    propertyThenFn(/^hook-err-then <(\w+)>$/, async () => {})
    const match = findThen('hook-err-then <X>')
    expect(match).not.toBeNull()
    const world = mockWorld([])
    await expect(match!.fn(world, ...match!.captures)).rejects.toThrow(/@property-based/)
  })
})
