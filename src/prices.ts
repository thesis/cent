import { AssetAmount, FixedPoint, Ratio, UNIXTime, AnyAsset } from "./types"
import { Money as MoneyClass } from "./money"
import { assetsEqual } from "./assets"
import { RationalNumber } from "./rationals"
import { nowUNIXTime, toUNIXTime } from "./time"

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
}
