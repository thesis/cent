# Changelog

All notable changes to `@thesis-co/cent` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - Unreleased

### Added

#### Configuration

- `configure()` for setting library-wide defaults at startup (number-input
  policy, default currency/locale, default rounding mode, strict precision).
- `withConfig()` for scoped overrides. In Node, scopes are async-safe via
  `AsyncLocalStorage`; in browsers, a synchronous save/restore fallback is
  used (and concurrent async use logs a one-time warning).
- `getConfig()`, `getDefaultConfig()`, and `resetConfig()` helpers.

#### Rounding

- `Round` constants (`Round.HALF_UP`, `Round.HALF_EVEN`, `Round.CEIL`,
  `Round.FLOOR`, etc.) for explicit, ergonomic rounding selection.
- `Money.divide(divisor, mode?)` accepts a rounding mode and applies it when
  the division would otherwise lose precision.
- `Money.round(mode?)` rounds to the currency's canonical minor unit.
- `Money.roundTo(decimals, mode?)` rounds to a specific number of decimals.
- Shared `applyRounding()` helper drives both `divide` and `roundTo` for
  consistent behavior.

#### Errors

- Structured error types (`CurrencyMismatchError`, `ParseError`,
  `InvalidInputError`, `DivisionError`, `PrecisionLossError`,
  `EmptyArrayError`, `ValidationError`) with error codes, suggestions, and
  examples to aid recovery.
- All currency-mismatch failures now throw a typed `CurrencyMismatchError`
  carrying the expected currency, actual currency, and the operation name.

#### Result type

- `Result<T, E>` discriminated union for explicit success/failure handling
  without try/catch.
- Combinators: `map`, `mapErr`, `flatMap`, `match`, `unwrapOr`, `isOk`,
  `isErr`.
- Used by `Money.parse()` and `Money.tryFrom()` to surface parse failures
  without throwing.

#### Aggregation

- `Money.zero(currency?)` builds a zero in the given (or default) currency.
- `Money.sum(items, defaultValue?)` sums an array, with an optional default
  for empty arrays.
- `Money.avg(items, mode?)` averages an array with an optional rounding mode.
- `Money.min(...items)` and `Money.max(...items)` accept either varargs or a
  single array.

#### Bounds

- `Money.clamp(min, max)`, `Money.atLeast(min)`, and `Money.atMost(max)` for
  enforcing value ranges.
- Bounds accept `Money`, currency-prefixed strings, bare numeric strings, or
  numbers. Bare numeric strings preserve full input precision.

#### Parsing and type guards

- `Money.parse(input)` returns a `Result` instead of throwing.
- `Money.tryFrom(input, currency?)` is a Result-returning variant of the
  factory.
- `Money.isMoney(value, currency?)` for runtime type narrowing.
- `Money.assertMoney`, `Money.assertPositive`, `Money.assertNonNegative`,
  `Money.assertNonZero` throw structured errors with helpful messages.
- `Money.validate({ min, max, positive, nonNegative, nonZero })` returns a
  `Result` for declarative validation.

#### Construction

- `Money.fromMinorUnits(amount, currency)` is an explicit alias for the
  bigint+currency factory overload (e.g., `fromMinorUnits(10050n, "USD")`
  → `$100.50`).
- `Money.fromSubUnits(amount, unit)` for sub-unit names like `sat`, `msat`,
  `gwei`, `wei`, `lamport`.
- The `Money(...)` factory now accepts `number` and `bigint` inputs (with
  configurable handling for imprecise number inputs).

#### Arithmetic

- Percentage strings (`"8.25%"`) are accepted directly in arithmetic
  operations.
- `Money.extractPercent(percentage)` and `Money.removePercent(percentage)`
  for tax-inclusive/-exclusive accounting workflows.

### Changed (breaking)

- **`FixedPointNumber.divide()` decimals representation.** The result is now
  reduced to its mathematically minimum representation. Previously,
  `10.0 / 2.5` returned `40000n @ 4 decimals`; it now returns
  `4000n @ 3 decimals`. The numeric value is unchanged, but consumers
  reading `.amount` or `.decimals` directly will observe a different shape.
- **Currency mismatches throw typed errors.** `Money` operations across
  mismatched currencies still throw, but now via `CurrencyMismatchError`
  (with `expected`, `actual`, and `operation` fields) rather than a plain
  `Error`. Callers that match on `error.message` may need updates; callers
  using `instanceof Error` are unaffected.
