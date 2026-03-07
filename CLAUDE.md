# quickpickle-property

Property-based testing plugin for QuickPickle. Express universal invariants as Gherkin scenarios, executed by fast-check.

## What This Is

A Vitest/QuickPickle plugin that lets you write property-based tests in standard Gherkin. Tag a scenario `@property-based` and the plugin generates hundreds of random inputs, searching for counterexamples via fast-check's shrinking.

## Independence Model

This plugin is **independent of specdrive**. Users get BDD + property-based testing integration without needing specdrive at all. Specdrive is an optional dev dependency for conformance testing against `bdd-pbt-spec`.

**RID traceability** (getting `@RID-*` tags into JUnit XML) is NOT this plugin's job. That responsibility belongs to specdrive via `specdrive init`, which generates a setup file. This plugin was decoupled from RID bridging to maintain clean separation of concerns.

## Architecture

Two-phase execution model:

1. **Phase 1 (Registration)**: QuickPickle runs steps normally, but property steps register strategies, assumptions, and callbacks rather than executing immediately.
2. **Phase 2 (Execution)**: An After hook builds a composite fast-check `Arbitrary`, runs `fc.assert()` with all registered callbacks, and lets fast-check shrink any failure to a minimal counterexample.

## Source Layout

```
src/
├── index.ts          # Entry point, re-exports public API, imports side-effect modules
├── types.ts          # Core types: StrategyFactory, StepCallback, AssumptionFn, PropertyContext
├── registry.ts       # Strategy registry (16 built-in strategies: text, integer, email, etc.)
├── assumptions.ts    # Assumption patterns (18 built-in: equality, numeric, emptiness, etc.)
├── context.ts        # PropertyContext creation and storage on QuickPickle world
├── settings.ts       # Before hook: parses @num-runs, @seed, @verbose tags
├── helpers.ts        # propertyWhen() / propertyThen() — register Phase 2 callbacks
├── steps.ts          # Built-in Given steps: "any <type> <var>" and assumption catch-all
└── runner.ts         # After hook: builds fc.record(), runs fc.assert() (Phase 2)
```

## Specs

```
specs/
├── plugin/                          # Local specs (plugin internals, 7 files, 27 RIDs)
│   ├── registry.feature             # Strategy registry (REG-001–005)
│   ├── context.feature              # PropertyContext lifecycle (CTX-001–004)
│   ├── step-helpers.feature         # propertyWhen/Then helpers (HELP-001–004)
│   ├── step-handlers.feature        # Step dispatch routing (DISPATCH-001–005)
│   ├── settings.feature             # Tag parsing (SET-001–004)
│   ├── error-handling.feature       # Error conditions (ERR-001–004)
│   ├── assumptions.feature          # Assumption pattern registry (ASM-001–004)
│   └── runner.feature               # Phase 2 execution (RUN-001–007)
└── _specdrive/bdd-pbt-spec/         # Installed shared spec (40 RIDs, vendored by specdrive)
```

Local specs are identical to pytest-bdd-property's local specs — both plugins have the same internal architecture by design. These are NOT candidates for lifting to bdd-pbt-spec because they describe implementation structure, not user-observable behavior.

## Tests

83 tests total (39 plugin unit tests + 44 conformance/feature tests).

```bash
pnpm build                                    # Compile TypeScript → dist/
npx vitest run                                # Feature tests only (4 tests)
npx vitest run --config vitest.all.config.ts  # All tests including plugin + conformance (83 tests)
```

Note: `specdrive verify` requires RID→JUnit bridging. Run `specdrive init` in the project to set that up.

## Public API

```typescript
// Strategy registration
registerStrategy(name: string, factory: () => Arbitrary<unknown>)
resolveStrategy(name: string): Arbitrary<unknown>
listStrategies(): string[]

// Assumption patterns
registerAssumption(pattern: RegExp, build: (...captures: string[]) => AssumptionFn)
parseAssumption(stepText: string): AssumptionFn | null

// Step helpers (register Phase 2 callbacks)
propertyWhen(pattern: RegExp, callback: StepCallback)
propertyThen(pattern: RegExp, callback: StepCallback)

// Context inspection
isPropertyBased(world): boolean
getPropertyContext(world): PropertyContext | null
ensurePropertyContext(world): PropertyContext
```

## Usage Pattern

Feature file:

```gherkin
@property-based
Scenario: Hash then verify
  Given any valid password <P>
  When <P> is hashed producing <H>
  Then <P> verifies against <H>
```

Step definitions:

```typescript
import { registerStrategy, propertyWhen, propertyThen } from 'quickpickle-property'

registerStrategy('valid password', () => fc.string({ minLength: 8, maxLength: 128 }))

propertyWhen(/^<(\w+)> is hashed producing <(\w+)>$/, async (vals, results, pwVar, hashVar) => {
  results[hashVar] = hashPassword(vals[pwVar] as string)
})

propertyThen(/^<(\w+)> verifies against <(\w+)>$/, async (vals, results, pwVar, hashVar) => {
  if (!verify(vals[pwVar] as string, results[hashVar] as string)) throw new Error('failed')
})
```

## Configuration Tags

- `@property-based` — activates the plugin for a scenario
- `@num-runs:N` — number of generated test cases (default: 100)
- `@seed:N` — fixed RNG seed for reproducibility
- `@verbose` — log all generated examples

## Dependencies

- **Peer**: `fast-check ^3.0.0`, `quickpickle ^1.0.0`, `vitest ^1.0.0 || >=2.0.0`
- **Build**: TypeScript, ES2022 target, ESM output

## Roadmap

- Custom strategy composition DSL in Gherkin tags
- Stateful property testing support
- Coverage-guided property generation
