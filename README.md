# cent

**Arbitrary-precision currency library for TypeScript/JavaScript**

`cent` is a monetary math library designed for applications that need **exact precision** — accounting, trading, and cryptocurrency.

## Why cent?

JavaScript's `Number` type fails for financial calculations:

```typescript
0.1 + 0.2                    // 0.30000000000000004
19.99 * 100                  // 1998.9999999999998
Number.MAX_SAFE_INTEGER      // Only 9 quadrillion — too small for wei
```

`cent` solves this with:

- **Arbitrary precision** — `BigInt` under the hood, no floating point errors
- **Multi-asset support** — USD, EUR, BTC, ETH, SOL, and 180+ currencies
- **Type safety** — Can't accidentally add USD to EUR
- **Immutable** — All operations return new instances
- **Zero dependencies** — 8KB gzipped

## Installation

```bash
npm install @thesis-co/cent
```

## Quick Start

```typescript
import { Money, Round } from '@thesis-co/cent'

// Create money from strings
const price = Money("$100.50")
const btc = Money("0.5 BTC")

// Arithmetic
const total = price.add("$25.25")           // $125.75
const tax = price.multiply("8.25%")         // $8.29
const split = total.divide(3, Round.HALF_UP) // $41.92

// Distribution
const [a, b, c] = price.allocate([1, 2, 1]) // [$25.13, $50.25, $25.12]

// Formatting
console.log(price.toString())               // "$100.50"
console.log(btc.toString({ preferredUnit: "sat" })) // "50,000,000 sats"
```

## Documentation

- [Getting Started](./apps/docs/content/docs/getting-started.mdx) — Installation and configuration
- [Core Concepts](./apps/docs/content/docs/core-concepts.mdx) — Precision, immutability, rounding modes
- **API Reference**
  - [Money](./apps/docs/content/docs/api/money.mdx) — Primary currency type
  - [FixedPoint & Rational](./apps/docs/content/docs/api/fixed-point.mdx) — Numeric types
  - [ExchangeRate](./apps/docs/content/docs/api/exchange-rate.mdx) — Currency conversion
  - [Price](./apps/docs/content/docs/api/price.mdx) — Arbitrary price ratios
  - [PriceRange](./apps/docs/content/docs/api/price-range.mdx) — Price range operations
- **Guides**
  - [Tax Calculations](./apps/docs/content/docs/guides/tax-calculations.mdx) — Percentages and discounts
  - [Splitting Bills](./apps/docs/content/docs/guides/splitting-bills.mdx) — Fair distribution
  - [Crypto Precision](./apps/docs/content/docs/guides/crypto-precision.mdx) — BTC, ETH, SOL

## Integrations

- [`@thesis-co/cent-zod`](./packages/cent-zod) — Zod schemas for validation
- [`@thesis-co/cent-react`](./packages/cent-react) — React input and display components
- [`@thesis-co/cent-supabase`](./packages/cent-supabase) — Automatic DECIMAL/NUMERIC handling for Supabase

## Comparison with dinero.js

| Feature | cent | dinero.js |
|---------|------|-----------|
| **Precision** | Arbitrary (BigInt) | Limited (Number) |
| **Max Value** | Unlimited | ~9 quadrillion |
| **Crypto Support** | Native (8-18 decimals) | Limited |
| **Allocation** | Advanced with fractional separation | Basic |
| **Exact Division** | Guaranteed* | No |
| **Type Safety** | Full TypeScript | Partial |

## License

MIT
