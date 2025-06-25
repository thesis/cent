import { Ratio } from "./types"

export class RationalNumber implements Ratio {
  readonly p: bigint
  readonly q: bigint

  /**
   * Create a new RationalNumber instance
   *
   * @param ratio - The ratio with numerator (p) and denominator (q)
   */
  constructor(ratio: Ratio) {
    this.p = ratio.p
    this.q = ratio.q
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
}