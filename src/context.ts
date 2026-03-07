import type { QuickPickleWorldInterface } from 'quickpickle'
import type { PropertyContext } from './types.js'

const CONTEXT_KEY = '_property'

/**
 * Create a fresh PropertyContext for a new `@property-based` scenario.
 */
export function createPropertyContext(): PropertyContext {
  return {
    strategies: {},
    assumptions: [],
    actions: [],
    assertions: [],
    settings: {},
  }
}

/**
 * Get the PropertyContext from the world, creating one if it doesn't exist.
 */
export function ensurePropertyContext(world: QuickPickleWorldInterface): PropertyContext {
  if (!world.data[CONTEXT_KEY]) {
    world.data[CONTEXT_KEY] = createPropertyContext()
  }
  return world.data[CONTEXT_KEY] as PropertyContext
}

/**
 * Get the PropertyContext from the world, or null if none exists.
 */
export function getPropertyContext(world: QuickPickleWorldInterface): PropertyContext | null {
  return (world.data[CONTEXT_KEY] as PropertyContext) ?? null
}

/**
 * Check whether the current scenario is tagged `@property-based`.
 */
export function isPropertyBased(world: QuickPickleWorldInterface): boolean {
  return world.info?.tags?.includes('@property-based') ?? false
}
