import { AssetAmount } from "./types"
import { FixedPointNumber } from "./fixed-point"
import { assetsEqual } from "./assets"

export class Money {
  readonly balance: AssetAmount

  /**
   * Create a new Money instance
   *
   * @param balance - The asset amount balance
   */
  constructor(balance: AssetAmount) {
    this.balance = balance
  }

  /**
   * Add money or an asset amount to this Money instance
   *
   * @param other - The Money or AssetAmount to add
   * @returns A new Money instance with the sum
   * @throws Error if the assets are not the same type
   */
  add(other: Money | AssetAmount): Money {
    const otherAmount = other instanceof Money ? other.balance : other

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new Error('Cannot add Money with different asset types')
    }

    const thisFixedPoint = new FixedPointNumber(this.balance.amount.amount, this.balance.amount.decimals)
    const otherFixedPoint = new FixedPointNumber(otherAmount.amount.amount, otherAmount.amount.decimals)
    const result = thisFixedPoint.add(otherFixedPoint)

    return new Money({
      asset: this.balance.asset,
      amount: {
        amount: result.amount,
        decimals: result.decimals
      }
    })
  }

  /**
   * Subtract money or an asset amount from this Money instance
   *
   * @param other - The Money or AssetAmount to subtract
   * @returns A new Money instance with the difference
   * @throws Error if the assets are not the same type
   */
  subtract(other: Money | AssetAmount): Money {
    const otherAmount = other instanceof Money ? other.balance : other

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new Error('Cannot subtract Money with different asset types')
    }

    const thisFixedPoint = new FixedPointNumber(this.balance.amount.amount, this.balance.amount.decimals)
    const otherFixedPoint = new FixedPointNumber(otherAmount.amount.amount, otherAmount.amount.decimals)
    const result = thisFixedPoint.subtract(otherFixedPoint)

    return new Money({
      asset: this.balance.asset,
      amount: {
        amount: result.amount,
        decimals: result.decimals
      }
    })
  }
}
