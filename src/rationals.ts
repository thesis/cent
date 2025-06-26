import { Ratio, FixedPoint } from "./types"

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
}
