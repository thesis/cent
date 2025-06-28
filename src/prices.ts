import { AssetAmount, Ratio, FixedPoint, PricePoint, UNIXTime } from "./types"
import { Money } from "./money"
import { assetsEqual } from "./assets"
import { RationalNumber } from "./rationals"
import { FixedPointNumber } from "./fixed-point"
import { nowUNIXTime, toUNIXTime } from "./time"

export class Price implements PricePoint {
  readonly amounts: [AssetAmount, AssetAmount]
  readonly time: UNIXTime

  /**
   * Create a new Price instance
   *
   * @param a - The first asset amount or Money instance
   * @param b - The second asset amount or Money instance
   * @param time - Optional UNIX timestamp (string or UNIXTime). Defaults to current time
   */
  constructor(a: AssetAmount | Money, b: AssetAmount | Money, time?: UNIXTime | string) {
    // Convert Money instances to AssetAmount
    const amountA = a instanceof Money ? a.balance : a
    const amountB = b instanceof Money ? b.balance : b

    this.amounts = [amountA, amountB]

    // Set time - if provided as string, convert to UNIXTime, otherwise use current time
    if (time) {
      this.time = typeof time === 'string' ? toUNIXTime(time) : time
    } else {
      this.time = nowUNIXTime()
    }
  }

  /**
   * Invert this Price by swapping the order of amounts
   *
   * @returns A new Price instance with amounts swapped
   */
  /**
   * Invert this Price by swapping the order of amounts
   *
   * @returns A new Price instance with amounts swapped
   */
  invert(): Price {
    return new Price(this.amounts[1], this.amounts[0], this.time)
  }

  /**
   * Get the ratio of amounts[0] / amounts[1] as a Ratio
   *
   * @returns A RationalNumber representing the ratio
   */
  asRatio(): RationalNumber {
    return new RationalNumber({
      p: this.amounts[0].amount.amount,
      q: this.amounts[1].amount.amount
    })
  }

  /**
   * Multiply this Price by a scalar value
   *
   * @param scalar - The value to multiply by (bigint, FixedPoint, or Ratio)
   * @returns A new Price instance with scaled amounts
   */
  multiply(scalar: bigint | FixedPoint | Ratio): Price {
    let multiplierP: bigint
    let multiplierQ: bigint

    if (typeof scalar === 'bigint') {
      multiplierP = scalar
      multiplierQ = 1n
    } else if ('amount' in scalar && 'decimals' in scalar) {
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
        amount: (BigInt(this.amounts[0].amount.amount) * BigInt(multiplierP)) / BigInt(multiplierQ),
        decimals: this.amounts[0].amount.decimals
      }
    }

    const newAmountB = {
      asset: this.amounts[1].asset,
      amount: {
        amount: this.amounts[1].amount.amount,
        decimals: this.amounts[1].amount.decimals
      }
    }

    return new Price(newAmountA, newAmountB, this.time)
  }

  /**
   * Divide this Price by a scalar value
   *
   * @param divisor - The value to divide by (bigint, FixedPoint, or Ratio)
   * @returns A new Price instance with scaled amounts
   * @throws Error if the divisor is zero
   */
  divide(divisor: bigint | FixedPoint | Ratio): Price {
    // Division is multiplication by the inverted ratio
    let invertedRatio: Ratio

    if (typeof divisor === 'bigint') {
      if (divisor === 0n) {
        throw new Error("Cannot divide by zero")
      }
      invertedRatio = { p: 1n, q: divisor }
    } else if ('amount' in divisor && 'decimals' in divisor) {
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
   * Considers prices equal if they have the same asset pairs (regardless of order) and time
   *
   * @param other - The other Price instance to compare with
   * @returns true if the prices are equal, false otherwise
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
}
