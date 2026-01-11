import { assetsEqual, isAssetAmount } from "../assets"
import { getConfig } from "../config"
import { getCurrencyFromCode } from "../currencies"
import {
  CurrencyMismatchError,
  DivisionError,
  ErrorCode,
  InvalidInputError,
  ParseError,
  PrecisionLossError,
  ValidationError,
} from "../errors"
import { FixedPointNumber } from "../fixed-point"
import { isOnlyFactorsOf2And5 } from "../math-utils"
import { RationalNumber } from "../rationals"
import type { AssetAmount, Currency, FixedPoint, RoundingMode } from "../types"
import { parseMoneyString } from "./parsing"
import type { MoneyAmount } from "./types"
import {
  isFixedPointNumber,
  isNegative as isMoneyAmountNegative,
  isPositive as isMoneyAmountPositive,
  isZero as isMoneyAmountZero,
  isRationalNumber,
  toFixedPointNumber,
} from "./utils"

export type { MoneyToStringOptions } from "./formatting"
// Re-export from formatting
export {
  convertToPreferredUnit,
  formatWithCustomFormatting,
  formatWithIntlCurrency,
  getCurrencyDisplayPart,
  normalizeLocale,
  shouldUseIsoFormatting,
} from "./formatting"

// Re-export from fractional-units
export {
  findFractionalUnitInfo,
  pluralizeFractionalUnit,
} from "./fractional-units"
export type { MoneyJSON } from "./schemas"
// Re-export from schemas
export {
  AnyAssetJSONSchema,
  AssetJSONSchema,
  CurrencyJSONSchema,
  FungibleAssetJSONSchema,
  MoneyJSONSchema,
  safeValidateMoneyJSON,
} from "./schemas"

// Import crypto currencies for sub-unit registry
import { BTC, ETH, SOL } from "../currencies/crypto"
import { USD, EUR, GBP, JPY } from "../currencies/fiat"

/**
 * Registry of known sub-units and their corresponding currencies/decimals.
 * The decimals value represents the number of decimal places for the sub-unit.
 */
const SUB_UNIT_REGISTRY: Record<string, { currency: Currency; decimals: number }> = {
  // Bitcoin sub-units
  satoshi: { currency: BTC, decimals: 8 },
  sat: { currency: BTC, decimals: 8 },
  sats: { currency: BTC, decimals: 8 },
  millisatoshi: { currency: BTC, decimals: 11 },
  msat: { currency: BTC, decimals: 11 },
  msats: { currency: BTC, decimals: 11 },

  // Ethereum sub-units
  wei: { currency: ETH, decimals: 18 },
  kwei: { currency: ETH, decimals: 15 },
  babbage: { currency: ETH, decimals: 15 },
  mwei: { currency: ETH, decimals: 12 },
  lovelace: { currency: ETH, decimals: 12 },
  gwei: { currency: ETH, decimals: 9 },
  shannon: { currency: ETH, decimals: 9 },
  szabo: { currency: ETH, decimals: 6 },
  finney: { currency: ETH, decimals: 3 },

  // Solana sub-units
  lamport: { currency: SOL, decimals: 9 },
  lamports: { currency: SOL, decimals: 9 },

  // Fiat sub-units (for convenience)
  cent: { currency: USD, decimals: 2 },
  cents: { currency: USD, decimals: 2 },
  penny: { currency: GBP, decimals: 2 },
  pence: { currency: GBP, decimals: 2 },
  eurocent: { currency: EUR, decimals: 2 },
  yen: { currency: JPY, decimals: 0 },
}

// Import formatting functions for internal use
import {
  formatWithCustomFormatting,
  formatWithIntlCurrency,
  type MoneyToStringOptions,
  safeNumberFromBigInt,
  shouldUseIsoFormatting,
} from "./formatting"
import type { MoneyJSON } from "./schemas"
// Import schemas for internal use
import { MoneyJSONSchema } from "./schemas"

export class Money {
  readonly currency: Currency

  readonly amount: MoneyAmount

  /**
   * Create a new Money instance
   *
   * @param currency - The currency for this money
   * @param amount - The amount as either FixedPointNumber or RationalNumber
   */
  constructor(currency: Currency, amount: MoneyAmount)
  /**
   * Create a new Money instance (backward compatibility)
   *
   * @param balance - The asset amount balance
   */
  constructor(balance: AssetAmount)
  constructor(currencyOrBalance: Currency | AssetAmount, amount?: MoneyAmount) {
    if (amount !== undefined) {
      // New constructor: (currency, amount)
      this.currency = currencyOrBalance as Currency
      this.amount = amount
    } else {
      // Legacy constructor: (balance)
      const balance = currencyOrBalance as AssetAmount
      this.currency = balance.asset as Currency
      this.amount = new FixedPointNumber(
        balance.amount.amount,
        balance.amount.decimals,
      )
    }
  }

  /**
   * Helper method to convert string arguments to Money instances
   *
   * @param value - String representation or existing Money instance
   * @param referenceCurrency - Currency to validate against if value is a string
   * @returns Money instance
   * @throws Error if string parsing fails or currencies don't match
   */
  private static parseStringToMoney(
    value: string | Money,
    referenceCurrency: Currency,
  ): Money {
    if (value instanceof Money) {
      return value
    }

    // Parse the string to get a Money instance
    const parseResult = parseMoneyString(value)
    const parsed = new Money({
      asset: parseResult.currency,
      amount: {
        amount: parseResult.amount.amount,
        decimals: parseResult.amount.decimals,
      },
    })

    // Validate that currencies match
    if (!assetsEqual(parsed.currency, referenceCurrency)) {
      throw new CurrencyMismatchError(
        referenceCurrency.code || referenceCurrency.name,
        parsed.currency.code || parsed.currency.name,
        "parse",
      )
    }

    return parsed
  }

  /**
   * Get the asset for this Money instance (convenience getter for backward compatibility)
   */
  get asset() {
    return this.currency
  }

  /**
   * Get the balance as AssetAmount for backward compatibility
   */
  get balance(): AssetAmount {
    const fixedPoint = isFixedPointNumber(this.amount)
      ? this.amount
      : toFixedPointNumber(this.amount)

    return {
      asset: this.currency,
      amount: {
        amount: fixedPoint.amount,
        decimals: fixedPoint.decimals,
      },
    }
  }

  /**
   * Add money, an asset amount, or a percentage to this Money instance.
   *
   * When a percentage string is provided (e.g., "8.25%"), the result is
   * `this * (1 + percent/100)`. This is useful for adding tax or tips.
   *
   * @param other - The Money, AssetAmount, string representation, or percentage to add
   * @param round - Optional rounding mode when adding percentages
   * @returns A new Money instance with the sum
   * @throws Error if the assets are not the same type
   *
   * @example
   * const price = Money("$100.00");
   * price.add(Money("$10.00"));  // $110.00
   * price.add("$10.00");         // $110.00
   * price.add("8.25%");          // $108.25 (add 8.25% tax)
   * price.add("20%");            // $120.00 (add 20% tip)
   */
  add(other: Money | AssetAmount | string, round?: RoundingMode): Money {
    // Check for percentage string first
    if (typeof other === "string") {
      const percentDecimal = parsePercentage(other)
      if (percentDecimal !== null) {
        // add("8.25%") means: amount * (1 + 0.0825) = amount * 1.0825
        const one = new FixedPointNumber(1n, 0n)
        const multiplier = one.add(percentDecimal)
        return this.multiply(multiplier, round)
      }
    }

    let otherMoney: Money
    if (typeof other === "string") {
      otherMoney = Money.parseStringToMoney(other, this.currency)
    } else if (other instanceof Money) {
      otherMoney = other
    } else {
      otherMoney = new Money(other)
    }

    if (!assetsEqual(this.currency, otherMoney.currency)) {
      throw new CurrencyMismatchError(
        this.currency.code || this.currency.name,
        otherMoney.currency.code || otherMoney.currency.name,
        "add",
      )
    }

    // If both are FixedPointNumber, use fast path
    if (
      isFixedPointNumber(this.amount) &&
      isFixedPointNumber(otherMoney.amount)
    ) {
      const result = this.amount.add(otherMoney.amount)
      return new Money(this.currency, result)
    }

    // If either is RationalNumber, convert both to RationalNumber and add
    const thisRational = isRationalNumber(this.amount)
      ? this.amount
      : new RationalNumber({ p: this.amount.amount, q: this.amount.q })

    const otherRational = isRationalNumber(otherMoney.amount)
      ? otherMoney.amount
      : new RationalNumber({
          p: otherMoney.amount.amount,
          q: otherMoney.amount.q,
        })

    const result = thisRational.add(otherRational)
    return new Money(this.currency, result)
  }

  /**
   * Subtract money, an asset amount, or a percentage from this Money instance.
   *
   * When a percentage string is provided (e.g., "10%"), the result is
   * `this * (1 - percent/100)`. This is useful for discounts.
   *
   * @param other - The Money, AssetAmount, string representation, or percentage to subtract
   * @param round - Optional rounding mode when subtracting percentages
   * @returns A new Money instance with the difference
   * @throws Error if the assets are not the same type
   *
   * @example
   * const price = Money("$100.00");
   * price.subtract(Money("$10.00"));  // $90.00
   * price.subtract("$10.00");         // $90.00
   * price.subtract("10%");            // $90.00 (10% discount)
   * price.subtract("25%");            // $75.00 (25% off)
   */
  subtract(other: Money | AssetAmount | string, round?: RoundingMode): Money {
    // Check for percentage string first
    if (typeof other === "string") {
      const percentDecimal = parsePercentage(other)
      if (percentDecimal !== null) {
        // subtract("10%") means: amount * (1 - 0.10) = amount * 0.90
        const one = new FixedPointNumber(1n, 0n)
        const multiplier = one.subtract(percentDecimal)
        return this.multiply(multiplier, round)
      }
    }

    let otherMoney: Money
    if (typeof other === "string") {
      otherMoney = Money.parseStringToMoney(other, this.currency)
    } else if (other instanceof Money) {
      otherMoney = other
    } else {
      otherMoney = new Money(other)
    }

    if (!assetsEqual(this.currency, otherMoney.currency)) {
      throw new CurrencyMismatchError(
        this.currency.code || this.currency.name,
        otherMoney.currency.code || otherMoney.currency.name,
        "subtract",
      )
    }

    // If both are FixedPointNumber, use fast path
    if (
      isFixedPointNumber(this.amount) &&
      isFixedPointNumber(otherMoney.amount)
    ) {
      const result = this.amount.subtract(otherMoney.amount)
      return new Money(this.currency, result)
    }

    // If either is RationalNumber, convert both to RationalNumber and subtract
    const thisRational = isRationalNumber(this.amount)
      ? this.amount
      : new RationalNumber({ p: this.amount.amount, q: this.amount.q })

    const otherRational = isRationalNumber(otherMoney.amount)
      ? otherMoney.amount
      : new RationalNumber({
          p: otherMoney.amount.amount,
          q: otherMoney.amount.q,
        })

    const result = thisRational.subtract(otherRational)
    return new Money(this.currency, result)
  }

  /**
   * Concretize this Money instance to the asset's decimal precision
   *
   * @returns A tuple of [concrete, change] Money instances
   * @throws Error if the asset is not a FungibleAsset
   */
  concretize(): [Money, Money] {
    // Check if the asset has a decimals property (is a FungibleAsset)
    if (!("decimals" in this.balance.asset)) {
      throw new InvalidInputError(
        "Cannot concretize Money with non-fungible asset",
        {
          suggestion: "Use a fungible asset (like a currency) that has decimal precision defined.",
        },
      )
    }

    const assetDecimals = this.balance.asset.decimals
    const currentDecimals = this.balance.amount.decimals

    // If already at the correct precision, return original and zero change
    if (currentDecimals === assetDecimals) {
      const zeroChange = new Money({
        asset: this.balance.asset,
        amount: {
          amount: 0n,
          decimals: assetDecimals,
        },
      })
      return [this, zeroChange]
    }

    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )

    // Normalize to asset decimals (this will round down if we're going to fewer decimals)
    const concreteFixedPoint = thisFixedPoint.normalize(
      {
        amount: 0n,
        decimals: assetDecimals,
      },
      true,
    )

    // Create the concrete Money instance
    const concrete = new Money({
      asset: this.balance.asset,
      amount: {
        amount: concreteFixedPoint.amount,
        decimals: assetDecimals,
      },
    })

    // Calculate the change by subtracting concrete from original
    const change = this.subtract(concrete)

    return [concrete, change]
  }

  /**
   * Multiply this Money instance by a scalar, fixed-point number, or percentage.
   *
   * When a percentage string is provided (e.g., "50%"), it multiplies by
   * the percentage as a decimal (50% = 0.50).
   *
   * @param factor - The value to multiply by (bigint, FixedPoint, decimal string, or percentage string)
   * @param round - Optional rounding mode to round result to currency precision
   * @returns A new Money instance with the product
   *
   * @example
   * const price = Money("$100.00");
   * price.multiply(3n);              // $300.00
   * price.multiply("1.5");           // $150.00
   * price.multiply("0.333", Round.HALF_UP);  // $33.30
   * price.multiply("50%");           // $50.00 (50% of $100)
   * price.multiply("150%");          // $150.00 (150% of $100)
   */
  multiply(
    factor: bigint | FixedPoint | string,
    round?: RoundingMode,
  ): Money {
    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )

    // Check for percentage string
    let factorValue: bigint | FixedPoint
    if (typeof factor === "string") {
      const percentDecimal = parsePercentage(factor)
      if (percentDecimal !== null) {
        // multiply("50%") means: amount * 0.50
        factorValue = percentDecimal
      } else {
        factorValue = FixedPointNumber.fromDecimalString(factor)
      }
    } else {
      factorValue = factor
    }

    const result = thisFixedPoint.multiply(factorValue)

    const money = new Money({
      asset: this.balance.asset,
      amount: {
        amount: result.amount,
        decimals: result.decimals,
      },
    })

    // If rounding is requested, round to currency precision
    if (round !== undefined) {
      return money.roundTo(Number(this.currency.decimals), round)
    }

    return money
  }

  /**
   * Divide this Money instance by a divisor.
   *
   * For divisors that are only composed of factors of 2 and 5 (like 2, 4, 5, 10, 20, 25, etc.),
   * the division is exact and no rounding mode is required.
   *
   * For other divisors (like 3, 7, 11, etc.), a rounding mode must be provided
   * to determine how to handle the non-terminating decimal result.
   *
   * @param divisor - The value to divide by (number, bigint, string, or FixedPoint)
   * @param round - Rounding mode (required for divisors with factors other than 2 and 5)
   * @returns A new Money instance with the quotient
   * @throws Error if dividing by zero
   * @throws Error if divisor requires rounding but no rounding mode provided
   *
   * @example
   * const price = Money("$100.00");
   *
   * // Exact division (no rounding needed)
   * price.divide(2);           // $50.00
   * price.divide(5);           // $20.00
   * price.divide(10);          // $10.00
   *
   * // Division requiring rounding
   * price.divide(3, Round.HALF_UP);    // $33.33
   * price.divide(7, Round.HALF_EVEN);  // $14.29
   *
   * // Error: rounding required
   * price.divide(3);  // Throws: "Division by 3 requires a rounding mode"
   *
   * @see {@link Round} for available rounding modes
   */
  divide(
    divisor: number | bigint | string | FixedPoint,
    round?: RoundingMode,
  ): Money {
    // Convert divisor to bigint for factor checking
    let divisorBigInt: bigint
    let divisorDecimals = 0n

    if (typeof divisor === "number") {
      if (!Number.isFinite(divisor)) {
        throw new DivisionError(
          divisor,
          "Cannot divide by Infinity or NaN",
          {
            code: ErrorCode.INVALID_DIVISOR,
            suggestion: "Use a finite number as the divisor.",
          },
        )
      }
      if (divisor === 0) {
        throw new DivisionError(0, "Cannot divide by zero")
      }
      // Convert number to string and parse as fixed-point
      const str = divisor.toString()
      const fp = FixedPointNumber.fromDecimalString(str)
      divisorBigInt = fp.amount < 0n ? -fp.amount : fp.amount
      divisorDecimals = fp.decimals
    } else if (typeof divisor === "bigint") {
      if (divisor === 0n) {
        throw new DivisionError(0n, "Cannot divide by zero")
      }
      divisorBigInt = divisor < 0n ? -divisor : divisor
    } else if (typeof divisor === "string") {
      const fp = FixedPointNumber.fromDecimalString(divisor)
      if (fp.amount === 0n) {
        throw new DivisionError(divisor, "Cannot divide by zero")
      }
      divisorBigInt = fp.amount < 0n ? -fp.amount : fp.amount
      divisorDecimals = fp.decimals
    } else {
      // FixedPoint object
      if (divisor.amount === 0n) {
        throw new DivisionError(divisor.amount, "Cannot divide by zero")
      }
      divisorBigInt = divisor.amount < 0n ? -divisor.amount : divisor.amount
      divisorDecimals = divisor.decimals
    }

    // Check if divisor is composed only of factors of 2 and 5
    const needsRounding = !isOnlyFactorsOf2And5(divisorBigInt)

    if (needsRounding && round === undefined) {
      const divisorStr = typeof divisor === "object"
        ? new FixedPointNumber(divisor.amount, divisor.decimals).toString()
        : String(divisor)
      throw new DivisionError(
        divisorStr,
        `Division by ${divisorStr} requires a rounding mode because ${divisorStr} contains factors other than 2 and 5.`,
        {
          code: ErrorCode.DIVISION_REQUIRES_ROUNDING,
          suggestion: `Use: amount.divide(${divisorStr}, Round.HALF_UP) or another rounding mode.`,
          example: `import { Round } from '@thesis-co/cent';\namount.divide(${divisorStr}, Round.HALF_UP);`,
        },
      )
    }

    // Get the amount as FixedPointNumber
    const thisFixedPoint = isFixedPointNumber(this.amount)
      ? this.amount
      : toFixedPointNumber(this.amount)

    // Perform division with rounding if needed
    if (needsRounding && round !== undefined) {
      // For non-exact division, use RationalNumber for precision then round
      const thisRational = new RationalNumber({
        p: thisFixedPoint.amount,
        q: 10n ** thisFixedPoint.decimals,
      })

      // Determine sign of divisor
      let divisorSign = 1n
      if (typeof divisor === "number" && divisor < 0) divisorSign = -1n
      else if (typeof divisor === "bigint" && divisor < 0n) divisorSign = -1n
      else if (typeof divisor === "string" && divisor.startsWith("-")) divisorSign = -1n
      else if (typeof divisor === "object" && divisor.amount < 0n) divisorSign = -1n

      // Create divisor as rational
      const divisorRational = new RationalNumber({
        p: divisorBigInt * divisorSign,
        q: 10n ** divisorDecimals,
      })

      // Divide: this / divisor = this * (1/divisor) = this * (q/p)
      const resultRational = thisRational.multiply(
        new RationalNumber({ p: divisorRational.q, q: divisorRational.p }),
      )

      // Convert to fixed-point at currency precision with rounding
      // We need to compute: (p / q) at `currencyDecimals` decimal places
      // That's: round(p * 10^currencyDecimals / q)
      const currencyDecimals = this.currency.decimals
      const scaledNumerator = resultRational.p * 10n ** currencyDecimals
      const denominator = resultRational.q

      // Apply rounding to the division
      const quotient = scaledNumerator / denominator
      const remainder = scaledNumerator % denominator

      let roundedAmount: bigint
      if (remainder === 0n) {
        roundedAmount = quotient
      } else {
        const isNegative = scaledNumerator < 0n !== denominator < 0n
        const absRemainder = remainder < 0n ? -remainder : remainder
        const absDenominator = denominator < 0n ? -denominator : denominator
        const doubleRemainder = absRemainder * 2n

        switch (round) {
          case "ceil":
            roundedAmount = isNegative ? quotient : quotient + 1n
            break
          case "floor":
            roundedAmount = isNegative ? quotient - 1n : quotient
            break
          case "expand":
            roundedAmount = quotient + (isNegative ? -1n : 1n)
            break
          case "trunc":
            roundedAmount = quotient
            break
          case "halfCeil":
            if (doubleRemainder > absDenominator) {
              roundedAmount = quotient + (isNegative ? -1n : 1n)
            } else if (doubleRemainder === absDenominator) {
              roundedAmount = isNegative ? quotient : quotient + 1n
            } else {
              roundedAmount = quotient
            }
            break
          case "halfFloor":
            if (doubleRemainder > absDenominator) {
              roundedAmount = quotient + (isNegative ? -1n : 1n)
            } else if (doubleRemainder === absDenominator) {
              roundedAmount = isNegative ? quotient - 1n : quotient
            } else {
              roundedAmount = quotient
            }
            break
          case "halfExpand":
            if (doubleRemainder >= absDenominator) {
              roundedAmount = quotient + (isNegative ? -1n : 1n)
            } else {
              roundedAmount = quotient
            }
            break
          case "halfTrunc":
            if (doubleRemainder > absDenominator) {
              roundedAmount = quotient + (isNegative ? -1n : 1n)
            } else {
              roundedAmount = quotient
            }
            break
          case "halfEven":
          default:
            if (doubleRemainder > absDenominator) {
              roundedAmount = quotient + (isNegative ? -1n : 1n)
            } else if (doubleRemainder === absDenominator) {
              const adjustedQuotient = quotient + (isNegative ? -1n : 1n)
              roundedAmount = adjustedQuotient % 2n === 0n ? adjustedQuotient : quotient
            } else {
              roundedAmount = quotient
            }
            break
        }
      }

      return new Money(
        this.currency,
        new FixedPointNumber(roundedAmount, currencyDecimals),
      )
    }

    // Exact division (divisor is only factors of 2 and 5)
    // Build the FixedPoint divisor
    let fpDivisor: FixedPoint
    if (typeof divisor === "bigint") {
      fpDivisor = { amount: divisor, decimals: 0n }
    } else if (typeof divisor === "number" || typeof divisor === "string") {
      const fp = FixedPointNumber.fromDecimalString(
        typeof divisor === "number" ? divisor.toString() : divisor,
      )
      fpDivisor = { amount: fp.amount, decimals: fp.decimals }
    } else {
      fpDivisor = divisor
    }

    const result = thisFixedPoint.divide(fpDivisor)

    return new Money({
      asset: this.currency,
      amount: {
        amount: result.amount,
        decimals: result.decimals,
      },
    })
  }

  /**
   * Round this Money instance to its currency's standard precision.
   *
   * Most fiat currencies have 2 decimal places (e.g., USD, EUR),
   * while cryptocurrencies vary (BTC has 8, ETH has 18).
   *
   * @param mode - The rounding mode to use (defaults to HALF_UP if not specified)
   * @returns A new Money instance rounded to the currency's precision
   *
   * @example
   * import { Money, Round } from '@thesis-co/cent';
   *
   * Money("$100.125").round();                    // $100.13 (default HALF_UP)
   * Money("$100.125").round(Round.HALF_EVEN);    // $100.12 (banker's rounding)
   * Money("$100.125").round(Round.FLOOR);        // $100.12
   * Money("$100.125").round(Round.CEILING);      // $100.13
   *
   * @see {@link roundTo} for rounding to a specific number of decimal places
   */
  round(mode?: RoundingMode): Money {
    return this.roundTo(Number(this.currency.decimals), mode)
  }

  /**
   * Round this Money instance to a specific number of decimal places.
   *
   * @param decimals - The number of decimal places to round to
   * @param mode - The rounding mode to use (defaults to HALF_UP if not specified)
   * @returns A new Money instance rounded to the specified precision
   * @throws Error if decimals is negative
   *
   * @example
   * import { Money, Round } from '@thesis-co/cent';
   *
   * const precise = Money("$100.12345");
   *
   * precise.roundTo(2);                   // $100.12
   * precise.roundTo(3);                   // $100.123
   * precise.roundTo(4, Round.HALF_UP);    // $100.1235
   * precise.roundTo(0);                   // $100.00
   *
   * @see {@link round} for rounding to the currency's standard precision
   */
  roundTo(decimals: number, mode?: RoundingMode): Money {
    if (decimals < 0) {
      throw new InvalidInputError(
        `Decimal places must be non-negative, got ${decimals}`,
        {
          code: ErrorCode.INVALID_PRECISION,
          suggestion: "Use a non-negative integer for decimal places.",
        },
      )
    }

    const targetDecimals = BigInt(decimals)

    // Get the amount as FixedPointNumber
    const thisFixedPoint = isFixedPointNumber(this.amount)
      ? this.amount
      : toFixedPointNumber(this.amount)

    // If already at or below target precision, just normalize
    if (thisFixedPoint.decimals <= targetDecimals) {
      const normalized = thisFixedPoint.normalize({
        amount: 0n,
        decimals: targetDecimals,
      })
      return new Money(this.currency, normalized)
    }

    // Need to round down - use applyRounding logic
    const scaleDiff = thisFixedPoint.decimals - targetDecimals
    const divisor = 10n ** scaleDiff

    // Default to HALF_EXPAND (HALF_UP) if no mode specified
    const roundingMode = mode ?? ("halfExpand" as RoundingMode)

    // Apply rounding
    const quotient = thisFixedPoint.amount / divisor
    const remainder = thisFixedPoint.amount % divisor

    let roundedAmount: bigint

    if (remainder === 0n) {
      roundedAmount = quotient
    } else {
      const isNegative = thisFixedPoint.amount < 0n
      const absRemainder = remainder < 0n ? -remainder : remainder
      const doubleRemainder = absRemainder * 2n
      const absDivisor = divisor

      switch (roundingMode) {
        case "ceil":
          roundedAmount = isNegative ? quotient : quotient + 1n
          break
        case "floor":
          roundedAmount = isNegative ? quotient - 1n : quotient
          break
        case "expand":
          roundedAmount = quotient + (isNegative ? -1n : 1n)
          break
        case "trunc":
          roundedAmount = quotient
          break
        case "halfCeil":
          if (doubleRemainder > absDivisor) {
            roundedAmount = quotient + (isNegative ? -1n : 1n)
          } else if (doubleRemainder === absDivisor) {
            roundedAmount = isNegative ? quotient : quotient + 1n
          } else {
            roundedAmount = quotient
          }
          break
        case "halfFloor":
          if (doubleRemainder > absDivisor) {
            roundedAmount = quotient + (isNegative ? -1n : 1n)
          } else if (doubleRemainder === absDivisor) {
            roundedAmount = isNegative ? quotient - 1n : quotient
          } else {
            roundedAmount = quotient
          }
          break
        case "halfExpand":
          if (doubleRemainder >= absDivisor) {
            roundedAmount = quotient + (isNegative ? -1n : 1n)
          } else {
            roundedAmount = quotient
          }
          break
        case "halfTrunc":
          if (doubleRemainder > absDivisor) {
            roundedAmount = quotient + (isNegative ? -1n : 1n)
          } else {
            roundedAmount = quotient
          }
          break
        case "halfEven":
        default:
          if (doubleRemainder > absDivisor) {
            roundedAmount = quotient + (isNegative ? -1n : 1n)
          } else if (doubleRemainder === absDivisor) {
            const adjustedQuotient = quotient + (isNegative ? -1n : 1n)
            roundedAmount = adjustedQuotient % 2n === 0n ? adjustedQuotient : quotient
          } else {
            roundedAmount = quotient
          }
          break
      }
    }

    return new Money(
      this.currency,
      new FixedPointNumber(roundedAmount, targetDecimals),
    )
  }

  /**
   * Extract the percentage portion from a total that includes the percentage.
   *
   * This is useful for VAT/tax calculations where you have the total amount
   * (price + tax) and need to determine the tax portion.
   *
   * Formula: `total - (total / (1 + percent/100))`
   *
   * @param percent - The percentage to extract (e.g., "21%" or "21" for 21%)
   * @param round - Optional rounding mode for the result
   * @returns The extracted percentage amount
   *
   * @example
   * import { Money, Round } from '@thesis-co/cent';
   *
   * // Total is $121 with 21% VAT included - extract the VAT amount
   * const total = Money("$121.00");
   * const vat = total.extractPercent("21%", Round.HALF_UP);  // $21.00
   *
   * // 8.25% sales tax on $108.25 total
   * Money("$108.25").extractPercent("8.25%", Round.HALF_UP);  // $8.25
   *
   * @see {@link removePercent} to get the base amount (before percentage)
   */
  extractPercent(percent: string | number, round?: RoundingMode): Money {
    // Parse the percentage value
    let percentDecimal: FixedPointNumber
    if (typeof percent === "string") {
      const parsed = parsePercentage(percent)
      if (parsed !== null) {
        percentDecimal = parsed
      } else {
        // Try parsing as a plain number string (e.g., "21" for 21%)
        const valueFixed = FixedPointNumber.fromDecimalString(percent)
        const hundred = new FixedPointNumber(100n, 0n)
        percentDecimal = valueFixed.divide(hundred)
      }
    } else {
      // Number input - treat as percentage value (21 means 21%)
      const valueFixed = FixedPointNumber.fromDecimalString(percent.toString())
      const hundred = new FixedPointNumber(100n, 0n)
      percentDecimal = valueFixed.divide(hundred)
    }

    // Formula: total - (total / (1 + percent/100))
    // = total - baseAmount
    // where baseAmount = total / (1 + percentDecimal)
    const one = new FixedPointNumber(1n, 0n)
    const divisor = one.add(percentDecimal)
    const baseAmount = this.divide(divisor, round)

    return this.subtract(baseAmount)
  }

  /**
   * Remove a percentage from a total that includes the percentage.
   *
   * This is useful for VAT/tax calculations where you have the total amount
   * (price + tax) and need to determine the original price before tax.
   *
   * Formula: `total / (1 + percent/100)`
   *
   * @param percent - The percentage to remove (e.g., "21%" or "21" for 21%)
   * @param round - Optional rounding mode for the result
   * @returns The base amount (before percentage was added)
   *
   * @example
   * import { Money, Round } from '@thesis-co/cent';
   *
   * // Total is $121 with 21% VAT included - get pre-VAT price
   * const total = Money("$121.00");
   * const preVat = total.removePercent("21%", Round.HALF_UP);  // $100.00
   *
   * // Remove 8.25% sales tax from $108.25 total
   * Money("$108.25").removePercent("8.25%", Round.HALF_UP);  // $100.00
   *
   * @see {@link extractPercent} to get just the percentage amount
   */
  removePercent(percent: string | number, round?: RoundingMode): Money {
    // Parse the percentage value
    let percentDecimal: FixedPointNumber
    if (typeof percent === "string") {
      const parsed = parsePercentage(percent)
      if (parsed !== null) {
        percentDecimal = parsed
      } else {
        // Try parsing as a plain number string (e.g., "21" for 21%)
        const valueFixed = FixedPointNumber.fromDecimalString(percent)
        const hundred = new FixedPointNumber(100n, 0n)
        percentDecimal = valueFixed.divide(hundred)
      }
    } else {
      // Number input - treat as percentage value (21 means 21%)
      const valueFixed = FixedPointNumber.fromDecimalString(percent.toString())
      const hundred = new FixedPointNumber(100n, 0n)
      percentDecimal = valueFixed.divide(hundred)
    }

    // Formula: total / (1 + percent/100)
    const one = new FixedPointNumber(1n, 0n)
    const divisor = one.add(percentDecimal)
    return this.divide(divisor, round)
  }

  /**
   * Check if this Money instance represents zero value
   *
   * @returns true if the amount is zero, false otherwise
   */
  isZero(): boolean {
    return isMoneyAmountZero(this.amount)
  }

  /**
   * Check if this Money instance is less than another Money or AssetAmount
   *
   * @param other - The Money, AssetAmount, or string representation to compare with
   * @returns true if this money is less than other, false otherwise
   * @throws Error if the assets are not the same type
   */
  lessThan(other: Money | AssetAmount | string): boolean {
    let otherMoney: Money
    if (typeof other === "string") {
      otherMoney = Money.parseStringToMoney(other, this.currency)
    } else if (other instanceof Money) {
      otherMoney = other
    } else {
      otherMoney = new Money(other)
    }
    const otherAmount = otherMoney.balance

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new CurrencyMismatchError(
        this.currency.code || this.currency.name,
        otherMoney.currency.code || otherMoney.currency.name,
        "compare",
      )
    }

    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )
    const otherFixedPoint = new FixedPointNumber(
      otherAmount.amount.amount,
      otherAmount.amount.decimals,
    )

    return thisFixedPoint.lessThan(otherFixedPoint)
  }

  /**
   * Check if this Money instance is less than or equal to another Money or AssetAmount
   *
   * @param other - The Money, AssetAmount, or string representation to compare with
   * @returns true if this money is less than or equal to other, false otherwise
   * @throws Error if the assets are not the same type
   */
  lessThanOrEqual(other: Money | AssetAmount | string): boolean {
    let otherMoney: Money
    if (typeof other === "string") {
      otherMoney = Money.parseStringToMoney(other, this.currency)
    } else if (other instanceof Money) {
      otherMoney = other
    } else {
      otherMoney = new Money(other)
    }
    const otherAmount = otherMoney.balance

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new CurrencyMismatchError(
        this.currency.code || this.currency.name,
        otherMoney.currency.code || otherMoney.currency.name,
        "compare",
      )
    }

    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )
    const otherFixedPoint = new FixedPointNumber(
      otherAmount.amount.amount,
      otherAmount.amount.decimals,
    )

    return thisFixedPoint.lessThanOrEqual(otherFixedPoint)
  }

  /**
   * Check if this Money instance is greater than another Money or AssetAmount
   *
   * @param other - The Money, AssetAmount, or string representation to compare with
   * @returns true if this money is greater than other, false otherwise
   * @throws Error if the assets are not the same type
   */
  greaterThan(other: Money | AssetAmount | string): boolean {
    let otherMoney: Money
    if (typeof other === "string") {
      otherMoney = Money.parseStringToMoney(other, this.currency)
    } else if (other instanceof Money) {
      otherMoney = other
    } else {
      otherMoney = new Money(other)
    }
    const otherAmount = otherMoney.balance

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new CurrencyMismatchError(
        this.currency.code || this.currency.name,
        otherMoney.currency.code || otherMoney.currency.name,
        "compare",
      )
    }

    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )
    const otherFixedPoint = new FixedPointNumber(
      otherAmount.amount.amount,
      otherAmount.amount.decimals,
    )

    return thisFixedPoint.greaterThan(otherFixedPoint)
  }

  /**
   * Check if this Money instance is greater than or equal to another Money or AssetAmount
   *
   * @param other - The Money, AssetAmount, or string representation to compare with
   * @returns true if this money is greater than or equal to other, false otherwise
   * @throws Error if the assets are not the same type
   */
  greaterThanOrEqual(other: Money | AssetAmount | string): boolean {
    let otherMoney: Money
    if (typeof other === "string") {
      otherMoney = Money.parseStringToMoney(other, this.currency)
    } else if (other instanceof Money) {
      otherMoney = other
    } else {
      otherMoney = new Money(other)
    }
    const otherAmount = otherMoney.balance

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new CurrencyMismatchError(
        this.currency.code || this.currency.name,
        otherMoney.currency.code || otherMoney.currency.name,
        "compare",
      )
    }

    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )
    const otherFixedPoint = new FixedPointNumber(
      otherAmount.amount.amount,
      otherAmount.amount.decimals,
    )

    return thisFixedPoint.greaterThanOrEqual(otherFixedPoint)
  }

  /**
   * Check if this Money instance is positive (greater than zero)
   *
   * @returns true if the amount is positive, false otherwise
   */
  isPositive(): boolean {
    return isMoneyAmountPositive(this.amount)
  }

  /**
   * Check if this Money instance is negative (less than zero)
   *
   * @returns true if the amount is negative, false otherwise
   */
  isNegative(): boolean {
    return isMoneyAmountNegative(this.amount)
  }

  /**
   * Get the absolute value of this Money instance
   *
   * @returns A new Money instance with the absolute value
   */
  absolute(): Money {
    if (!this.isNegative()) {
      return this
    }

    // If both amount types support multiplication by -1, use that approach
    if (isFixedPointNumber(this.amount)) {
      const result = this.amount.multiply(-1n)
      return new Money(this.currency, result)
    }

    // For RationalNumber, negate by flipping the sign of p
    const rational = this.amount as RationalNumber
    const result = new RationalNumber({ p: -rational.p, q: rational.q })
    return new Money(this.currency, result)
  }

  /**
   * Get the negation of this Money instance (flip the sign)
   *
   * @returns A new Money instance with the opposite sign
   */
  negate(): Money {
    // If both amount types support multiplication by -1, use that approach
    if (isFixedPointNumber(this.amount)) {
      const result = this.amount.multiply(-1n)
      return new Money(this.currency, result)
    }

    // For RationalNumber, negate by flipping the sign of p
    const rational = this.amount as RationalNumber
    const result = new RationalNumber({ p: -rational.p, q: rational.q })
    return new Money(this.currency, result)
  }

  /**
   * Allocate this Money instance proportionally based on ratios
   *
   * Distributes the money according to the provided ratios, handling remainders
   * using the largest remainder method to ensure exact totals are preserved.
   *
   * When distributeFractionalUnits is false, fractional units beyond the currency's
   * canonical precision are separated out as "change" that can be handled separately.
   * This is useful for removing long decimal tails from RationalNumber amounts or
   * routing sub-unit remainders to separate ledgers.
   *
   * @param ratios - Array of positive integers representing allocation ratios
   * @param options - Allocation options
   * @param options.distributeFractionalUnits - When true (default), fractional units
   *   are distributed among recipients. When false, fractional units beyond the
   *   currency's canonical precision are returned as a separate "change" amount.
   * @returns Array of Money instances proportional to the ratios. When distributeFractionalUnits
   *   is false, includes an additional element containing fractional unit change.
   * @throws Error if ratios are empty, contain non-positive values, or all ratios are zero
   *
   * @example
   * // Standard allocation (distributeFractionalUnits: true)
   * const money = Money("$100")
   * const [first, second, third] = money.allocate([1, 2, 1]) // [$25, $50, $25]
   *
   * // Separate fractional units (distributeFractionalUnits: false)
   * const precise = Money("$100.00015")
   * const parts = precise.allocate([1, 1, 1], { distributeFractionalUnits: false })
   * // Returns: [$33.33, $33.33, $33.34, $0.00015] - change separated
   */
  allocate(
    ratios: number[],
    options: { distributeFractionalUnits?: boolean } = {},
  ): Money[] {
    if (ratios.length === 0) {
      throw new InvalidInputError(
        "Cannot allocate with empty ratios array",
        {
          code: ErrorCode.EMPTY_ARRAY,
          suggestion: "Provide at least one ratio for allocation.",
          example: "money.allocate([1, 2, 1])",
        },
      )
    }

    // Validate ratios are non-negative
    ratios.forEach((ratio) => {
      if (ratio < 0) {
        throw new InvalidInputError(
          `Cannot allocate with negative ratios: got ${ratio}`,
          {
            code: ErrorCode.INVALID_RATIO,
            suggestion: "All ratios must be non-negative integers.",
          },
        )
      }
    })

    const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0)
    if (totalRatio === 0) {
      throw new InvalidInputError(
        "Cannot allocate with all zero ratios",
        {
          code: ErrorCode.INVALID_RATIO,
          suggestion: "At least one ratio must be greater than zero.",
        },
      )
    }

    const { distributeFractionalUnits = true } = options

    // Convert to FixedPointNumber for calculations
    const fixedPointAmount = isFixedPointNumber(this.amount)
      ? this.amount
      : toFixedPointNumber(this.amount)

    let workingAmount = fixedPointAmount
    let fractionalChange: Money | null = null

    // Handle fractional units separation if requested
    if (!distributeFractionalUnits && "decimals" in this.currency) {
      const currencyDecimals = this.currency.decimals
      const currentDecimals = fixedPointAmount.decimals

      if (currentDecimals > currencyDecimals) {
        // Separate fractional units beyond currency precision
        const [concrete, change] = this.concretize()
        workingAmount = isFixedPointNumber(concrete.amount)
          ? concrete.amount
          : toFixedPointNumber(concrete.amount)
        fractionalChange = change
      }
    }

    const totalAmount = workingAmount.amount
    const { decimals } = workingAmount

    // Calculate base allocations (rounded down)
    const allocations: bigint[] = []
    const remainders: number[] = []

    for (let i = 0; i < ratios.length; i += 1) {
      const ratio = ratios[i]
      // Calculate exact allocation as totalAmount * ratio / totalRatio
      const exactAllocation = (totalAmount * BigInt(ratio)) / BigInt(totalRatio)
      const remainder =
        Number((totalAmount * BigInt(ratio)) % BigInt(totalRatio)) / totalRatio

      allocations.push(exactAllocation)
      remainders.push(remainder)
    }

    // Calculate how much we've allocated so far
    const allocatedTotal = allocations.reduce((sum, amount) => sum + amount, 0n)
    const unallocatedAmount = totalAmount - allocatedTotal

    // Distribute the unallocated amount using largest remainder method
    if (unallocatedAmount > 0n) {
      // Create array of indices sorted by remainder (largest first)
      const indicesByRemainder = remainders
        .map((remainder, index) => ({ remainder, index }))
        .sort((a, b) => b.remainder - a.remainder)
        .map((item) => item.index)

      // Distribute one unit to each of the top remainder holders
      let remaining = unallocatedAmount
      indicesByRemainder.forEach((index) => {
        if (remaining <= 0n) return
        allocations[index] += 1n
        remaining -= 1n
      })
    }

    // Create Money instances from allocations
    const result = allocations.map(
      (amount) =>
        new Money(this.currency, new FixedPointNumber(amount, decimals)),
    )

    // Add fractional change as final element if we separated it
    if (fractionalChange && !fractionalChange.isZero()) {
      result.push(fractionalChange)
    }

    return result
  }

  /**
   * Distribute this Money instance evenly across N parts
   *
   * Splits the money into the specified number of equal parts, handling remainders
   * using the largest remainder method to ensure exact totals are preserved.
   *
   * When distributeFractionalUnits is false, fractional units beyond the currency's
   * canonical precision are separated as "change" that can be handled separately.
   * This is useful for cleanly separating sub-unit precision from main allocations.
   *
   * @param parts - Number of parts to split into (must be positive)
   * @param options - Distribution options
   * @param options.distributeFractionalUnits - When true (default), fractional units
   *   are distributed among recipients. When false, fractional units beyond the
   *   currency's canonical precision are returned as a separate "change" amount.
   * @returns Array of Money instances split as evenly as possible. When distributeFractionalUnits
   *   is false, includes an additional element containing fractional unit change.
   * @throws Error if parts is not a positive integer
   *
   * @example
   * // Standard distribution (distributeFractionalUnits: true)
   * const money = Money("$100")
   * const [a, b, c] = money.distribute(3) // [$33.34, $33.33, $33.33]
   *
   * // Separate fractional units (distributeFractionalUnits: false)
   * const precise = Money("$100.00015")
   * const parts = precise.distribute(3, { distributeFractionalUnits: false })
   * // Returns: [$33.33, $33.33, $33.34, $0.00015] - change separated
   */
  distribute(
    parts: number,
    options: { distributeFractionalUnits?: boolean } = {},
  ): Money[] {
    if (!Number.isInteger(parts) || parts <= 0) {
      throw new InvalidInputError(
        `Parts must be a positive integer, got ${parts}`,
        {
          suggestion: "Provide a positive integer for the number of parts.",
          example: "money.distribute(3)",
        },
      )
    }

    // Use allocate with equal ratios
    const equalRatios = Array(parts).fill(1)
    return this.allocate(equalRatios, options)
  }

  /**
   * Return the maximum of this Money and other(s)
   *
   * @param other - The other Money instance(s) or string(s) to compare with
   * @returns The Money instance with the largest value
   * @throws Error if any assets are not the same type
   */
  max(other: Money | Money[] | string | string[]): Money {
    const otherArray = Array.isArray(other) ? other : [other]
    const others = otherArray.map((item) =>
      typeof item === "string"
        ? Money.parseStringToMoney(item, this.currency)
        : item,
    )
    const currentBalance = this.balance

    return others.reduce((maxValue: Money, money) => {
      if (!assetsEqual(currentBalance.asset, money.balance.asset)) {
        throw new CurrencyMismatchError(
          this.currency.code || this.currency.name,
          money.currency.code || money.currency.name,
          "compare",
        )
      }

      return maxValue.lessThan(money) ? money : maxValue
    }, this)
  }

  /**
   * Return the minimum of this Money and other(s)
   *
   * @param other - The other Money instance(s) or string(s) to compare with
   * @returns The Money instance with the smallest value
   * @throws Error if any assets are not the same type
   */
  min(other: Money | Money[] | string | string[]): Money {
    const otherArray = Array.isArray(other) ? other : [other]
    const others = otherArray.map((item) =>
      typeof item === "string"
        ? Money.parseStringToMoney(item, this.currency)
        : item,
    )
    const currentBalance = this.balance

    return others.reduce((minValue: Money, money) => {
      if (!assetsEqual(currentBalance.asset, money.balance.asset)) {
        throw new CurrencyMismatchError(
          this.currency.code || this.currency.name,
          money.currency.code || money.currency.name,
          "compare",
        )
      }

      return minValue.greaterThan(money) ? money : minValue
    }, this)
  }

  /**
   * Check if this Money instance has any fractional amount (change)
   *
   * @returns true if there are any non-zero digits to the right of the decimal point, false otherwise
   */
  hasChange(): boolean {
    // Return false if the asset doesn't have a decimals property
    if (!("decimals" in this.balance.asset)) {
      return false
    }

    const currentDecimals = this.balance.amount.decimals

    // If no decimal places, there can't be any fractional amount
    if (currentDecimals === 0n) {
      return false
    }

    // Check if there are any non-zero digits in the fractional part
    const divisor = 10n ** currentDecimals
    const remainder = this.balance.amount.amount % divisor

    return remainder !== 0n
  }

  /**
   * Check if this Money instance has sub-units beyond the commonly
   * transferable fractional unit (eg $1.001 for USD, including a
   * fraction of a cent)
   *
   * @returns true if there are fractional amounts beyond the asset's decimal precision, false otherwise
   */
  hasSubUnits(): boolean {
    // Return false if the asset doesn't have a decimals property
    if (!("decimals" in this.balance.asset)) {
      return false
    }

    const assetDecimals = this.balance.asset.decimals
    const currentDecimals = this.balance.amount.decimals

    // If current precision is same or less than asset precision, no sub-units
    if (currentDecimals <= assetDecimals) {
      return false
    }

    // Check if there are any non-zero digits beyond the asset's decimal precision
    const extraDecimals = currentDecimals - assetDecimals
    const divisor = 10n ** extraDecimals
    const remainder = this.balance.amount.amount % divisor

    return remainder !== 0n
  }

  /**
   * Serialize this Money instance to JSON
   *
   * @param options - Serialization options
   * @param options.compact - If true, serialize currency as just the currency code string
   * @returns A validated JSON-serializable object with currency and amount
   */
  toJSON(options: { compact?: boolean } = {}): MoneyJSON {
    const { compact = false } = options

    // Helper function to serialize any value, converting bigints to strings
    const serializeValue = (value: unknown): unknown => {
      if (typeof value === "bigint") {
        return value.toString()
      }
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          return value.map(serializeValue)
        }
        const result: Record<string, unknown> = {}
        Object.entries(value).forEach(([key, val]) => {
          result[key] = serializeValue(val)
        })
        return result
      }
      return value
    }

    // Serialize amount directly based on type - structure determines type
    const amountData = isFixedPointNumber(this.amount)
      ? this.amount.toJSON() // {amount: string, decimals: string}
      : this.amount.toJSON() // {p: string, q: string}

    let currencyData: unknown
    if (compact) {
      // For compact format, just use the currency code
      currencyData = this.currency.code || this.currency.name
    } else {
      // For regular format, serialize the full currency object
      currencyData = serializeValue(this.currency)
    }

    const result = {
      currency: currencyData,
      amount: amountData,
    }

    // Note: For compact format, we don't use the existing MoneyJSONSchema validation
    // since it expects a full currency object, not just a string
    if (compact) {
      return result as MoneyJSON
    }

    // Validate the output using Zod schema for type safety
    return MoneyJSONSchema.parse(result)
  }

  /**
   * Compare this Money instance with another Money instance
   *
   * @param other - The Money, AssetAmount, or string representation to compare with
   * @returns -1 if this money is less than other, 1 if this money is greater than other, 0 if equal
   * @throws Error if the assets are not the same type
   */
  compare(other: Money | AssetAmount | string): -1 | 0 | 1 {
    let otherMoney: Money
    if (typeof other === "string") {
      otherMoney = Money.parseStringToMoney(other, this.currency)
    } else if (other instanceof Money) {
      otherMoney = other
    } else {
      otherMoney = new Money(other)
    }

    if (!assetsEqual(this.currency, otherMoney.currency)) {
      throw new CurrencyMismatchError(
        this.currency.code || this.currency.name,
        otherMoney.currency.code || otherMoney.currency.name,
        "compare",
      )
    }

    if (this.lessThan(otherMoney)) {
      return -1
    }
    if (this.greaterThan(otherMoney)) {
      return 1
    }
    return 0
  }

  /**
   * Check if this Money instance is equal to another Money instance
   *
   * @param other - The other Money instance or string representation to compare with
   * @returns true if both Money instances have the same asset and amount, false otherwise
   */
  equals(other: Money | string): boolean {
    const otherMoney =
      typeof other === "string"
        ? Money.parseStringToMoney(other, this.currency)
        : other

    // Check if currencies are equal
    if (!assetsEqual(this.currency, otherMoney.currency)) {
      return false
    }

    // If both are the same type, use direct comparison
    if (
      isFixedPointNumber(this.amount) &&
      isFixedPointNumber(otherMoney.amount)
    ) {
      return this.amount.equals(otherMoney.amount)
    }

    if (isRationalNumber(this.amount) && isRationalNumber(otherMoney.amount)) {
      return (
        this.amount.p === otherMoney.amount.p &&
        this.amount.q === otherMoney.amount.q
      )
    }

    // Mixed types - convert both to comparable decimal strings
    const thisDecimal = isFixedPointNumber(this.amount)
      ? this.amount.toString()
      : this.amount.toDecimalString(50n)
    const otherDecimal = isFixedPointNumber(otherMoney.amount)
      ? otherMoney.amount.toString()
      : otherMoney.amount.toDecimalString(50n)

    return thisDecimal === otherDecimal
  }

  /**
   * Create a Money instance from JSON data
   *
   * @param json - The JSON data to deserialize
   * @returns A new Money instance
   * @throws ZodError if the JSON data is invalid
   */
  static fromJSON(json: unknown): Money {
    // First validate that json is an object
    if (typeof json !== "object" || json === null) {
      throw new ValidationError(
        "Invalid JSON input: expected object",
        {
          code: ErrorCode.INVALID_JSON,
          suggestion: "Provide a valid JSON object with 'currency' and 'amount' properties.",
        },
      )
    }

    // Check if this is the old format (has 'asset' instead of 'currency')
    if ("asset" in json && !("currency" in json)) {
      // Old format compatibility
      const deserializeAsset = (asset: unknown): unknown => {
        const result: Record<string, unknown> = {
          ...(asset as Record<string, unknown>),
        }
        if ("decimals" in result && typeof result.decimals === "string") {
          result.decimals = BigInt(result.decimals)
        }
        return result
      }

      const jsonObj = json as { asset: unknown; amount: unknown }
      const asset = deserializeAsset(jsonObj.asset)
      const amount = FixedPointNumber.fromJSON(jsonObj.amount)

      return new Money({
        asset: asset as Currency,
        amount: {
          amount: amount.amount,
          decimals: amount.decimals,
        },
      })
    }

    const jsonObj = json as { currency: unknown; amount: unknown }

    // Check if this is compact format (currency is a string)
    let currency: Currency
    if (typeof jsonObj.currency === "string") {
      // Compact format - look up currency by code
      currency = getCurrencyFromCode(jsonObj.currency)
    } else {
      // Regular format - validate with Zod schema first
      const parsed = MoneyJSONSchema.parse(json)

      // Helper function to deserialize currency, converting string bigints back to bigints
      const deserializeCurrency = (currencyData: unknown): Currency => {
        const result: Record<string, unknown> = {
          ...(currencyData as Record<string, unknown>),
        }

        // Convert decimals back to bigint if present (FungibleAsset/Currency)
        if ("decimals" in result && typeof result.decimals === "string") {
          result.decimals = BigInt(result.decimals)
        }

        return result as Currency
      }

      currency = deserializeCurrency(parsed.currency)
    }

    // Deserialize amount based on structure - infer type from fields
    let amount: MoneyAmount
    if (typeof jsonObj.amount === "string") {
      amount = FixedPointNumber.fromJSON(jsonObj.amount) // string -> FixedPointNumber
    } else if (typeof jsonObj.amount === "object" && jsonObj.amount !== null) {
      const amountObj = jsonObj.amount as Record<string, unknown>
      if ("p" in amountObj && "q" in amountObj) {
        amount = RationalNumber.fromJSON(jsonObj.amount) // {p, q} -> RationalNumber
      } else {
        amount = FixedPointNumber.fromJSON(jsonObj.amount) // legacy {amount, decimals} -> FixedPointNumber
      }
    } else {
      throw new ValidationError(
        "Invalid amount format in JSON",
        {
          code: ErrorCode.INVALID_JSON,
          suggestion: "Amount should be a decimal string or an object with {amount, decimals} or {p, q} properties.",
        },
      )
    }

    return new Money(currency, amount)
  }

  /**
   * Create a Money instance from a sub-unit amount.
   *
   * This method allows creating Money from sub-units like satoshis, gwei, wei,
   * lamports, etc. The sub-unit name determines both the currency and the
   * decimal offset.
   *
   * @param amount - The amount in sub-units (as bigint)
   * @param unit - The sub-unit name (e.g., "sat", "msat", "gwei", "wei", "lamport")
   * @returns A new Money instance
   * @throws InvalidInputError if the unit is not recognized
   *
   * @example
   * Money.fromSubUnits(100000000n, "sat")     // 1 BTC
   * Money.fromSubUnits(1000n, "msat")         // 0.000000001 BTC (1000 millisatoshis)
   * Money.fromSubUnits(1000000000n, "gwei")   // 1 ETH
   * Money.fromSubUnits(1000000000n, "wei")    // 0.000000001 ETH
   * Money.fromSubUnits(1000000000n, "lamport") // 1 SOL
   */
  static fromSubUnits(amount: bigint, unit: string): Money {
    const unitInfo = SUB_UNIT_REGISTRY[unit.toLowerCase()]

    if (!unitInfo) {
      const knownUnits = Object.keys(SUB_UNIT_REGISTRY).join(", ")
      throw new InvalidInputError(
        `Unknown sub-unit: "${unit}"`,
        {
          suggestion: `Use one of the known sub-units: ${knownUnits}`,
        },
      )
    }

    const { currency, decimals } = unitInfo

    return new Money({
      asset: currency,
      amount: {
        amount,
        decimals: BigInt(decimals),
      },
    })
  }

  /**
   * Convert this Money instance to a localized string representation
   *
   * @param options - Formatting options for the string representation
   * @returns A formatted string representation
   */
  toString(options: MoneyToStringOptions = {}): string {
    const {
      locale = "en-US",
      compact = false,
      maxDecimals,
      minDecimals,
      preferredUnit,
      preferSymbol = false,
      preferFractionalSymbol = false,
      roundingMode,
      excludeCurrency = false,
    } = options

    // Convert RationalNumber to FixedPointNumber for formatting
    const formattingMoney = isRationalNumber(this.amount)
      ? new Money(this.currency, toFixedPointNumber(this.amount))
      : this

    // Determine if we should use ISO 4217 formatting
    const useIsoFormatting = shouldUseIsoFormatting(formattingMoney.currency)

    if (useIsoFormatting) {
      return formatWithIntlCurrency(
        formattingMoney as unknown as import("./formatting").MoneyLike,
        locale,
        compact,
        maxDecimals,
        minDecimals,
        roundingMode,
        excludeCurrency,
      )
    }
    return formatWithCustomFormatting(
      formattingMoney as unknown as import("./formatting").MoneyLike,
      locale,
      compact,
      maxDecimals,
      minDecimals,
      preferredUnit,
      preferSymbol,
      preferFractionalSymbol,
      roundingMode,
      excludeCurrency,
    )
  }

  /**
   * Convert this Money instance to another currency using a price or exchange rate
   *
   * Uses lossless conversion when possible (when price denominators only contain factors of 2 and 5).
   * Falls back to precision-preserving RationalNumber arithmetic when exact division isn't possible.
   *
   * @param price - Price or ExchangeRate to use for conversion
   * @param options - Conversion options (reserved for future use)
   * @returns A new Money instance in the target currency
   * @throws Error if conversion is not possible or currencies don't match
   *
   * @example
   * const usd = Money("$100")
   * const btcPrice = new Price(Money("$50,000"), Money("1 BTC"))
   * const btc = usd.convert(btcPrice) // Returns Money with BTC amount
   */
  convert(
    price: import("../prices").Price | import("../exchange-rates").ExchangeRate,
  ): Money {
    // Handle different price types
    let money1: Money
    let money2: Money

    if ("amounts" in price) {
      // Price class has amounts array
      const [amount1, amount2] = price.amounts
      money1 = new Money(amount1)
      money2 = new Money(amount2)
    } else {
      // ExchangeRate class has baseCurrency/quoteCurrency structure
      const exchangeRate = price as import("../exchange-rates").ExchangeRate
      money1 = new Money({
        asset: exchangeRate.baseCurrency,
        amount: { amount: 1n, decimals: exchangeRate.baseCurrency.decimals },
      })
      money2 = new Money({
        asset: exchangeRate.quoteCurrency,
        amount: exchangeRate.rate,
      })
    }

    // Determine conversion direction
    let fromMoney: Money
    let toMoney: Money
    if (assetsEqual(this.currency, money1.currency)) {
      fromMoney = money1
      toMoney = money2
    } else if (assetsEqual(this.currency, money2.currency)) {
      fromMoney = money2
      toMoney = money1
    } else {
      throw new CurrencyMismatchError(
        this.currency.code || this.currency.name,
        `${money1.currency.code || money1.currency.name}/${money2.currency.code || money2.currency.name}`,
        "convert",
        {
          suggestion: `The price or exchange rate must include ${this.currency.code || this.currency.name} as one of its currencies.`,
        },
      )
    }

    // TODO: Implement lossless division when FixedPointNumber.divide() is fixed
    // For now, always use RationalNumber arithmetic for precision

    // Precision-preserving path: use RationalNumber arithmetic
    const thisRational = isRationalNumber(this.amount)
      ? this.amount
      : new RationalNumber({
          p: this.amount.amount,
          q: 10n ** this.amount.decimals,
        })

    const toRational = isRationalNumber(toMoney.amount)
      ? toMoney.amount
      : new RationalNumber({
          p: toMoney.amount.amount,
          q: 10n ** toMoney.amount.decimals,
        })

    const fromRational = isRationalNumber(fromMoney.amount)
      ? fromMoney.amount
      : new RationalNumber({
          p: fromMoney.amount.amount,
          q: 10n ** fromMoney.amount.decimals,
        })

    // Calculate: thisRational * (toRational / fromRational)
    // Which is: thisRational * toRational * (1 / fromRational)
    // Which is: thisRational * toRational * (q / p) of fromRational
    const rate = new RationalNumber({
      p: toRational.p * fromRational.q,
      q: toRational.q * fromRational.p,
    })
    const result = thisRational.multiply(rate)

    return new Money(toMoney.currency, result)
  }
}

/**
 * Parse a percentage string into a decimal multiplier.
 * Supports formats: "8.25%", "8.25 %", "8.25percent", "8.25 percent"
 *
 * @param input - The percentage string to parse
 * @returns The parsed percentage as a FixedPointNumber (e.g., "8.25%" becomes 0.0825)
 *          or null if the input is not a percentage string
 * @internal
 */
function parsePercentage(input: string): FixedPointNumber | null {
  const trimmed = input.trim()

  // Match patterns like "8.25%", "8.25 %", "8.25percent", "8.25 percent"
  const percentMatch = trimmed.match(
    /^(-?\d+(?:\.\d+)?)\s*(%|percent)$/i,
  )

  if (!percentMatch) {
    return null
  }

  const percentValue = percentMatch[1]

  // Convert percentage to decimal (divide by 100)
  const valueFixed = FixedPointNumber.fromDecimalString(percentValue)
  const hundred = new FixedPointNumber(100n, 0n)

  return valueFixed.divide(hundred)
}

/**
 * Check if a string is a percentage string.
 * @internal
 */
function isPercentageString(input: string): boolean {
  return parsePercentage(input) !== null
}

/**
 * Validate a JavaScript number input based on configuration.
 * @internal
 */
function validateNumberInput(value: number, currencyCode: string): void {
  const config = getConfig()

  // Check for NaN/Infinity first (always an error)
  if (!Number.isFinite(value)) {
    throw new InvalidInputError(
      `Invalid number input: ${value}`,
      {
        code: ErrorCode.INVALID_INPUT,
        suggestion: "Use a finite number value.",
      },
    )
  }

  // If 'never' mode, reject all number inputs
  if (config.numberInputMode === "never") {
    throw new InvalidInputError(
      `Number inputs are not allowed (numberInputMode: 'never')`,
      {
        code: ErrorCode.INVALID_INPUT,
        suggestion: `Use a string instead: Money("${value} ${currencyCode}")`,
        example: `Money("${value} ${currencyCode}")`,
      },
    )
  }

  // If 'silent' mode, allow everything
  if (config.numberInputMode === "silent") {
    return
  }

  // Check for potential precision loss
  const hasPrecisionIssue =
    !Number.isSafeInteger(value) ||
    (value.toString().includes(".") &&
      value.toString().split(".")[1].length > config.precisionWarningThreshold)

  if (hasPrecisionIssue) {
    const message =
      `Number ${value} may lose precision. ` +
      `Use a string for exact values: Money("${value} ${currencyCode}")`

    if (config.numberInputMode === "error") {
      throw new PrecisionLossError(message, {
        suggestion: `Use a string instead: Money("${value} ${currencyCode}")`,
        example: `Money("${value} ${currencyCode}")`,
      })
    }

    // 'warn' mode
    console.warn(`[cent] ${message}`)
  }
}

/**
 * Factory function for creating Money instances from various inputs.
 *
 * Supports multiple formats:
 * - Strings: "$100", "€1,234.56", "BTC 0.001", "1000 sat"
 * - Numbers: Money(100.50, "USD") - requires currency code
 * - Bigints: Money(10050n, "USD") - interpreted as minor units (cents)
 * - AssetAmount objects
 * - JSON objects
 *
 * Number inputs are validated based on the `numberInputMode` configuration:
 * - `'warn'`: Log warning for imprecise numbers (default)
 * - `'error'`: Throw error for imprecise numbers
 * - `'silent'`: Allow all numbers
 * - `'never'`: Throw error for ANY number input
 *
 * @example
 * // String parsing
 * Money("$100.50")           // USD $100.50
 * Money("€1.234,56")         // EUR €1,234.56 (EU format)
 * Money("1000 sat")          // BTC 0.00001000 (satoshis)
 *
 * @example
 * // Number input (requires currency)
 * Money(100.50, "USD")       // USD $100.50
 * Money(99.99, "EUR")        // EUR €99.99
 *
 * @example
 * // Bigint input as minor units (requires currency)
 * Money(10050n, "USD")       // USD $100.50 (10050 cents)
 * Money(100000000n, "BTC")   // BTC 1.00000000 (100M satoshis)
 */
export function MoneyFactory(input: string): Money
export function MoneyFactory(amount: number, currency: string | Currency): Money
export function MoneyFactory(minorUnits: bigint, currency: string | Currency): Money
export function MoneyFactory(balance: AssetAmount): Money
export function MoneyFactory(json: unknown): Money
export function MoneyFactory(
  inputOrBalanceOrJson: string | number | bigint | AssetAmount | unknown,
  currency?: string | Currency,
): Money {
  // Number input mode
  if (typeof inputOrBalanceOrJson === "number") {
    if (currency === undefined) {
      throw new InvalidInputError(
        "Currency is required when using number input",
        {
          suggestion: 'Provide a currency code: Money(100.50, "USD")',
          example: 'Money(100.50, "USD")',
        },
      )
    }

    const currencyObj = typeof currency === "string"
      ? getCurrencyFromCode(currency)
      : currency

    validateNumberInput(inputOrBalanceOrJson, currencyObj.code || currencyObj.name)

    // Convert number to fixed-point representation
    const str = inputOrBalanceOrJson.toString()
    const fp = FixedPointNumber.fromDecimalString(str)

    return new Money({
      asset: currencyObj,
      amount: {
        amount: fp.amount,
        decimals: fp.decimals,
      },
    })
  }

  // Bigint input mode (minor units)
  if (typeof inputOrBalanceOrJson === "bigint") {
    if (currency === undefined) {
      throw new InvalidInputError(
        "Currency is required when using bigint input",
        {
          suggestion: 'Provide a currency code: Money(10050n, "USD")',
          example: 'Money(10050n, "USD") // 10050 cents = $100.50',
        },
      )
    }

    const currencyObj = typeof currency === "string"
      ? getCurrencyFromCode(currency)
      : currency

    // Bigint is interpreted as minor units (e.g., cents for USD, satoshis for BTC)
    return new Money({
      asset: currencyObj,
      amount: {
        amount: inputOrBalanceOrJson,
        decimals: currencyObj.decimals,
      },
    })
  }

  // String parsing mode
  if (typeof inputOrBalanceOrJson === "string") {
    const parseResult = parseMoneyString(inputOrBalanceOrJson)

    return new Money({
      asset: parseResult.currency,
      amount: {
        amount: parseResult.amount.amount,
        decimals: parseResult.amount.decimals,
      },
    })
  }

  if (isAssetAmount(inputOrBalanceOrJson)) {
    return new Money(inputOrBalanceOrJson)
  }

  // JSON deserialization mode
  return Money.fromJSON(inputOrBalanceOrJson)
}
