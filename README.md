# quickpickle-property

Property-based testing plugin for [QuickPickle](https://github.com/dnotes/quickpickle). Express universal invariants as standard Gherkin scenarios, executed by [fast-check](https://github.com/dubzzz/fast-check).

## What This Does

Normal Gherkin scenarios test one concrete example at a time. Property-based scenarios test that an invariant holds **for all valid inputs** by generating hundreds of random examples and searching for counterexamples.

This plugin lets you write both in the same feature file, using the same language, with the same tooling.

```gherkin
Feature: Password Security

  # Concrete example — tests one specific case
  Scenario: Correct password verifies
    Given a user with password "Secret1!"
    When they verify with "Secret1!"
    Then verification succeeds

  # Universal invariant — tests ALL valid inputs
  @property-based
  Scenario: Wrong password never verifies
    Given any valid password <P>
    And any valid password <Q>
    And <P> is not equal to <Q>
    When <P> is hashed producing <H>
    Then <Q> does not verify against <H>
```

The `@property-based` scenario generates 100 random password pairs, hashes one, and checks the other never verifies against it. If any pair fails, fast-check **shrinks** to the minimal counterexample.

## Installation

```bash
npm install --save-dev quickpickle-property fast-check
```

## Setup

Add the plugin to your Vitest setup file. It must be imported **before** your step definitions:

```ts
// tests/setup.ts (or wherever your QuickPickle setup lives)

// 1. Activate the property-based testing plugin
import 'quickpickle-property'

// 2. (Optional) Register domain-specific strategies
import { registerStrategy } from 'quickpickle-property'
import fc from 'fast-check'

registerStrategy('valid password', () =>
  fc
    .tuple(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 2 }),
      fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), { minLength: 2 }),
      fc.stringOf(fc.constantFrom(...'0123456789'), { minLength: 2 }),
      fc.stringOf(fc.constantFrom(...'!@#$%^&*'), { minLength: 2 })
    )
    .map((parts) => parts.join(''))
)
```

No changes to your `vitest.config.ts` or QuickPickle config are needed.

## How It Works

### Two-Phase Execution Model

Property-based scenarios use a **registration → execution** pattern:

```
Phase 1 (Registration) — QuickPickle runs steps normally:
  "Given any text <P>"         → registers a strategy (fc.string())
  "And <P> is not equal to <Q>" → registers an assumption (fc.pre())
  "When <P> is hashed..."      → registers an action callback
  "Then <Q> does not verify..." → registers an assertion callback

Phase 2 (Execution) — After hook runs fc.assert:
  fc.assert(fc.asyncProperty({ P: fc.string(), Q: fc.string() }, async (vals) => {
    fc.pre(vals.P !== vals.Q)          // assumption
    results.H = hash(vals.P)           // action
    assert(!verify(vals.Q, results.H)) // assertion
  }), { numRuns: 100 })
```

On failure, fast-check shrinks to the simplest counterexample:

```
✗ Wrong password never verifies
  Property failed after 23 tests, shrunk 4 time(s)
  Counterexample: { P: "a", Q: "" }
```

## The Gherkin Dialect

### Tag: `@property-based`

Marks a Scenario (or Feature) as a property test. Can be combined with other tags.

```gherkin
@property-based
Scenario: My invariant
  ...

@property-based @num-runs:500 @seed:42
Scenario: Stress test with fixed seed
  ...
```

### Step: `Given any <type> <variable>`

Binds a named variable to a strategy (input generator). The variable name goes in angle brackets.

```gherkin
Given any text <P>
And any integer <N>
And any valid password <SECRET>
```

### Step: Assumptions (`And <var> is/has/does/contains ...`)

Filters generated inputs. Returns `false` → input discarded, new one generated.

```gherkin
And <P> is not equal to <Q>
And <N> is greater than <M>
And <S> is not empty
And <X> has length greater than 5
```

### Steps: `When` and `Then` (user-defined)

Action and assertion steps are written by the developer using `propertyWhen()` and `propertyThen()` helpers. These register callbacks instead of executing immediately.

```ts
import { propertyWhen, propertyThen } from 'quickpickle-property'

propertyWhen(
  /^<(\w+)> is hashed producing <(\w+)>$/,
  async (vals, results, inputVar, outputVar) => {
    results[outputVar] = hashPassword(vals[inputVar] as string)
  }
)

propertyThen(/^<(\w+)> verifies against <(\w+)>$/, async (vals, results, pwVar, hashVar) => {
  if (!verify(vals[pwVar] as string, results[hashVar] as string)) {
    throw new Error('Verification failed')
  }
})
```

## Configuration Tags

| Tag             | Default | Description                               |
| --------------- | ------- | ----------------------------------------- |
| `@num-runs:<n>` | 100     | Number of generated examples per scenario |
| `@seed:<n>`     | random  | Fix the random seed for reproducibility   |
| `@verbose`      | off     | Log all generated examples to console     |

```gherkin
@property-based @num-runs:500
Scenario: Thorough hash verification
  Given any text <P>
  When <P> is hashed producing <H>
  Then <P> verifies against <H>
```

## Built-in Strategies

These are available out of the box. Use them in `Given any <type> <variable>` steps.

### Primitives

| Strategy           | Generates                | Example Values             |
| ------------------ | ------------------------ | -------------------------- |
| `text`             | Arbitrary strings        | `""`, `"hello"`, `"🎉x\n"` |
| `non-empty text`   | Strings with length ≥ 1  | `"a"`, `"hello world"`     |
| `ascii text`       | ASCII-only strings       | `"abc"`, `"Hello 123"`     |
| `integer`          | Arbitrary integers       | `-42`, `0`, `2147483647`   |
| `positive integer` | Integers ≥ 1             | `1`, `42`, `9999`          |
| `negative integer` | Integers ≤ -1            | `-1`, `-100`, `-999`       |
| `natural`          | Non-negative integers    | `0`, `1`, `42`             |
| `float`            | Floats (no NaN/Infinity) | `0.5`, `-3.14`, `1e10`     |
| `boolean`          | true/false               | `true`, `false`            |

### Strings

| Strategy       | Generates           | Example Values         |
| -------------- | ------------------- | ---------------------- |
| `alphanumeric` | `[a-z0-9]+` strings | `"abc123"`, `"x"`      |
| `hex string`   | `[0-9a-f]+` strings | `"deadbeef"`, `"0a1b"` |

### Identifiers

| Strategy | Generates            | Example Values                           |
| -------- | -------------------- | ---------------------------------------- |
| `uuid`   | UUID v4 strings      | `"550e8400-e29b-41d4-a716-446655440000"` |
| `email`  | Email-shaped strings | `"user@example.com"`                     |
| `url`    | URL strings          | `"https://example.com/path"`             |

### Temporal

| Strategy | Generates    | Example Values         |
| -------- | ------------ | ---------------------- |
| `date`   | Date objects | `2024-01-15T10:30:00Z` |

### Structured

| Strategy      | Generates                  | Example Values                      |
| ------------- | -------------------------- | ----------------------------------- |
| `json value`  | Any JSON-compatible value  | `42`, `"hello"`, `[1,2]`, `{"a":1}` |
| `json object` | JSON objects (string keys) | `{"name":"test","count":3}`         |

### Domain Defaults

These are sensible defaults. **Override them** with `registerStrategy()` for your domain's actual rules.

| Strategy   | Generates            | Notes                                          |
| ---------- | -------------------- | ---------------------------------------------- |
| `password` | Strings, 8-128 chars | No complexity rules — override for your domain |
| `username` | `[a-z0-9_]{3,32}`    | Basic alphanumeric + underscore                |

## Built-in Assumptions

These are available out of the box in `Given`/`And` steps within `@property-based` scenarios.

### Equality

| Pattern                   | Meaning | Maps to           |
| ------------------------- | ------- | ----------------- |
| `<A> is not equal to <B>` | A ≠ B   | `fc.pre(A !== B)` |
| `<A> is equal to <B>`     | A = B   | `fc.pre(A === B)` |

### Numeric Comparison

| Pattern                               | Meaning | Maps to          |
| ------------------------------------- | ------- | ---------------- |
| `<A> is greater than <B>`             | A > B   | `fc.pre(A > B)`  |
| `<A> is less than <B>`                | A < B   | `fc.pre(A < B)`  |
| `<A> is greater than or equal to <B>` | A ≥ B   | `fc.pre(A >= B)` |
| `<A> is less than or equal to <B>`    | A ≤ B   | `fc.pre(A <= B)` |

### Emptiness

| Pattern            | Meaning                | Maps to                  |
| ------------------ | ---------------------- | ------------------------ |
| `<A> is not empty` | length > 0 or not null | `fc.pre(A.length > 0)`   |
| `<A> is empty`     | length = 0 or null     | `fc.pre(A.length === 0)` |

### Length

| Pattern                         | Meaning    | Maps to                |
| ------------------------------- | ---------- | ---------------------- |
| `<A> has length greater than N` | len(A) > N | `fc.pre(A.length > N)` |
| `<A> has length less than N`    | len(A) < N | `fc.pre(A.length < N)` |

### Containment

| Pattern                    | Meaning             | Maps to                  |
| -------------------------- | ------------------- | ------------------------ |
| `<A> contains <B>`         | B is substring of A | `fc.pre(A.includes(B))`  |
| `<A> does not contain <B>` | B not in A          | `fc.pre(!A.includes(B))` |

### Type Checks

| Pattern           | Meaning           | Maps to                         |
| ----------------- | ----------------- | ------------------------------- |
| `<A> is a number` | typeof A = number | `fc.pre(typeof A === 'number')` |
| `<A> is a string` | typeof A = string | `fc.pre(typeof A === 'string')` |

## Extending the Plugin

### Custom Strategies

Register domain-specific input generators:

```ts
import { registerStrategy } from 'quickpickle-property'
import fc from 'fast-check'

// A valid email for your domain
registerStrategy('corporate email', () =>
  fc
    .tuple(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), {
        minLength: 3,
        maxLength: 20,
      }),
      fc.constantFrom('engineering', 'sales', 'support')
    )
    .map(([name, dept]) => `${name}@${dept}.acme.com`)
)

// A valid money amount (2 decimal places, positive)
registerStrategy('money amount', () =>
  fc.integer({ min: 1, max: 1_000_000_00 }).map((cents) => (cents / 100).toFixed(2))
)

// A composite domain object
registerStrategy('valid order', () =>
  fc.record({
    id: fc.uuid(),
    items: fc.array(
      fc.record({
        sku: fc.hexaString({ minLength: 8, maxLength: 8 }),
        quantity: fc.integer({ min: 1, max: 100 }),
        price: fc.integer({ min: 100, max: 100000 }),
      }),
      { minLength: 1, maxLength: 10 }
    ),
    customerId: fc.uuid(),
  })
)
```

Then use them in Gherkin:

```gherkin
@property-based
Scenario: Order total is always positive
  Given any valid order <O>
  When <O> total is calculated producing <T>
  Then <T> is greater than zero
```

### Custom Assumptions

Register domain-specific filter patterns:

```ts
import { registerAssumption } from 'quickpickle-property'

registerAssumption(
  /^<(\w+)> is a valid email$/,
  (varName) => (vals) => /^[^@]+@[^@]+\.[^@]+$/.test(String(vals[varName]))
)

registerAssumption(
  /^<(\w+)> is within range (\d+) to (\d+)$/,
  (varName, minStr, maxStr) => (vals) => {
    const v = vals[varName] as number
    return v >= parseInt(minStr, 10) && v <= parseInt(maxStr, 10)
  }
)
```

Then:

```gherkin
And <E> is a valid email
And <N> is within range 1 to 100
```

### Writing Property Steps

Use `propertyWhen()` and `propertyThen()` instead of regular `When()`/`Then()`:

```ts
import { propertyWhen, propertyThen } from 'quickpickle-property'

// When steps: perform actions, store results
propertyWhen(
  /^<(\w+)> is serialized to JSON producing <(\w+)>$/,
  async (vals, results, inputVar, outputVar) => {
    results[outputVar] = JSON.stringify(vals[inputVar])
  }
)

// Then steps: assert properties, throw on violation
propertyThen(/^<(\w+)> is valid JSON$/, async (vals, results, varName) => {
  const value = (results[varName] ?? vals[varName]) as string
  try {
    JSON.parse(value)
  } catch {
    throw new Error(`Expected valid JSON, got: ${value}`)
  }
})
```

**Key difference from regular steps:** These callbacks are NOT executed during Phase 1 (registration). They're collected and replayed 100+ times during Phase 2 (execution) with different generated inputs each time.

## Common Patterns

### Round-trip / Serialization

```gherkin
@property-based
Scenario: JSON serialization round-trips
  Given any json value <D>
  When <D> is serialized to JSON producing <J>
  And <J> is deserialized producing <D2>
  Then <D> is deeply equal to <D2>
```

### Idempotency

```gherkin
@property-based
Scenario: Normalizing an email is idempotent
  Given any email <E>
  When <E> is normalized producing <N1>
  And <N1> is normalized producing <N2>
  Then <N1> is equal to <N2>
```

### Commutativity

```gherkin
@property-based
Scenario: Addition is commutative
  Given any integer <A>
  And any integer <B>
  When <A> and <B> are added producing <S1>
  And <B> and <A> are added producing <S2>
  Then <S1> is equal to <S2>
```

### Monotonicity

```gherkin
@property-based
Scenario: Adding items never decreases cart total
  Given any valid cart <C>
  And any valid item <I>
  When <C> total is calculated producing <BEFORE>
  And <I> is added to <C>
  And <C> total is calculated producing <AFTER>
  Then <AFTER> is greater than or equal to <BEFORE>
```

### No Information Leakage

```gherkin
@property-based
Scenario: Hash output never contains the plaintext
  Given any text <P>
  When <P> is hashed producing <H>
  Then <H> does not contain <P>
```

### Invariant Preservation

```gherkin
@property-based
Scenario: Account balance never goes negative
  Given any valid account <A>
  And any valid transaction sequence <TXS>
  When <TXS> are applied to <A> producing <FINAL>
  Then <FINAL> balance is greater than or equal to zero
```

## Coexistence with Behavioral Scenarios

Property-based and behavioral scenarios coexist in the same feature file. They can even **reuse step definitions** — property steps exercise the same domain code as your behavioral steps, just with generated inputs.

```gherkin
Feature: User Authentication

  # ── Behavioral (concrete examples) ──────────────────
  Scenario: User logs in with correct password
    Given a user with password "Secret1!"
    When they log in with "Secret1!"
    Then they are authenticated

  # ── Property (universal invariant) ──────────────────
  @property-based
  Scenario: Wrong password never authenticates
    Given any valid password <P>
    And any valid password <Q>
    And <P> is not equal to <Q>
    Given a user with password <P>
    When they log in with <Q>
    Then they are rejected
```

## Debugging

### Fixed seeds

If a property test fails, the error output includes the seed. Use it to reproduce:

```gherkin
@property-based @seed:12345
Scenario: Reproduce failing case
  ...
```

### Verbose output

See all generated examples:

```gherkin
@property-based @verbose
Scenario: Debug my property
  ...
```

### Low run counts during development

```gherkin
@property-based @num-runs:5
Scenario: Quick smoke test while developing
  ...
```

## API Reference

### Plugin Activation

```ts
import 'quickpickle-property' // registers hooks + built-in steps
```

### Strategy Management

```ts
import { registerStrategy, resolveStrategy, listStrategies } from 'quickpickle-property'

registerStrategy(name: string, factory: () => fc.Arbitrary<unknown>): void
resolveStrategy(name: string): fc.Arbitrary<unknown>  // throws if not found
listStrategies(): string[]  // all registered strategy names
```

### Assumption Management

```ts
import { registerAssumption, parseAssumption, listAssumptionPatterns } from 'quickpickle-property'

registerAssumption(pattern: RegExp, build: (...captures: string[]) => AssumptionFn): void
parseAssumption(stepText: string): AssumptionFn | null
listAssumptionPatterns(): RegExp[]
```

### Step Definition Helpers

```ts
import { propertyWhen, propertyThen } from 'quickpickle-property'

propertyWhen(pattern: RegExp, fn: (vals, results, ...captures) => Promise<void>): void
propertyThen(pattern: RegExp, fn: (vals, results, ...captures) => Promise<void>): void
```

### Context Inspection (advanced)

```ts
import { isPropertyBased, getPropertyContext, ensurePropertyContext } from 'quickpickle-property'

isPropertyBased(world): boolean
getPropertyContext(world): PropertyContext | null
ensurePropertyContext(world): PropertyContext
```

### Types

```ts
import type {
  PropertyContext,
  StrategyFactory,
  StepCallback,
  AssumptionFn,
  AssumptionPattern,
} from 'quickpickle-property'
```

## Requirements

- **QuickPickle** ≥ 1.0.0
- **fast-check** ≥ 3.0.0
- **Vitest** ≥ 1.0.0

## License

MIT
