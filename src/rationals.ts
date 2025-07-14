import { z } from "zod"
import {
  Ratio,
  FixedPoint,
  DecimalString,
  RationalString,
  LossyConversionOptions,
  RoundingMode,
} from "./types"
import { gcd, getBitSize } from "./math-utils"
import { BigIntStringSchema } from "./validation-schemas"
import { FixedPointNumber } from "./fixed-point"
import { parseFraction, getRationalStringType } from "./rational-strings"

export const RationalNumberJSONSchema = z.object({
  p: BigIntStringSchema,
  q: BigIntStringSchema,
})

/**
 * Apply rounding to a rational number based on the specified rounding mode
 *
 * @param numerator - The numerator of the fraction to round
 * @param denominator - The denominator of the fraction to round
 * @param roundingMode - The rounding mode to apply
 * @returns The rounded integer value
 */
function applyRounding(
  numerator: bigint,
  denominator: bigint,
  roundingMode: RoundingMode,
): bigint {
  if (denominator === 0n) {
    throw new Error("Cannot round with zero denominator")
  }

  const quotient = numerator / denominator
  const remainder = numerator % denominator

  // If there's no remainder, no rounding needed
  if (remainder === 0n) {
    return quotient
  }

  const isNegative = numerator < 0n !== denominator < 0n
  const absRemainder = remainder < 0n ? -remainder : remainder
  const absDenominator = denominator < 0n ? -denominator : denominator

  // For proper comparison, we need to compare 2*remainder with denominator
  // instead of remainder with denominator/2 (to avoid fractional division)
  const doubleRemainder = absRemainder * 2n

  switch (roundingMode) {
    case RoundingMode.CEIL:
      // Round toward positive infinity
      return isNegative ? quotient : quotient + 1n

    case RoundingMode.FLOOR:
      // Round toward negative infinity
      return isNegative ? quotient - 1n : quotient

    case RoundingMode.EXPAND:
      // Round away from zero
      return quotient + (isNegative ? -1n : 1n)

    case RoundingMode.TRUNC:
      // Round toward zero
      return quotient

    case RoundingMode.HALF_CEIL:
      // Round to nearest, ties toward positive infinity
      if (doubleRemainder > absDenominator) {
        return quotient + (isNegative ? -1n : 1n)
      }
      if (doubleRemainder === absDenominator) {
        return isNegative ? quotient : quotient + 1n
      }
      return quotient

    case RoundingMode.HALF_FLOOR:
      // Round to nearest, ties toward negative infinity
      if (doubleRemainder > absDenominator) {
        return quotient + (isNegative ? -1n : 1n)
      }
      if (doubleRemainder === absDenominator) {
        return isNegative ? quotient - 1n : quotient
      }
      return quotient

    case RoundingMode.HALF_EXPAND:
      // Round to nearest, ties away from zero
      if (doubleRemainder >= absDenominator) {
        return quotient + (isNegative ? -1n : 1n)
      }
      return quotient

    case RoundingMode.HALF_TRUNC:
      // Round to nearest, ties toward zero
      if (doubleRemainder > absDenominator) {
        return quotient + (isNegative ? -1n : 1n)
      }
      return quotient

    case RoundingMode.HALF_EVEN:
    default:
      // Round to nearest, ties toward even
      if (doubleRemainder > absDenominator) {
        return quotient + (isNegative ? -1n : 1n)
      }
      if (doubleRemainder === absDenominator) {
        // Check if quotient is even
        const adjustedQuotient = quotient + (isNegative ? -1n : 1n)
        return adjustedQuotient % 2n === 0n ? adjustedQuotient : quotient
      }
      return quotient
  }
}

/**
 * Convert a rational number to fixed point with specified precision
 *
 * @param rational - The rational number to convert
 * @param precision - The number of decimal places
 * @param roundingMode - The rounding mode to use
 * @returns The converted FixedPoint
 */
function convertToFixedPointWithPrecision(
  rational: RationalNumber,
  precision: number,
  roundingMode: RoundingMode,
): FixedPoint {
  if (precision <= 0) {
    throw new Error(
      "maxPrecision must be positive (represents total significant digits)",
    )
  }

  // Convert rational to decimal to determine the magnitude
  const decimalValue = Number(rational.p) / Number(rational.q)

  // Find the order of magnitude (how many digits before decimal point)
  let magnitude = 0
  if (decimalValue !== 0) {
    magnitude = Math.floor(Math.log10(Math.abs(decimalValue))) + 1
  }

  // Calculate how many decimal places we need
  // precision = total significant digits
  // magnitude = digits before decimal point
  // decimalPlaces = precision - magnitude
  const decimalPlaces = precision - magnitude

  if (decimalPlaces >= 0) {
    // Standard case: scale up for more decimal places
    const scaleFactor = 10n ** BigInt(decimalPlaces)
    const scaledNumerator = rational.p * scaleFactor
    const roundedAmount = applyRounding(
      scaledNumerator,
      rational.q,
      roundingMode,
    )

    return {
      amount: roundedAmount,
      decimals: BigInt(decimalPlaces),
    }
  }
  // Negative decimal places: scale down for fewer significant digits
  const scaleFactor = 10n ** BigInt(-decimalPlaces)
  const scaledDenominator = rational.q * scaleFactor
  const roundedAmount = applyRounding(
    rational.p,
    scaledDenominator,
    roundingMode,
  )

  return {
    amount: roundedAmount,
    decimals: BigInt(decimalPlaces),
  }
}

/**
 * Calculate the maximum precision (decimal places) that can fit within a bit budget
 *
 * @param maxBits - The maximum number of bits to use
 * @param rationalValue - The rational number being converted
 * @returns The maximum precision that fits within the bit budget
 */
function calculateMaxPrecisionFromBits(
  maxBits: number,
  rationalValue: RationalNumber,
): number {
  if (maxBits <= 0) {
    throw new Error("maxBits must be positive")
  }

  // Try different precision levels and find the highest one that fits
  // Start from 1 since precision must be positive
  for (let precision = 1; precision <= 50; precision += 1) {
    const testResult = convertToFixedPointWithPrecision(
      rationalValue,
      precision,
      RoundingMode.TRUNC,
    )
    const totalBits =
      getBitSize(testResult.amount) + getBitSize(testResult.decimals)

    if (totalBits > maxBits) {
      // Previous precision was the maximum that fits
      return Math.max(1, precision - 1)
    }
  }

  // If we get here, even 50 significant digits fits within the bit budget
  return 50
}

/**
 * Helper function to convert string arguments to RationalNumber instances
 *
 * @param value - String representation (fraction or decimal) or existing Ratio instance
 * @returns RationalNumber instance
 * @throws Error if string parsing fails
 */
const parseStringToRational = (value: string | Ratio): RationalNumber => {
  if (typeof value === "object" && "p" in value && "q" in value) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new RationalNumber(value)
  }

  // Parse the string using the existing factory function logic
  const stringType = getRationalStringType(value as string)

  if (stringType === "fraction") {
    // Parse fraction format using utility function
    const ratio = parseFraction(value as string)
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new RationalNumber(ratio)
  }
  // Parse decimal format "12234.352453" - convert to fraction
  const fp = FixedPointNumber.fromDecimalString(value as string)
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return new RationalNumber({ p: fp.amount, q: fp.q })
}

export class RationalNumber implements Ratio {
  #p: bigint

  #q: bigint

  /**
   * Create a new RationalNumber instance
   *
   * @param ratio - The ratio with numerator (p) and denominator (q)
   */
  constructor(ratio: Ratio) {
    this.#p = ratio.p
    this.#q = ratio.q
  }

  /**
   * Get the numerator value
   * @returns The amount as a bigint
   */
  get p(): bigint {
    return this.#p
  }

  /**
   * Get the denominator value
   * @returns The amount as a bigint
   */
  get q(): bigint {
    return this.#q
  }

  /**
   * Multiply this rational number by another ratio
   *
   * Formula: (a/b) * (c/d) = (a*c)/(b*d)
   *
   * @param other - The ratio to multiply by (Ratio or string)
   * @returns A new RationalNumber instance with the product
   */
  multiply(other: Ratio | string): RationalNumber {
    const otherRational =
      typeof other === "string" ? parseStringToRational(other) : other
    return new RationalNumber({
      p: this.p * otherRational.p,
      q: this.q * otherRational.q,
    })
  }

  /**
   * Divide this rational number by another ratio or bigint
   *
   * Formula: (a/b) / (c/d) = (a/b) * (d/c) = (a*d)/(b*c)
   * For bigint: (a/b) / c = (a/b) * (1/c) = a/(b*c)
   *
   * @param other - The ratio to divide by (Ratio, string, or bigint)
   * @returns A new RationalNumber instance with the quotient
   * @throws Error if the divisor is zero
   */
  divide(other: Ratio | string | bigint): RationalNumber {
    if (typeof other === "bigint") {
      if (other === 0n) {
        throw new Error("Cannot divide by zero")
      }
      return new RationalNumber({
        p: this.p,
        q: this.q * other,
      })
    }

    const otherRational =
      typeof other === "string" ? parseStringToRational(other) : other
    if (otherRational.p === 0n) {
      throw new Error("Cannot divide by zero")
    }

    return new RationalNumber({
      p: this.p * otherRational.q,
      q: this.q * otherRational.p,
    })
  }

  /**
   * Add another ratio to this rational number
   *
   * Formula: (a/b) + (c/d) = (a*d + b*c)/(b*d)
   *
   * The result is automatically simplified to keep the ratio in lowest terms,
   * preventing numerators and denominators from growing unnecessarily large.
   *
   * @param other - The ratio to add (Ratio or string)
   * @returns A new RationalNumber instance with the sum in simplified form
   */
  add(other: Ratio | string): RationalNumber {
    const otherRational =
      typeof other === "string" ? parseStringToRational(other) : other
    return new RationalNumber({
      p: this.p * otherRational.q + this.q * otherRational.p,
      q: this.q * otherRational.q,
    }).simplify()
  }

  /**
   * Subtract another ratio from this rational number
   *
   * Formula: (a/b) - (c/d) = (a*d - b*c)/(b*d)
   *
   * The result is automatically simplified to keep the ratio in lowest terms,
   * preventing numerators and denominators from growing unnecessarily large.
   *
   * @param other - The ratio to subtract (Ratio or string)
   * @returns A new RationalNumber instance with the difference in simplified form
   */
  subtract(other: Ratio | string): RationalNumber {
    const otherRational =
      typeof other === "string" ? parseStringToRational(other) : other
    return new RationalNumber({
      p: this.p * otherRational.q - this.q * otherRational.p,
      q: this.q * otherRational.q,
    }).simplify()
  }

  /**
   * Check if this RationalNumber is equal to another ratio
   *
   * @param other - The ratio to compare with (Ratio or string)
   * @returns true if both ratios are equal, false otherwise
   */
  equals(other: Ratio | string): boolean {
    const otherRational =
      typeof other === "string" ? parseStringToRational(other) : other
    // Simplify both ratios to compare them in lowest terms
    const thisSimplified = this.simplify()
    const otherSimplified = new RationalNumber(otherRational).simplify()
    return (
      thisSimplified.p === otherSimplified.p &&
      thisSimplified.q === otherSimplified.q
    )
  }

  /**
   * Check if this RationalNumber is greater than another ratio
   *
   * Formula: (a/b) > (c/d) iff a*d > b*c
   *
   * @param other - The ratio to compare with (Ratio or string)
   * @returns true if this number is greater than other, false otherwise
   */
  greaterThan(other: Ratio | string): boolean {
    const otherRational =
      typeof other === "string" ? parseStringToRational(other) : other
    return this.p * otherRational.q > this.q * otherRational.p
  }

  /**
   * Check if this RationalNumber is greater than or equal to another ratio
   *
   * @param other - The ratio to compare with (Ratio or string)
   * @returns true if this number is greater than or equal to other, false otherwise
   */
  greaterThanOrEqual(other: Ratio | string): boolean {
    const otherRational =
      typeof other === "string" ? parseStringToRational(other) : other
    return this.p * otherRational.q >= this.q * otherRational.p
  }

  /**
   * Check if this RationalNumber represents zero
   *
   * @returns true if the numerator is zero, false otherwise
   */
  isZero(): boolean {
    return this.p === 0n
  }

  /**
   * Check if this RationalNumber is positive (greater than zero)
   *
   * A rational number is positive if p and q have the same sign
   *
   * @returns true if the number is positive, false otherwise
   */
  isPositive(): boolean {
    return (this.p > 0n && this.q > 0n) || (this.p < 0n && this.q < 0n)
  }

  /**
   * Check if this RationalNumber is negative (less than zero)
   *
   * A rational number is negative if p and q have opposite signs
   *
   * @returns true if the number is negative, false otherwise
   */
  isNegative(): boolean {
    return (this.p > 0n && this.q < 0n) || (this.p < 0n && this.q > 0n)
  }

  /**
   * Check if this RationalNumber is less than another ratio
   *
   * Formula: (a/b) < (c/d) iff a*d < b*c
   *
   * @param other - The ratio to compare with (Ratio or string)
   * @returns true if this number is less than other, false otherwise
   */
  lessThan(other: Ratio | string): boolean {
    const otherRational =
      typeof other === "string" ? parseStringToRational(other) : other
    return this.p * otherRational.q < this.q * otherRational.p
  }

  /**
   * Check if this RationalNumber is less than or equal to another ratio
   *
   * @param other - The ratio to compare with (Ratio or string)
   * @returns true if this number is less than or equal to other, false otherwise
   */
  lessThanOrEqual(other: Ratio | string): boolean {
    const otherRational =
      typeof other === "string" ? parseStringToRational(other) : other
    return this.p * otherRational.q <= this.q * otherRational.p
  }

  /**
   * Return the maximum of this RationalNumber and other(s)
   *
   * @param other - The other RationalNumber(s) or string(s) to compare with
   * @returns The RationalNumber with the largest value
   */
  max(other: Ratio | Ratio[] | string | string[]): RationalNumber {
    const otherArray = Array.isArray(other) ? other : [other]
    const others = otherArray.map((item) =>
      typeof item === "string"
        ? parseStringToRational(item)
        : new RationalNumber(item),
    )

    return others.reduce(
      (maxValue, rational) =>
        maxValue.lessThan(rational) ? rational : maxValue,
      this,
    )
  }

  /**
   * Return the minimum of this RationalNumber and other(s)
   *
   * @param other - The other RationalNumber(s) or string(s) to compare with
   * @returns The RationalNumber with the smallest value
   */
  min(other: Ratio | Ratio[] | string | string[]): RationalNumber {
    const otherArray = Array.isArray(other) ? other : [other]
    const others = otherArray.map((item) =>
      typeof item === "string"
        ? parseStringToRational(item)
        : new RationalNumber(item),
    )

    return others.reduce(
      (minValue, rational) =>
        minValue.greaterThan(rational) ? rational : minValue,
      this,
    )
  }

  /**
   * Simplify this RationalNumber by reducing to lowest terms
   *
   * @returns A new RationalNumber with numerator and denominator in lowest terms
   */
  simplify(): RationalNumber {
    if (this.p === 0n) {
      // 0/anything = 0/1
      return new RationalNumber({ p: 0n, q: 1n })
    }

    const gcdValue = gcd(this.p, this.q)
    let newP = this.p / gcdValue
    let newQ = this.q / gcdValue

    // Ensure denominator is positive (move negative sign to numerator if needed)
    if (newQ < 0n) {
      newP = -newP
      newQ = -newQ
    }

    return new RationalNumber({ p: newP, q: newQ })
  }

  /**
   * Calculate the total bit size required to store this rational number
   * Returns log₂(|p|) + log₂(|q|), where |x| is the absolute value
   *
   * @returns The total number of bits required to represent both numerator and denominator
   */
  getBitSize(): number {
    return getBitSize(this.p) + getBitSize(this.q)
  }

  /**
   * Convert this RationalNumber to a FixedPoint
   *
   * When called without parameters, performs exact conversion (denominator must be power of 10)
   * When called with options, performs lossy conversion with specified precision constraints
   *
   * @param options - Optional lossy conversion options
   * @returns A FixedPoint object with amount and decimals
   * @throws Error if exact conversion fails or invalid options provided
   */
  toFixedPoint(options?: LossyConversionOptions): FixedPoint {
    // If no options provided, use the original exact conversion logic
    if (!options) {
      return this.toFixedPointExact()
    }

    // Validate options
    if (options.maxPrecision !== undefined && options.maxBits !== undefined) {
      throw new Error("Cannot specify both maxPrecision and maxBits")
    }

    if (options.maxPrecision === undefined && options.maxBits === undefined) {
      throw new Error("Must specify either maxPrecision or maxBits")
    }

    const roundingMode = options.roundingMode || RoundingMode.TRUNC

    // Handle maxBits option
    if (options.maxBits !== undefined) {
      if (options.maxBits <= 0) {
        throw new Error("maxBits must be positive")
      }
      const maxPrecision = calculateMaxPrecisionFromBits(options.maxBits, this)
      return convertToFixedPointWithPrecision(this, maxPrecision, roundingMode)
    }

    // Handle maxPrecision option
    if (options.maxPrecision !== undefined) {
      if (options.maxPrecision <= 0 || options.maxPrecision > 50) {
        throw new Error(
          "maxPrecision must be between 1 and 50 (represents total significant digits)",
        )
      }
      return convertToFixedPointWithPrecision(
        this,
        options.maxPrecision,
        roundingMode,
      )
    }

    // This should never be reached due to validation above
    throw new Error("Invalid conversion options")
  }

  /**
   * Convert this RationalNumber to a FixedPoint using exact conversion
   *
   * @returns A FixedPoint object with amount and decimals
   * @throws Error if the denominator is not a power of 10
   */
  private toFixedPointExact(): FixedPoint {
    // Check if q is a power of 10
    let temp = this.q
    let decimals = 0n

    if (temp === 0n) {
      throw new Error(
        "Cannot convert ratio with zero denominator to fixed point",
      )
    }

    // Handle negative denominators by making them positive
    // (the sign will be preserved in the numerator)
    if (temp < 0n) {
      temp = -temp
    }

    while (temp > 1n) {
      if (temp % 10n !== 0n) {
        throw new Error(
          `Cannot convert ratio to fixed point: denominator ${this.q} is not a power of 10`,
        )
      }
      temp /= 10n
      decimals += 1n
    }

    return {
      amount: this.q < 0n ? -this.p : this.p,
      decimals,
    }
  }

  /**
   * Convert this RationalNumber to a string representation in simplified p/q format
   *
   * @returns A string representation of the simplified ratio (e.g., "2/3")
   */
  toString(): string {
    const simplified = this.simplify()
    return `${simplified.p}/${simplified.q}`
  }

  /**
   * Convert this RationalNumber to a decimal string representation
   *
   * @param precision - Maximum number of decimal places (default: 50n)
   * @returns A decimal string representation without trailing zeros
   */
  toDecimalString(precision: bigint = 50n): DecimalString {
    if (this.q === 0n) {
      throw new Error("Division by zero")
    }

    // Handle sign
    const negative = this.p < 0n !== this.q < 0n
    const numerator = this.p < 0n ? -this.p : this.p
    const denominator = this.q < 0n ? -this.q : this.q

    // Integer part
    const integerPart = numerator / denominator
    let remainder = numerator % denominator

    if (remainder === 0n) {
      return ((negative ? "-" : "") + integerPart.toString()) as DecimalString
    }

    // Build decimal part
    let result = `${(negative ? "-" : "") + integerPart.toString()}.`

    for (let i = 0n; i < precision && remainder !== 0n; i += 1n) {
      remainder *= 10n
      const digit = remainder / denominator
      result += digit.toString()
      remainder %= denominator
    }

    // Remove trailing zeros
    while (result.endsWith("0") && result.includes(".")) {
      result = result.slice(0, -1)
    }

    // Remove trailing decimal point if no fractional part remains
    if (result.endsWith(".")) {
      result = result.slice(0, -1)
    }

    return result as DecimalString
  }

  /**
   * Serialize this RationalNumber to JSON
   *
   * @returns A JSON-serializable object with p and q as strings
   */
  toJSON(): { p: string; q: string } {
    return {
      p: this.p.toString(),
      q: this.q.toString(),
    }
  }

  /**
   * Create a RationalNumber from JSON data
   *
   * @param json - The JSON data to deserialize
   * @returns A new RationalNumber instance
   * @throws Error if the JSON data is invalid
   */
  static fromJSON(json: unknown): RationalNumber {
    const parsed = RationalNumberJSONSchema.parse(json)

    return new RationalNumber({
      p: BigInt(parsed.p),
      q: BigInt(parsed.q),
    })
  }
}

/**
 * Factory function for creating RationalNumber instances
 * Supports fraction strings, decimal strings, bigint p/q arguments, and original constructor signature
 */
export function Rational(
  str: string | DecimalString | RationalString,
): RationalNumber
export function Rational(ratio: Ratio): RationalNumber
export function Rational(p: bigint, q: bigint): RationalNumber
export function Rational(
  ratioOrStrOrP: Ratio | string | DecimalString | RationalString | bigint,
  q?: bigint,
): RationalNumber {
  if (typeof ratioOrStrOrP === "bigint") {
    // BigInt p, q mode
    if (q === undefined) {
      throw new Error(
        "q parameter is required when creating Rational with bigint p",
      )
    }
    return new RationalNumber({ p: ratioOrStrOrP, q })
  }
  if (typeof ratioOrStrOrP === "string") {
    // String parsing mode - use helper function
    return parseStringToRational(ratioOrStrOrP)
  }
  // Original constructor mode
  return new RationalNumber(ratioOrStrOrP)
}
