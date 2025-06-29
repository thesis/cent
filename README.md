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
- **🧮 Exact Mathematics**: Fxied point math that guarantees exacy results, with options for non-fixed calculations.
- **🌍 Comprehensive Currency Database**: Built-in support for 180+ world currencies
- **🎯 Type Safety**: Full TypeScript support with strict type checking
- **🔄 Immutable**: All operations return new instances, preventing accidental mutations
- **✨ Ergonomic API**: Clean factory functions for creating numbers from strings

## Quick start 💰

```typescript
import { Money, Price } from '@your-org/cent'

// Creation
const usd = Money("$100.50")
const btc = Money("0.5 BTC")

// Arithmetic
const total = usd.add(Money("$25.25"))  // $125.75

// Conversion with precision preservation
const price = new Price(Money("$50,000"), Money("1 BTC"))
const converted = usd.convert(price)    // Exact BTC amount

// Allocation and distribution
const [first, second, third] = usd.allocate([1, 2, 1])    // [$25.13, $50.25, $25.12]
const [a, b, c] = usd.distribute(3)                      // [$33.50, $33.50, $33.50]

// Formatting
usd.toString({ locale: "en-US", compact: true })  // "$100.50"
btc.toString({ preferredUnit: "satoshi" })        // "50,000,000 sat"
```

### `Money()`

The `Money()` factory function makes working with currencies simple:

```typescript
import { Money } from '@your-org/cent'

// Parse currency symbols with auto-detection
const usd = Money('$1,234.56')    // US Dollar: $1,234.56
const eur = Money('€1.234,56')    // Euro (EU format): €1,234.56
const gbp = Money('£999.99')      // British Pound: £999.99
const jpy = Money('¥50,000')      // Japanese Yen: ¥50,000

// Parse currency codes (case insensitive)
const dollars = Money('USD 100.50')
const euros = Money('100.50 EUR')

// Parse cryptocurrency main units
const bitcoin = Money('₿2.5')           // Bitcoin: 2.5 BTC
const ethereum = Money('ETH 10.123456') // Ethereum: 10.123456 ETH

// Parse cryptocurrency sub-units
const satoshis = Money('1000 sat')      // 1000 satoshis = 0.00001000 BTC
const wei = Money('1000000 wei')        // 1000000 wei = 0.000000000001 ETH
const gwei = Money('50 gwei')           // 50 gwei = 0.00000005 ETH

// Supports negative amounts
const debt = Money('-$500.25')
const refund = Money('€-123.45')

// Financial precision - allows sub-cent amounts
const precise = Money('$100.12345')    // 5 decimal places preserved
const microYen = Money('¥1000.001')    // Sub-yen precision
```

**Symbol Priority**: When symbols are shared (like $ for multiple currencies), the most traded currency takes priority based on global trading volume: `$` → USD, `£` → GBP, `¥` → JPY. Use explicit currency codes for other currencies: `AUD 100`, `CAD 50`.

### 🧮 Arbitrary precision math

```typescript
import { FixedPoint, Rational } from '@your-org/cent'

const x = FixedPoint('125.50')
const y = FixedPoint('0.875')

// Arithmetic operations with fixed precision
const product = x.multiply(y)
console.log(product.toString()) // "109.812"

// Create rational numbers from fractions or decimals
const oneThird = Rational('1/3')
const decimal = Rational('0.25')

console.log(oneThird.toString()) // "1/3"
console.log(decimal.toString()) // "1/4" (simplified)

// Seamless conversion between types
const fromRational = FixedPoint(oneThird.toDecimalString(6)) // 6 decimal places
console.log(fromRational.toString()) // "0.333333"
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

// Allocation and distribution
const budget = Money("$1000")

// Allocate proportionally by ratios
const [marketing, development, operations] = budget.allocate([2, 5, 3])
// Results: [$200, $500, $300] (2:5:3 ratio)

// Distribute evenly
const [alice, bob, charlie] = budget.distribute(3)
// Results: [$333.34, $333.33, $333.33] (remainder to first)

// Handle fractional units separately
const precise = Money("$100.00015")
const parts = precise.distribute(3, { distributeFractionalUnits: false })
// Results: [$33.33, $33.33, $33.34, $0.00015] (change separated)
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
import { FixedPoint, Rational } from '@your-org/cent'

// FixedPoint - Perfect for decimal numbers
const price = FixedPoint('1255.50')  // Auto-detects 2 decimals
const rate = FixedPoint('0.875')     // Auto-detects 3 decimals

// Arithmetic operations with automatic precision handling
const product = price.multiply(rate)
console.log(product.toString()) // "1098.562"

// Precise division (only multiples of 2 and 5)
const half = price.divide(2n)
const fifth = price.divide(5n)
const tenth = price.divide(10n)

// Comparison operations
console.log(price.greaterThan(rate)) // true
console.log(price.lessThanOrEqual(rate)) // false

// Also supports original constructor for explicit control
const explicit = FixedPoint(125550n, 2n) // Same as FixedPoint('1255.50')

// Rational - fractions and exact arithmetic

// Create from fraction strings
const oneThird = Rational('1/3')
const twoFifths = Rational('2/5')

// Create from decimal strings (auto-converted to fractions)
const quarter = Rational('0.25') // Becomes 1/4
const decimal = Rational('0.125') // Becomes 1/8

// Create directly from bigint numerator and denominator
const pi = Rational(22n, 7n) // 22/7 approximation of π
const oneThird = Rational(1n, 3n) // 1/3

// Exact arithmetic
const sum = oneThird.add(twoFifths) // (1/3) + (2/5) = 11/15
console.log(sum.toString()) // "11/15"

const product = oneThird.multiply(twoFifths) // (1/3) * (2/5) = 2/15
console.log(product.toString()) // "2/15"

// Automatic simplification
const simplified = Rational('6/9')
console.log(simplified.toString()) // "2/3"

// Also supports original constructor
const explicit = Rational({ p: 1n, q: 10n }) // Same as Rational('1/10')

// Seamless conversion between types
const rational = Rational('3/8')
const decimalStr = rational.toDecimalString() // "0.375"
const fixedPoint = FixedPoint(decimalStr) // Auto-detects 3 decimals
console.log(fixedPoint.toString()) // "0.375"
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
// while this is fun, remember that there might not be apple-to-BTC liquidity 😉
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
const revenue = Money("$12,345.67")

// Proportional allocation by department budgets
const [marketing, engineering, sales, operations] = revenue.allocate([2, 5, 2, 1])
// Results: [$2,469.13, $6,172.84, $2,469.13, $1,234.57] (2:5:2:1 ratio)

// Even distribution among team members
const bonus = Money("$10,000")
const [alice, bob, charlie] = bonus.distribute(3)
// Results: [$3,333.34, $3,333.33, $3,333.33] (remainder to first recipient)

// Handle fractional units for precision accounting
const preciseAmount = Money("$1,000.00123") // High-precision amount
const parts = preciseAmount.allocate([1, 1, 1], { distributeFractionalUnits: false })
// Results: [$333.33, $333.33, $333.34, $0.00123] 
// Main allocations clean, fractional $0.00123 can go to a separate ledger

// Traditional concretization for currency sub-units
const [main, change] = preciseAmount.concretize() 
console.log(main.toString())   // "$1,000.00" (standard currency precision)
console.log(change.toString()) // "$0.00123" (sub-unit precision)
```

## API reference

### Factory Functions

**`Money()`** - Parse currency strings with intelligent format detection
- `Money(str)` - Parse currency strings with symbols, codes, and crypto units
  - Currency symbols: `Money('$100.50')`, `Money('€1.234,56')`, `Money('£999')`
  - Currency codes: `Money('USD 100')`, `Money('100.50 EUR')` (case insensitive)
  - Crypto main units: `Money('₿2.5')`, `Money('ETH 10.123456')`
  - Crypto sub-units: `Money('1000 sat')`, `Money('50 gwei')`, `Money('1000000 wei')`
  - Negative amounts: `Money('-$500')`, `Money('$-123.45')`
  - Sub-unit precision: `Money('$100.12345')` (preserves exact precision)
- `Money(balance)` - Create from AssetAmount object (original constructor)

**`FixedPoint()`** - Create fixed-point numbers with ease
- `FixedPoint(str)` - Parse decimal string, auto-detect precision (e.g., `FixedPoint('123.45')`)
- `FixedPoint(fixedPoint)` - Copy/clone existing FixedPoint object (e.g., `FixedPoint(existing)`)
- `FixedPoint(amount, decimals)` - Create from bigint values (e.g., `FixedPoint(12345n, 2n)`)

**`Rational()`** - Create rational numbers from strings, bigints, or objects
- `Rational(str)` - Parse fraction (e.g., `Rational('22/7')`) or decimal (e.g., `Rational('0.125')`)
- `Rational(p, q)` - Create from bigint numerator and denominator (e.g., `Rational(22n, 7n)`)
- `Rational(ratio)` - Create from Ratio object (e.g., `Rational({ p: 1n, q: 3n })`)

### `Money`

**Arithmetic Operations:**
- `add(other)` - Add money amounts (same currency)
- `subtract(other)` - Subtract money amounts (same currency)
- `multiply(scalar)` - Multiply by number or FixedPoint
- `absolute()` - Get absolute value
- `negate()` - Flip sign (multiply by -1)

**Allocation & Distribution:**
- `allocate(ratios, options?)` - Split proportionally by ratios with optional fractional unit separation
- `distribute(parts, options?)` - Split evenly into N parts with optional fractional unit separation
- `concretize()` - Split into concrete amount and change

**Comparison Methods:**
- `equals(other)` - Check equality
- `lessThan(other)` - Less than comparison
- `greaterThan(other)` - Greater than comparison
- `lessThanOrEqual(other)` - Less than or equal comparison
- `greaterThanOrEqual(other)` - Greater than or equal comparison
- `max(other | others[])` - Return maximum value
- `min(other | others[])` - Return minimum value

**State Checks:**
- `isZero()` - Check if amount is zero
- `isPositive()` - Check if amount is positive
- `isNegative()` - Check if amount is negative
- `hasChange()` - Check if has fractional part
- `hasSubUnits()` - Check if has sub-units beyond currency precision

**Conversion & Formatting:**
- `convert(price)` - Convert to another currency using price/exchange rate
- `toString(options)` - Format for display with locale, precision, and unit options
- `toJSON()` - Serialize to JSON
- `fromJSON(json)` - Deserialize from JSON

### `FixedPointNumber`

- `add(other)` - Addition
- `subtract(other)` - Subtraction
- `multiply(other)` - Multiplication
- `divide(other)` - Safe division
- `normalize(target)` - Change decimal precision
- `equals(other)` - Equality check
- `toString()` - DecimalString representation
- `parseString(str, decimals)` - Parse from string with explicit decimals
- `fromDecimalString(str)` - Parse from DecimalString with auto-detected decimals

### `RationalNumber`

- `add(other)` - Exact addition
- `subtract(other)` - Exact subtraction
- `multiply(other)` - Exact multiplication
- `divide(other)` - Exact division
- `simplify()` - Reduce to lowest terms
- `toString()` - Convert to simplified "p/q" string format
- `toDecimalString(precision?)` - Convert to DecimalString (default 50 digits)
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
| **Allocation/Distribution** | Advanced with fractional unit separation | Basic |
| **Exact Division** | Guaranteed* | No |
| **Type Safety** | Full TypeScript | Partial |
| **Immutability** | Yes | Yes |
| **Performance** | Excellent | Good |

*For divisors composed of factors 2 and 5 only
