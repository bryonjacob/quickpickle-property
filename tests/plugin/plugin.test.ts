import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { QuickPickleWorldInterface } from 'quickpickle'

import { registerStrategy, resolveStrategy, listStrategies } from '../../src/registry.js'
import {
  registerAssumption,
  parseAssumption,
  listAssumptionPatterns,
} from '../../src/assumptions.js'
import {
  createPropertyContext,
  ensurePropertyContext,
  getPropertyContext,
} from '../../src/context.js'
import { runPropertyTest } from '../../src/runner.js'
import type { PropertyContext } from '../../src/types.js'

function createMockWorld(
  tags: string[] = ['@property-based'],
  step?: string
): QuickPickleWorldInterface {
  return { data: {}, info: { tags, step } } as unknown as QuickPickleWorldInterface
}

// ══════════════════════════════════════════════════════════════════════════
// Registry Tests — pure functions, no hooks involved
// ══════════════════════════════════════════════════════════════════════════

describe('Strategy Registry', () => {
  it('RID-PLG-REG-001: register and resolve a custom strategy', () => {
    registerStrategy('test-custom', () => fc.constant('test'))
    const arb = resolveStrategy('test-custom')
    expect(arb).toBeDefined()
  })

  it('RID-PLG-REG-002: strategy names are case-insensitive', () => {
    registerStrategy('Case Test', () => fc.constant('ct'))
    const arb = resolveStrategy('case test')
    expect(arb).toBeDefined()
  })

  it('RID-PLG-REG-003: re-registering overwrites the previous strategy', () => {
    const marker = Symbol('custom')
    registerStrategy('overwrite-test', () => fc.constant(marker))
    const arb = resolveStrategy('overwrite-test')
    const sample = fc.sample(arb, 1)
    expect(sample[0]).toBe(marker)
  })

  it('RID-PLG-REG-004: unknown name throws with available strategies', () => {
    try {
      resolveStrategy('nonexistent-type-xyz')
      expect.unreachable()
    } catch (e) {
      expect((e as Error).message).toMatch(/Unknown strategy/)
      expect((e as Error).message).toMatch(/Registered strategies:/)
      expect((e as Error).message).toMatch(/text/)
    }
  })

  it('RID-PLG-REG-005: at least 16 built-in strategies', () => {
    const names = listStrategies()
    expect(names.length).toBeGreaterThanOrEqual(16)
    for (const name of ['text', 'integer', 'email', 'uuid', 'date']) {
      expect(names).toContain(name)
    }
  })
})

// ══════════════════════════════════════════════════════════════════════════
// Assumption Tests — pure functions
// ══════════════════════════════════════════════════════════════════════════

describe('Assumption Pattern Registry', () => {
  it('RID-PLG-ASM-001: register and parse a custom assumption', () => {
    registerAssumption(
      /^<(\w+)> is positive$/,
      (varName) => (vals) => (vals[varName] as number) > 0
    )
    const fn = parseAssumption('<N> is positive')
    expect(fn).not.toBeNull()
    expect(fn!({ N: 5 })).toBe(true)
    expect(fn!({ N: -1 })).toBe(false)
  })

  it('RID-PLG-ASM-002: unrecognized step text returns null', () => {
    const fn = parseAssumption('something completely unknown')
    expect(fn).toBeNull()
  })

  it('RID-PLG-ASM-003: at least 12 built-in assumption patterns', () => {
    const patterns = listAssumptionPatterns()
    expect(patterns.length).toBeGreaterThanOrEqual(12)
  })

  it('RID-PLG-ASM-004: emptiness assumptions handle arrays and null', () => {
    const notEmpty = parseAssumption('<X> is not empty')!
    expect(notEmpty({ X: [1, 2] })).toBe(true)
    expect(notEmpty({ X: [] })).toBe(false)
    expect(notEmpty({ X: null })).toBe(false)
    expect(notEmpty({ X: undefined })).toBe(false)

    const isEmpty = parseAssumption('<X> is empty')!
    expect(isEmpty({ X: [] })).toBe(true)
    expect(isEmpty({ X: [1] })).toBe(false)
    expect(isEmpty({ X: null })).toBe(true)
    expect(isEmpty({ X: undefined })).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════════════════
// Context Tests — pure functions
// ══════════════════════════════════════════════════════════════════════════

describe('Property Context Lifecycle', () => {
  it('RID-PLG-CTX-001: fresh context has empty collections', () => {
    const ctx = createPropertyContext()
    expect(Object.keys(ctx.strategies)).toHaveLength(0)
    expect(ctx.assumptions).toHaveLength(0)
    expect(ctx.actions).toHaveLength(0)
    expect(ctx.assertions).toHaveLength(0)
  })

  it('RID-PLG-CTX-002: context is created on demand', () => {
    const world = createMockWorld()
    const ctx = ensurePropertyContext(world)
    expect(ctx).toBeDefined()
    expect(ctx.strategies).toBeDefined()
    const ctx2 = ensurePropertyContext(world)
    expect(ctx2).toBe(ctx)
  })

  it('RID-PLG-CTX-003: context does not leak between worlds', () => {
    const world1 = createMockWorld()
    const ctx1 = ensurePropertyContext(world1)
    ctx1.assumptions.push(() => true)

    const world2 = createMockWorld()
    const ctx2 = ensurePropertyContext(world2)
    expect(ctx2.assumptions).toHaveLength(0)
  })

  it('RID-PLG-CTX-004: non-property scenario has no context', () => {
    const world = createMockWorld([])
    const ctx = getPropertyContext(world)
    expect(ctx).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════════════════
// Runner Tests — tests runPropertyTest directly
// ══════════════════════════════════════════════════════════════════════════

describe('Property Test Execution (Phase 2)', () => {
  it('RID-PLG-RUN-001: composite strategy generates values with correct keys', async () => {
    const keys: string[][] = []
    const ctx: PropertyContext = {
      strategies: { P: fc.constant('hello'), N: fc.constant(42) },
      assumptions: [],
      actions: [
        async (vals) => {
          keys.push(Object.keys(vals))
        },
      ],
      assertions: [],
      settings: { numRuns: 5 },
    }
    await runPropertyTest(ctx)
    expect(keys.length).toBe(5)
    for (const k of keys) {
      expect(k.sort()).toEqual(['N', 'P'])
    }
  })

  it('RID-PLG-RUN-002: assumptions filter out invalid inputs', async () => {
    const seen: number[] = []
    const ctx: PropertyContext = {
      strategies: { N: fc.integer({ min: -100, max: 100 }) },
      assumptions: [(vals) => (vals.N as number) > 0],
      actions: [
        async (vals) => {
          seen.push(vals.N as number)
        },
      ],
      assertions: [],
      settings: { numRuns: 50 },
    }
    await runPropertyTest(ctx)
    for (const n of seen) {
      expect(n).toBeGreaterThan(0)
    }
  })

  it('RID-PLG-RUN-003: actions execute in registration order', async () => {
    const order: string[] = []
    const ctx: PropertyContext = {
      strategies: { X: fc.constant(1) },
      assumptions: [],
      actions: [
        async () => {
          order.push('A')
        },
        async () => {
          order.push('B')
        },
      ],
      assertions: [],
      settings: { numRuns: 3 },
    }
    await runPropertyTest(ctx)
    for (let i = 0; i < order.length; i += 2) {
      expect(order[i]).toBe('A')
      expect(order[i + 1]).toBe('B')
    }
  })

  it('RID-PLG-RUN-004: assertions have access to action results', async () => {
    const ctx: PropertyContext = {
      strategies: { X: fc.constant(5) },
      assumptions: [],
      actions: [
        async (vals, results) => {
          results.doubled = (vals.X as number) * 2
        },
      ],
      assertions: [
        async (vals, results) => {
          expect(results.doubled).toBe((vals.X as number) * 2)
        },
      ],
      settings: { numRuns: 10 },
    }
    await runPropertyTest(ctx)
  })

  it('RID-PLG-RUN-005: failing assertion triggers shrinking', async () => {
    const ctx: PropertyContext = {
      strategies: { N: fc.integer({ min: 1, max: 1000 }) },
      assumptions: [],
      actions: [],
      assertions: [
        async (vals) => {
          if ((vals.N as number) > 5) throw new Error(`N=${vals.N} is too large`)
        },
      ],
      settings: { numRuns: 100, seed: 1 },
    }
    await expect(runPropertyTest(ctx)).rejects.toThrow()
  })

  it('RID-PLG-RUN-007: runner applies parsed settings for numRuns and seed', async () => {
    let callCount = 0
    const ctx: PropertyContext = {
      strategies: { X: fc.constant(1) },
      assumptions: [],
      actions: [
        async () => {
          callCount++
        },
      ],
      assertions: [],
      settings: { numRuns: 7, seed: 42 },
    }
    await runPropertyTest(ctx)
    expect(callCount).toBe(7)
  })
})

// ══════════════════════════════════════════════════════════════════════════
// Error Handling — pure function error tests
// ══════════════════════════════════════════════════════════════════════════

describe('Error Handling', () => {
  it('RID-PLG-ERR-002: unknown strategy name throws listing available', () => {
    try {
      resolveStrategy('bogus-type-xyz')
      expect.unreachable()
    } catch (e) {
      expect((e as Error).message).toMatch(/Unknown strategy/)
      expect((e as Error).message).toMatch(/Registered strategies:/)
      expect((e as Error).message).toMatch(/text/)
    }
  })
})

// ══════════════════════════════════════════════════════════════════════════
// Step Dispatch — DISPATCH-002 positive path (parseAssumption integration)
// ══════════════════════════════════════════════════════════════════════════

describe('Step Dispatch', () => {
  it('RID-PLG-DISPATCH-002: assumption-shaped step produces a working filter', () => {
    const assumption = parseAssumption('<P> is not equal to <Q>')
    expect(assumption).not.toBeNull()
    expect(assumption!({ P: 'a', Q: 'b' })).toBe(true)
    expect(assumption!({ P: 'a', Q: 'a' })).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════════════════
// Step Helpers — HELP-003 callback execution semantics
// ══════════════════════════════════════════════════════════════════════════

describe('Property Step Helpers', () => {
  it('RID-PLG-HELP-003: callbacks receive correct values and results', async () => {
    const ctx = createPropertyContext()
    let capturedVals: Record<string, unknown> = {}
    let capturedResults: Record<string, unknown> = {}
    ctx.actions.push(async (vals, results) => {
      capturedVals = vals
      results['Y'] = (vals['X'] as number) * 2
    })
    ctx.assertions.push(async (_vals, results) => {
      capturedResults = results
    })

    const vals = { X: 5 }
    const results: Record<string, unknown> = {}
    for (const action of ctx.actions) await action(vals, results)
    for (const assertion of ctx.assertions) await assertion(vals, results)

    expect(capturedVals).toEqual({ X: 5 })
    expect(capturedResults['Y']).toBe(10)
  })
})
