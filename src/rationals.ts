import { Ratio, FixedPoint, DecimalString } from "./types"
import { gcd } from "./math-utils"
import { BigIntStringSchema } from "./validation-schemas"
import { z } from "zod"

export const RationalNumberJSONSchema = z.object({
  p: BigIntStringSchema,
  q: BigIntStringSchema
})

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
   * @param other - The ratio to multiply by
   * @returns A new RationalNumber instance with the product
   */
  multiply(other: Ratio): RationalNumber {
    return new RationalNumber({
      p: this.p * other.p,
      q: this.q * other.q
    })
  }

  /**
   * Divide this rational number by another ratio
   *
   * Formula: (a/b) / (c/d) = (a/b) * (d/c) = (a*d)/(b*c)
   *
   * @param other - The ratio to divide by
   * @returns A new RationalNumber instance with the quotient
   * @throws Error if the divisor numerator is zero
   */
  divide(other: Ratio): RationalNumber {
    if (other.p === 0n) {
      throw new Error("Cannot divide by zero")
    }

    return new RationalNumber({
      p: this.p * other.q,
      q: this.q * other.p
    })
  }

  /**
   * Add another ratio to this rational number
   *
   * Formula: (a/b) + (c/d) = (a*d + b*c)/(b*d)
   *
   * @param other - The ratio to add
   * @returns A new RationalNumber instance with the sum
   */
  add(other: Ratio): RationalNumber {
    return new RationalNumber({
      p: this.p * other.q + this.q * other.p,
      q: this.q * other.q
    })
  }

  /**
   * Subtract another ratio from this rational number
   *
   * Formula: (a/b) - (c/d) = (a*d - b*c)/(b*d)
   *
   * @param other - The ratio to subtract
   * @returns A new RationalNumber instance with the difference
   */
  subtract(other: Ratio): RationalNumber {
    return new RationalNumber({
      p: this.p * other.q - this.q * other.p,
      q: this.q * other.q
    })
  }

  /**
   * Check if this RationalNumber is greater than another ratio
   * 
   * Formula: (a/b) > (c/d) iff a*d > b*c
   * 
   * @param other - The ratio to compare with
   * @returns true if this number is greater than other, false otherwise
   */
  greaterThan(other: Ratio): boolean {
    return this.p * other.q > this.q * other.p
  }

  /**
   * Check if this RationalNumber is greater than or equal to another ratio
   * 
   * @param other - The ratio to compare with
   * @returns true if this number is greater than or equal to other, false otherwise
   */
  greaterThanOrEqual(other: Ratio): boolean {
    return this.p * other.q >= this.q * other.p
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
   * @param other - The ratio to compare with
   * @returns true if this number is less than other, false otherwise
   */
  lessThan(other: Ratio): boolean {
    return this.p * other.q < this.q * other.p
  }

  /**
   * Check if this RationalNumber is less than or equal to another ratio
   * 
   * @param other - The ratio to compare with
   * @returns true if this number is less than or equal to other, false otherwise
   */
  lessThanOrEqual(other: Ratio): boolean {
    return this.p * other.q <= this.q * other.p
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
   * Convert this RationalNumber to a FixedPoint
   * 
   * @returns A FixedPoint object with amount and decimals
   * @throws Error if the denominator is not a power of 10
   */
  toFixedPoint(): FixedPoint {
    // Check if q is a power of 10
    let temp = this.q
    let decimals = 0n
    
    if (temp === 0n) {
      throw new Error("Cannot convert ratio with zero denominator to fixed point")
    }
    
    // Handle negative denominators by making them positive
    // (the sign will be preserved in the numerator)
    if (temp < 0n) {
      temp = -temp
    }
    
    while (temp > 1n) {
      if (temp % 10n !== 0n) {
        throw new Error(`Cannot convert ratio to fixed point: denominator ${this.q} is not a power of 10`)
      }
      temp = temp / 10n
      decimals++
    }
    
    return {
      amount: this.q < 0n ? -this.p : this.p,
      decimals
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
    const negative = (this.p < 0n) !== (this.q < 0n)
    const numerator = this.p < 0n ? -this.p : this.p
    const denominator = this.q < 0n ? -this.q : this.q
    
    // Integer part
    const integerPart = numerator / denominator
    let remainder = numerator % denominator
    
    if (remainder === 0n) {
      return ((negative ? "-" : "") + integerPart.toString()) as DecimalString
    }
    
    // Build decimal part
    let result = (negative ? "-" : "") + integerPart.toString() + "."
    
    for (let i = 0n; i < precision && remainder !== 0n; i++) {
      remainder *= 10n
      const digit = remainder / denominator
      result += digit.toString()
      remainder = remainder % denominator
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
      q: this.q.toString()
    }
  }

  /**
   * Create a RationalNumber from JSON data
   *
   * @param json - The JSON data to deserialize
   * @returns A new RationalNumber instance
   * @throws Error if the JSON data is invalid
   */
  static fromJSON(json: any): RationalNumber {
    const parsed = RationalNumberJSONSchema.parse(json)
    
    return new RationalNumber({
      p: BigInt(parsed.p),
      q: BigInt(parsed.q)
    })
  }
}
