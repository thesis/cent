# cent

**Arbitrary-precision currency library for TypeScript/JavaScript**

`cent` is a next-generation monetary computation library designed to handle currencies with **perfect precision**, no matter how large the values or how many decimal places are required.

This makes `cent` a good choice for accounting, F/X, trading, and cryptocurrency applications.

## Why `cent`?

### The problem

Popular libraries like [dinero.js](https://dinerojs.com/) are built on JavaScript's `Number` type, which has fundamental limitations:

- **Precision Loss**: JavaScript's `Number` can only safely represent integers up to `Number.MAX_SAFE_INTEGER` (2⁵³ - 1)
- **Floating Point Errors**: Floating point arithmetic can introduce rounding errors
- **Limited Scale**: Struggles with high-precision assets like cryptocurrencies. Neither assets on Bitcoin (8 decimals), Solana (9 decimals), or Ethereum (18 decimals) fit into a JS `Number`.

### The solution

`cent` solves these problems with:

- **🔢 Arbitrary Precision**: Uses `BigInt` for unlimited precision arithmetic
- **💰 Multi-Asset Support**: Handles traditional currencies, cryptocurrencies, and custom assets
- **🧮 Exact Mathematics**: Guaranteed exact results for division by powers of 2 and 5
- **🌍 Comprehensive Currency Database**: Built-in support for 180+ world currencies
- **🎯 Type Safety**: Full TypeScript support with strict type checking
- **🔄 Immutable**: All operations return new instances, preventing accidental mutations

## Quick Start

```typescript
import { Money, USD, BTC } from '@your-org/cent'

// Create money amounts
const price = new Money({
  asset: USD,
  amount: { amount: 12550n, decimals: 2n } // $125.50
})

const bitcoin = new Money({
  asset: BTC,
  amount: { amount: 21000000n, decimals: 8n } // 0.21000000 BTC
})

// Perform calculations
const tax = price.multiply({ amount: 875n, decimals: 3n }) // 8.75%
const total = price.add(tax)

// Format for display
console.log(total.toString()) // "$135.48"
console.log(bitcoin.toString({ preferredUnit: 'satoshi' })) // "21,000,000 satoshis"
```

## Core utils

### `Money`

The `Money` class provides safe monetary operations with automatic precision handling:

```typescript
import { Money, EUR, USD } from '@your-org/cent'

// Create money instances
const euros = new Money({
  asset: EUR,
  amount: { amount: 50025n, decimals: 2n } // €500.25
})

const dollars = new Money({
  asset: USD,
  amount: { amount: 100000n, decimals: 2n } // $1,000.00
})

// Basic arithmetic (same currency only)
const sum = euros.add(new Money({
  asset: EUR,
  amount: { amount: 25050n, decimals: 2n } // €250.50
}))
console.log(sum.toString()) // "€750.75"

// Multiplication and division
const doubled = euros.multiply(2n)
const half = euros.divide(2n) // Only works with factors of 2 and 5

// Comparisons
console.log(euros.greaterThan(dollars)) // Error: Different currencies
console.log(euros.isPositive()) // true
console.log(euros.equals(euros)) // true

// Formatting options
console.log(euros.toString({ locale: 'de-DE' })) // "500,25 €"
console.log(euros.toString({ compact: true })) // "€500"
```

## Math utilities

`cent` comes with two flavors of arbitrary-precision math utilities.

`FixedPointNumber` is appropriate for financial applications that require
keeping track of "cents" or other fractional units of a currency. By
disallowing arbitrary division, fixed-point numbers make it difficult to
lose track of a fractional unit.

`RationalNumber` is appropriate for wider arbitrary-precision math
applications.

### Examples

```typescript
// FixedPointNumber allows

import { FixedPointNumber } from '@your-org/cent'

// Create fixed-point numbers
const price = new FixedPointNumber(125550n, 2n) // 1255.50
const rate = new FixedPointNumber(875n, 3n) // 0.875

// Arithmetic operations
const product = price.multiply(rate) // Automatic precision handling
console.log(product.toString()) // "1098.5625"

// Precise division (only factors of 2 and 5)
const half = price.divide(2n)
const fifth = price.divide(5n)
const tenth = price.divide(10n)

// Comparison operations
console.log(price.greaterThan(rate)) // true
console.log(price.lessThanOrEqual(rate)) // false

// Conversion to string
console.log(price.toString()) // "1255.50"

// Normalization between different precisions
const normalized = rate.normalize({ amount: 0n, decimals: 2n })
console.log(normalized.toString()) // "0.88" (rounded down)

// RationalNumber enables arbitrary division

import { RationalNumber } from '@your-org/cent'

// Create rational numbers
const oneThird = new RationalNumber({ p: 1n, q: 3n }) // 1/3
const twoFifths = new RationalNumber({ p: 2n, q: 5n }) // 2/5

// Exact arithmetic
const sum = oneThird.add(twoFifths) // (1/3) + (2/5) = (5 + 6)/15 = 11/15
console.log(`${sum.p}/${sum.q}`) // "11/15"

const product = oneThird.multiply(twoFifths) // (1/3) * (2/5) = 2/15
console.log(`${product.p}/${product.q}`) // "2/15"

// Simplification
const simplified = new RationalNumber({ p: 6n, q: 9n }).simplify()
console.log(`${simplified.p}/${simplified.q}`) // "2/3"

// Convert to fixed-point (when possible)
const tenth = new RationalNumber({ p: 1n, q: 10n })
const fixed = tenth.toFixedPoint() // { amount: 1n, decimals: 1n }
```

## Price operations

`cent` includes `Price` and `ExchangeRate` classes for representing price ratios between assets with mathematical operations:

```typescript
import { Price, ExchangeRate } from '@your-org/cent'

// Create price ratios
const usdPerApple = new Price(
  { asset: USD, amount: { amount: 500n, decimals: 2n } }, // $5.00
  { asset: APPLE, amount: { amount: 1n, decimals: 0n } }  // 1 apple
)

const applesPerBtc = new Price(
  { asset: APPLE, amount: { amount: 10000n, decimals: 0n } }, // 10,000 apples
  { asset: BTC, amount: { amount: 100000000n, decimals: 8n } } // 1.00000000 BTC
)

// Price-to-Price multiplication (assets must share a common unit)
// $5/apple × 10,000 apples/BTC = $50,000/BTC
const usdPerBtc = usdPerApple.multiply(applesPerBtc)
console.log(usdPerBtc.amounts[0].amount.amount) // 5000000n ($50,000.00)

// Real-world FX example: Calculate USD/BTC from USD/EUR and BTC/EUR rates
const usdPerEur = new ExchangeRate(
  { asset: USD, amount: { amount: 108n, decimals: 2n } }, // $1.08
  { asset: EUR, amount: { amount: 100n, decimals: 2n } }  // €1.00
)

const btcPerEur = new ExchangeRate(
  { asset: BTC, amount: { amount: 100000000n, decimals: 8n } }, // 1.00000000 BTC
  { asset: EUR, amount: { amount: 4500000n, decimals: 2n } }    // €45,000.00
)

// USD/EUR × EUR/BTC = USD/BTC (EUR cancels out)
// Note: We need to invert btcPerEur to get EUR/BTC
const eurPerBtc = btcPerEur.invert() // €45,000/1 BTC
const usdPerBtcFx = usdPerEur.multiply(eurPerBtc) // $1.08/€1 × €45,000/1 BTC = $48,600/1 BTC
console.log(usdPerBtcFx.amounts[0].amount.amount) // 4860000n ($48,600.00)

// Price-to-Price division
// $50,000/BTC ÷ $5/apple = 10,000 apples/BTC
const calculatedApplesPerBtc = usdPerBtc.divide(usdPerApple)

// Scalar operations (multiply/divide by numbers)
const doubledPrice = usdPerApple.multiply(2n) // $10.00/apple
const halfPrice = usdPerApple.divide(2n)      // $2.50/apple

// Convert to mathematical ratio
const ratio = usdPerApple.asRatio() // RationalNumber: 500/1

// Exchange rates with timestamps
const exchangeRate = new ExchangeRate(
  { asset: USD, amount: { amount: 117n, decimals: 2n } }, // $1.17
  { asset: EUR, amount: { amount: 100n, decimals: 2n } }  // €1.00
) // Automatically timestamped

// Price operations validate shared assets
try {
  const orangesPerBtc = new Price(orange5000, btc1)
  usdPerApple.multiply(orangesPerBtc) // Error: no shared asset!
} catch (error) {
  console.log(error.message) 
  // "Cannot multiply prices: no shared asset found between US Dollar/Apple and Orange/Bitcoin"
}
```

## Other features

### Currency support

`cent` includes comprehensive currency metadata for accurate formatting:

```typescript
import { USD, EUR, BTC, ETH, JPY } from '@your-org/cent'

// Traditional currencies
console.log(USD.decimals) // 2n
console.log(USD.symbol) // "$"
console.log(USD.fractionalUnit) // "cent"

// Cryptocurrencies with high precision
console.log(BTC.decimals) // 8n
console.log(BTC.fractionalUnit) // Complex object with multiple units

// Currencies with no decimals
console.log(JPY.decimals) // 0n
```

### JSON Serialization

Safe serialization for APIs and storage:

```typescript
const money = new Money({
  asset: USD,
  amount: { amount: 123456789012345n, decimals: 2n }
})

// Serialize (BigInt becomes string)
const json = money.toJSON()
console.log(JSON.stringify(json))
// {"asset":{"name":"United States dollar","code":"USD","decimals":"2","symbol":"$"},"amount":{"amount":"123456789012345","decimals":"2"}}

// Deserialize
const restored = Money.fromJSON(json)
console.log(restored.equals(money)) // true
```

### Precision handling

`cent` automatically handles different precisions:

```typescript
// Different decimal places are automatically normalized
const fp1 = new FixedPointNumber(100n, 1n) // 10.0
const fp2 = new FixedPointNumber(500n, 2n) // 5.00

const sum = fp1.add(fp2) // Normalized to 2 decimals
console.log(sum.toString()) // "15.00"
```

### Safe division

Unlike floating-point arithmetic, `cent` ensures exact division results:

```typescript
const number = new FixedPointNumber(100n, 0n) // 100

console.log(number.divide(2n).toString()) // "50.0"
console.log(number.divide(4n).toString()) // "25.00"
console.log(number.divide(5n).toString()) // "20.0"
console.log(number.divide(10n).toString()) // "10.0"

// throws an exception (3 cannot be represented exactly in decimal)
try {
  number.divide(3n)
} catch (error) {
  console.log(error.message) // "divisor must be composed only of factors of 2 and 5"
}
```

## Use cases

### FinTech
```typescript
// handle large transfers with perfect precision
const wireTransfer = new Money({
  asset: USD,
  amount: { amount: 999999999999n, decimals: 2n } // $9,999,999,999.99
})

const fee = wireTransfer.multiply({ amount: 5n, decimals: 3n }) // 0.5% fee
const afterFee = wireTransfer.subtract(fee)
```

### Cryptocurrencies
```typescript
// handle Bitcoin with satoshi and sub-satoshi precision
const satoshiAmount = new Money({
  asset: BTC,
  amount: { amount: 100000000n, decimals: 8n } // 1.00000000 BTC
})

console.log(satoshiAmount.toString({ preferredUnit: 'satoshi' }))
// "100,000,000 satoshis"

// ethereum with wei precision (18 decimals)
const weiAmount = new Money({
  asset: ETH,
  amount: { amount: 1000000000000000000n, decimals: 18n } // 1.0 ETH
})
```

### Accounting & bookkeeping
```typescript
// Allocate amounts without losing precision
const total = new Money({
  asset: USD,
  amount: { amount: 10000n, decimals: 2n } // $100.00
})

const [main, change] = total.concretize() // Separate whole currency from sub-units
console.log(main.toString()) // "$100.00"
console.log(change.toString()) // "$0.00"
```

## API reference

### `Money`

- `add(other)` - Add money amounts (same currency)
- `subtract(other)` - Subtract money amounts (same currency)
- `multiply(scalar)` - Multiply by number or FixedPoint
- `concretize()` - Split into concrete amount and change
- `equals(other)` - Check equality
- `lessThan(other)` - Comparison methods
- `greaterThan(other)` - Comparison methods
- `isZero()` - Check if amount is zero
- `isPositive()` - Check if amount is positive
- `hasChange()` - Check if has fractional part
- `toString(options)` - Format for display
- `toJSON()` - Serialize to JSON
- `fromJSON(json)` - Deserialize from JSON

### `FixedPointNumber`

- `add(other)` - Addition
- `subtract(other)` - Subtraction
- `multiply(other)` - Multiplication
- `divide(other)` - Safe division
- `normalize(target)` - Change decimal precision
- `equals(other)` - Equality check
- `toString()` - String representation
- `parseString(str, decimals)` - Parse from string

### `RationalNumber`

- `add(other)` - Exact addition
- `subtract(other)` - Exact subtraction
- `multiply(other)` - Exact multiplication
- `divide(other)` - Exact division
- `simplify()` - Reduce to lowest terms
- `toFixedPoint()` - Convert to decimal (when possible)

### `Price`

- `multiply(scalar | Price)` - Scalar multiplication or Price-to-Price multiplication
- `divide(scalar | Price)` - Scalar division or Price-to-Price division
- `asRatio()` - Convert to RationalNumber ratio
- `invert()` - Swap numerator and denominator
- `equals(other)` - Check equality (including time for timed prices)

### `ExchangeRate`

- Inherits all `Price` methods
- `constructor(a, b, time?)` - Create with optional timestamp
- Automatic timestamping for exchange rate tracking

## Comparison with dinero.js

| Feature | cent | dinero.js |
|---------|------|-----------|
| **Precision** | Arbitrary (BigInt) | Limited (Number) |
| **Max Value** | Unlimited | ~9 quadrillion |
| **Crypto Support** | Native (8-18 decimals) | Limited |
| **Exact Division** | Guaranteed* | No |
| **Type Safety** | Full TypeScript | Partial |
| **Immutability** | Yes | Yes |
| **Performance** | Excellent | Good |

*For divisors composed of factors 2 and 5 only
