import { AssetAmount, FixedPoint, Ratio, UNIXTime, AnyAsset, Currency, RoundingMode } from "./types"
import { Money as MoneyClass } from "./money"
import { assetsEqual } from "./assets"
import { RationalNumber } from "./rationals"
import { nowUNIXTime, toUNIXTime } from "./time"
import { FixedPointNumber } from "./fixed-point"
import type { ExchangeRateSource } from "./exchange-rate-sources"

/**
 * Price class for representing price ratios between assets
 * This is a simplified version for backward compatibility
 */
export class Price {
  readonly amounts: [AssetAmount, AssetAmount]

  readonly time: UNIXTime

  constructor(
    a: AssetAmount | MoneyClass,
    b: AssetAmount | MoneyClass,
    time?: UNIXTime | string,
  ) {
    // Convert Money instances to AssetAmount
    const amountA = a instanceof MoneyClass ? a.balance : a
    const amountB = b instanceof MoneyClass ? b.balance : b

    this.amounts = [amountA, amountB]
    if (time) {
      this.time = typeof time === "string" ? toUNIXTime(time) : time
    } else {
      this.time = nowUNIXTime()
    }
  }

  /**
   * Invert this Price by swapping the order of amounts
   */
  invert(): Price {
    return new Price(this.amounts[1], this.amounts[0], this.time)
  }

  /**
   * Get the ratio of amounts[0] / amounts[1] as a Ratio
   */
  asRatio(): RationalNumber {
    const [amount0, amount1] = this.amounts

    // Create a normalized ratio: (amount0 / 10^decimals0) / (amount1 / 10^decimals1)
    // This simplifies to: (amount0 * 10^decimals1) / (amount1 * 10^decimals0)
    return new RationalNumber({
      p: amount0.amount.amount * 10n ** amount1.amount.decimals,
      q: amount1.amount.amount * 10n ** amount0.amount.decimals,
    })
  }

  /**
   * Multiply this Price by a scalar value or another Price
   */
  multiply(multiplier: bigint | FixedPoint | Ratio | Price): Price {
    // Handle Price-to-Price multiplication
    if (multiplier instanceof Price) {
      return this.multiplyByPrice(multiplier)
    }

    // Handle scalar multiplication
    const scalar = multiplier
    let multiplierP: bigint
    let multiplierQ: bigint

    if (typeof scalar === "bigint") {
      multiplierP = scalar
      multiplierQ = 1n
    } else if ("amount" in scalar && "decimals" in scalar) {
      // FixedPoint: treat as p/q where q = 10^decimals
      multiplierP = scalar.amount
      multiplierQ = 10n ** scalar.decimals
    } else {
      // Ratio
      multiplierP = scalar.p
      multiplierQ = scalar.q
    }

    // For a price ratio A/B, multiplying by p/q gives us (A*p/q)/B
    const newAmountA = {
      asset: this.amounts[0].asset,
      amount: {
        amount:
          (BigInt(this.amounts[0].amount.amount) * BigInt(multiplierP)) /
          BigInt(multiplierQ),
        decimals: this.amounts[0].amount.decimals,
      },
    }

    const newAmountB = {
      asset: this.amounts[1].asset,
      amount: {
        amount: this.amounts[1].amount.amount,
        decimals: this.amounts[1].amount.decimals,
      },
    }

    return new Price(newAmountA, newAmountB, this.time)
  }

  /**
   * Divide this Price by a scalar value or another Price
   */
  divide(divisor: bigint | FixedPoint | Ratio | Price): Price {
    // Handle Price-to-Price division (multiply by inverse)
    if (divisor instanceof Price) {
      return this.multiplyByPrice(divisor.invert())
    }
    // Division is multiplication by the inverted ratio
    let invertedRatio: Ratio

    if (typeof divisor === "bigint") {
      if (divisor === 0n) {
        throw new Error("Cannot divide by zero")
      }
      invertedRatio = { p: 1n, q: divisor }
    } else if ("amount" in divisor && "decimals" in divisor) {
      // FixedPoint: invert p/q to q/p where q = 10^decimals
      if (divisor.amount === 0n) {
        throw new Error("Cannot divide by zero")
      }
      invertedRatio = { p: 10n ** divisor.decimals, q: divisor.amount }
    } else {
      // Ratio: invert p/q to q/p
      if (divisor.p === 0n) {
        throw new Error("Cannot divide by zero")
      }
      invertedRatio = { p: divisor.q, q: divisor.p }
    }

    return this.multiply(invertedRatio)
  }

  /**
   * Check if this Price is equal to another Price
   */
  equals(other: Price): boolean {
    // Check if times are equal
    if (this.time !== other.time) {
      return false
    }

    // Check if amounts match (either in same order or inverted order)
    const sameOrder =
      assetsEqual(this.amounts[0].asset, other.amounts[0].asset) &&
      assetsEqual(this.amounts[1].asset, other.amounts[1].asset) &&
      this.amounts[0].amount === other.amounts[0].amount &&
      this.amounts[1].amount === other.amounts[1].amount

    const invertedOrder =
      assetsEqual(this.amounts[0].asset, other.amounts[1].asset) &&
      assetsEqual(this.amounts[1].asset, other.amounts[0].asset) &&
      this.amounts[0].amount === other.amounts[1].amount &&
      this.amounts[1].amount === other.amounts[0].amount

    return sameOrder || invertedOrder
  }

  /**
   * Multiply this Price by another Price with asset validation
   */
  private multiplyByPrice(other: Price): Price {
    // Check for shared assets that allow multiplication
    // Case 1: this.amounts[1].asset === other.amounts[0].asset (A/B * B/C = A/C)
    if (assetsEqual(this.amounts[1].asset, other.amounts[0].asset)) {
      const newAmountA = {
        asset: this.amounts[0].asset,
        amount: {
          amount:
            (this.amounts[0].amount.amount * other.amounts[0].amount.amount) /
            this.amounts[1].amount.amount,
          decimals: this.amounts[0].amount.decimals,
        },
      }

      const newAmountB = {
        asset: other.amounts[1].asset,
        amount: {
          amount: other.amounts[1].amount.amount,
          decimals: other.amounts[1].amount.decimals,
        },
      }

      return new Price(newAmountA, newAmountB, this.time)
    }

    // Case 2: this.amounts[0].asset === other.amounts[1].asset (A/B * C/A = C/B)
    if (assetsEqual(this.amounts[0].asset, other.amounts[1].asset)) {
      const newAmountA = {
        asset: other.amounts[0].asset,
        amount: {
          amount:
            (other.amounts[0].amount.amount * this.amounts[0].amount.amount) /
            other.amounts[1].amount.amount,
          decimals: other.amounts[0].amount.decimals,
        },
      }

      const newAmountB = {
        asset: this.amounts[1].asset,
        amount: {
          amount: this.amounts[1].amount.amount,
          decimals: this.amounts[1].amount.decimals,
        },
      }

      return new Price(newAmountA, newAmountB, this.time)
    }

    const getAssetName = (asset: AnyAsset) =>
      asset.name || ("code" in asset ? asset.code : "Unknown Asset")
    throw new Error(
      `Cannot multiply prices: no shared asset found between ${getAssetName(this.amounts[0].asset)}/${getAssetName(this.amounts[1].asset)} and ${getAssetName(other.amounts[0].asset)}/${getAssetName(other.amounts[1].asset)}`,
    )
  }

  /**
   * Convert this Price to an ExchangeRate with configurable precision
   * 
   * @param options Configuration options for the conversion
   * @returns A new ExchangeRate instance
   */
  toExchangeRate(options?: {
    decimals?: number | bigint,
    baseCurrency?: Currency,
    roundingMode?: RoundingMode,
    source?: ExchangeRateSource,
    timestamp?: UNIXTime | string
  }): import('./exchange-rates').ExchangeRate {
    const ExchangeRateClass = require('./exchange-rates').ExchangeRate
    
    // Validate that both assets are currencies
    const currency1 = this.amounts[0].asset as Currency
    const currency2 = this.amounts[1].asset as Currency
    
    if (!('code' in currency1) || !('code' in currency2)) {
      throw new Error('Cannot create ExchangeRate: both assets must be currencies with codes')
    }
    
    // Check for identical currencies
    if (assetsEqual(currency1, currency2)) {
      const code = currency1.code || currency1.name
      throw new Error(`Cannot create ExchangeRate: both currencies are the same (${code})`)
    }

    // Determine base/quote currencies using "best" currency logic
    let baseCurrency: Currency
    let quoteCurrency: Currency
    let rate: FixedPointNumber

    // Use explicit baseCurrency if provided
    if (options?.baseCurrency) {
      if (assetsEqual(options.baseCurrency, currency1)) {
        baseCurrency = currency1
        quoteCurrency = currency2
        // Rate = amount2 / amount1 (how much of currency2 per 1 unit of currency1)
        rate = this.calculateExchangeRate(this.amounts[1], this.amounts[0], options.decimals)
      } else if (assetsEqual(options.baseCurrency, currency2)) {
        baseCurrency = currency2
        quoteCurrency = currency1
        // Rate = amount1 / amount2 (how much of currency1 per 1 unit of currency2)
        rate = this.calculateExchangeRate(this.amounts[0], this.amounts[1], options.decimals)
      } else {
        const baseName = options.baseCurrency.code || options.baseCurrency.name
        const curr1Name = currency1.code || currency1.name
        const curr2Name = currency2.code || currency2.name
        throw new Error(`Specified baseCurrency (${baseName}) does not match either price currency (${curr1Name}, ${curr2Name})`)
      }
    } else {
      // Auto-select best currency as base (closest to 1)
      const ratio1 = this.getAmountRatio(this.amounts[0])  // currency1 amount
      const ratio2 = this.getAmountRatio(this.amounts[1])  // currency2 amount
      
      const distance1 = this.distanceFromOne(ratio1)
      const distance2 = this.distanceFromOne(ratio2)

      if (distance2 < distance1) {
        // currency2 is closer to 1, make it base
        baseCurrency = currency2
        quoteCurrency = currency1
        rate = this.calculateExchangeRate(this.amounts[0], this.amounts[1], options?.decimals)
      } else if (distance1 < distance2) {
        // currency1 is closer to 1, make it base
        baseCurrency = currency1
        quoteCurrency = currency2
        rate = this.calculateExchangeRate(this.amounts[1], this.amounts[0], options?.decimals)
      } else {
        // Equal distances, use argument order (second becomes base)
        baseCurrency = currency2
        quoteCurrency = currency1
        rate = this.calculateExchangeRate(this.amounts[0], this.amounts[1], options?.decimals)
      }
    }

    // Set up default source metadata
    const defaultSource: ExchangeRateSource = {
      name: 'Converted from Price',
      priority: 3,
      reliability: 0.8
    }

    // Create the ExchangeRate
    return new ExchangeRateClass({
      baseCurrency,
      quoteCurrency,
      rate,
      timestamp: options?.timestamp || this.time,
      source: options?.source || defaultSource
    })
  }

  /**
   * Calculate exchange rate between two amounts with specified precision
   */
  private calculateExchangeRate(
    numeratorAmount: AssetAmount,
    denominatorAmount: AssetAmount,
    decimals?: number | bigint
  ): FixedPointNumber {
    // Use RationalNumber for precise calculation
    const numeratorRational = new RationalNumber({
      p: numeratorAmount.amount.amount,
      q: 10n ** numeratorAmount.amount.decimals,
    })

    const denominatorRational = new RationalNumber({
      p: denominatorAmount.amount.amount,
      q: 10n ** denominatorAmount.amount.decimals,
    })

    const rateRational = numeratorRational.divide(denominatorRational)

    // Determine target decimals
    let targetDecimals: bigint
    if (decimals !== undefined) {
      targetDecimals = typeof decimals === 'bigint' ? decimals : BigInt(decimals)
    } else {
      // Default to max decimals of the two currencies
      const curr1Decimals = 'decimals' in numeratorAmount.asset ? numeratorAmount.asset.decimals : 8n
      const curr2Decimals = 'decimals' in denominatorAmount.asset ? denominatorAmount.asset.decimals : 8n
      targetDecimals = curr1Decimals > curr2Decimals ? curr1Decimals : curr2Decimals
    }

    // Convert to FixedPointNumber with target precision
    const fixedPoint = rateRational.toFixedPoint({ maxBits: 256 })
    
    // Normalize to target decimals
    const result = new FixedPointNumber(fixedPoint.amount, fixedPoint.decimals)
    const target = new FixedPointNumber(0n, targetDecimals)
    const normalizedResult = result.normalize(target)
    
    // Check for significant precision loss and warn
    this.checkPrecisionLoss(rateRational, normalizedResult, targetDecimals)
    
    return normalizedResult
  }

  /**
   * Get the decimal ratio of an amount (amount / 10^decimals)
   */
  private getAmountRatio(amount: AssetAmount): number {
    const numerator = Number(amount.amount.amount)
    const denominator = Number(10n ** amount.amount.decimals)
    return numerator / denominator
  }

  /**
   * Calculate distance from 1.0
   */
  private distanceFromOne(value: number): number {
    return Math.abs(value - 1.0)
  }

  /**
   * Check for precision loss during conversion and warn if significant
   */
  private checkPrecisionLoss(
    originalRational: RationalNumber,
    convertedFixed: FixedPointNumber,
    targetDecimals: bigint
  ): void {
    // Convert the fixed point result back to rational for comparison
    const convertedRational = new RationalNumber({
      p: convertedFixed.amount,
      q: 10n ** convertedFixed.decimals,
    })

    // Calculate relative error
    const difference = originalRational.subtract(convertedRational)
    const relativeError = difference.divide(originalRational)
    
    // Convert to decimal for comparison (using high precision)
    const errorDecimal = Math.abs(parseFloat(relativeError.toDecimalString(20n)))
    
    // Warn if precision loss is significant (> 0.01% or 0.0001)
    const significantThreshold = 0.0001
    if (errorDecimal > significantThreshold) {
      const currency1 = this.amounts[0].asset
      const currency2 = this.amounts[1].asset
      const curr1Name = ('code' in currency1 ? currency1.code : currency1.name) || 'Unknown'
      const curr2Name = ('code' in currency2 ? currency2.code : currency2.name) || 'Unknown'
      
      console.warn(
        `Warning: Significant precision loss detected when converting Price (${curr1Name}/${curr2Name}) to ExchangeRate with ${targetDecimals} decimals. ` +
        `Relative error: ${(errorDecimal * 100).toFixed(4)}%. ` +
        `Consider using higher decimal precision for more accuracy.`
      )
    }
  }
}
