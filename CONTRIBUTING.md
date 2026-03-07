# Contributing to quickpickle-property

Thank you for your interest in contributing. This guide covers the development workflow.

## Dev Setup

```bash
git clone https://github.com/bryonjacob/quickpickle-property.git
cd quickpickle-property
pnpm install
pnpm build
```

## Running Tests

```bash
# Default test suite (feature tests)
pnpm test

# Full test suite including plugin unit tests and conformance tests (83 tests)
npx vitest run --config vitest.all.config.ts

# Watch mode during development
pnpm run test:watch

# Type checking
pnpm run typecheck

# Linting
pnpm run lint
```

Or with [just](https://github.com/casey/just):

```bash
just check-all         # format, lint, typecheck, specdrive (full gate)
just test              # feature tests only
just coverage          # with 96% lines threshold
```

The conformance test suite (`test:conformance`) validates this plugin against the shared `bdd-pbt-spec` behavioral contract. It requires specs to be installed via `specdrive install` first.

## Code Style

This project uses Prettier and ESLint. The formatting rules are:

- No semicolons
- Single quotes
- Trailing commas: ES5
- 100 character line width

Run `pnpm run lint` before submitting changes.

## Architecture Overview

The plugin uses a **two-phase execution model**:

1. **Phase 1 (Registration)**: During normal QuickPickle step execution, property steps register strategies, assumptions, and callbacks into a `PropertyContext` rather than executing immediately.

2. **Phase 2 (Execution)**: An After hook builds a composite fast-check `Arbitrary` from all registered strategies, then runs `fc.assert()` with the collected callbacks. fast-check generates random inputs and shrinks any failure to a minimal counterexample.

Key source files:

- `src/registry.ts` -- Strategy registry (16 built-in strategies)
- `src/assumptions.ts` -- Assumption pattern registry (18 built-in patterns)
- `src/helpers.ts` -- `propertyWhen()` / `propertyThen()` step definition helpers
- `src/runner.ts` -- Phase 2 execution engine
- `src/context.ts` -- PropertyContext lifecycle management
- `src/settings.ts` -- Tag parsing (`@num-runs`, `@seed`, `@verbose`)

## Submitting Changes

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Run the full test suite: `npx vitest run --config vitest.all.config.ts`
5. Run type checking: `pnpm run typecheck`
6. Run linting: `pnpm run lint`
7. Commit with a clear message describing the change
8. Open a pull request against `main`

Please include tests for new functionality. The project maintains a 96% coverage threshold.
