import { AssetAmount, FixedPoint } from "./types"
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

  /**
   * Concretize this Money instance to the asset's decimal precision
   * 
   * @returns A tuple of [concrete, change] Money instances
   * @throws Error if the asset is not a FungibleAsset
   */
  concretize(): [Money, Money] {
    // Check if the asset has a decimals property (is a FungibleAsset)
    if (!('decimals' in this.balance.asset)) {
      throw new Error('Cannot concretize Money with non-fungible asset')
    }

    const assetDecimals = this.balance.asset.decimals
    const currentDecimals = this.balance.amount.decimals

    // If already at the correct precision, return original and zero change
    if (currentDecimals === assetDecimals) {
      const zeroChange = new Money({
        asset: this.balance.asset,
        amount: {
          amount: 0n,
          decimals: assetDecimals
        }
      })
      return [this, zeroChange]
    }

    const thisFixedPoint = new FixedPointNumber(this.balance.amount.amount, this.balance.amount.decimals)
    
    // Normalize to asset decimals (this will round down if we're going to fewer decimals)
    const concreteFixedPoint = thisFixedPoint.normalize({
      amount: 0n,
      decimals: assetDecimals
    })

    // Create the concrete Money instance
    const concrete = new Money({
      asset: this.balance.asset,
      amount: {
        amount: concreteFixedPoint.amount,
        decimals: assetDecimals
      }
    })

    // Calculate the change by subtracting concrete from original
    const change = this.subtract(concrete)

    return [concrete, change]
  }

  /**
   * Multiply this Money instance by a scalar or fixed-point number
   *
   * @param other - The value to multiply by (bigint or FixedPoint)
   * @returns A new Money instance with the product
   */
  multiply(other: bigint | FixedPoint): Money {
    const thisFixedPoint = new FixedPointNumber(this.balance.amount.amount, this.balance.amount.decimals)
    const result = thisFixedPoint.multiply(other)

    return new Money({
      asset: this.balance.asset,
      amount: {
        amount: result.amount,
        decimals: result.decimals
      }
    })
  }

  /**
   * Check if this Money instance represents zero value
   *
   * @returns true if the amount is zero, false otherwise
   */
  isZero(): boolean {
    return this.balance.amount.amount === 0n
  }

  /**
   * Check if this Money instance is less than another Money or AssetAmount
   *
   * @param other - The Money or AssetAmount to compare with
   * @returns true if this money is less than other, false otherwise
   * @throws Error if the assets are not the same type
   */
  lessThan(other: Money | AssetAmount): boolean {
    const otherAmount = other instanceof Money ? other.balance : other

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new Error('Cannot compare Money with different asset types')
    }

    const thisFixedPoint = new FixedPointNumber(this.balance.amount.amount, this.balance.amount.decimals)
    const otherFixedPoint = new FixedPointNumber(otherAmount.amount.amount, otherAmount.amount.decimals)
    
    return thisFixedPoint.lessThan(otherFixedPoint)
  }

  /**
   * Check if this Money instance is less than or equal to another Money or AssetAmount
   *
   * @param other - The Money or AssetAmount to compare with
   * @returns true if this money is less than or equal to other, false otherwise
   * @throws Error if the assets are not the same type
   */
  lessThanOrEqual(other: Money | AssetAmount): boolean {
    const otherAmount = other instanceof Money ? other.balance : other

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new Error('Cannot compare Money with different asset types')
    }

    const thisFixedPoint = new FixedPointNumber(this.balance.amount.amount, this.balance.amount.decimals)
    const otherFixedPoint = new FixedPointNumber(otherAmount.amount.amount, otherAmount.amount.decimals)
    
    return thisFixedPoint.lessThanOrEqual(otherFixedPoint)
  }

  /**
   * Check if this Money instance is greater than another Money or AssetAmount
   *
   * @param other - The Money or AssetAmount to compare with
   * @returns true if this money is greater than other, false otherwise
   * @throws Error if the assets are not the same type
   */
  greaterThan(other: Money | AssetAmount): boolean {
    const otherAmount = other instanceof Money ? other.balance : other

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new Error('Cannot compare Money with different asset types')
    }

    const thisFixedPoint = new FixedPointNumber(this.balance.amount.amount, this.balance.amount.decimals)
    const otherFixedPoint = new FixedPointNumber(otherAmount.amount.amount, otherAmount.amount.decimals)
    
    return thisFixedPoint.greaterThan(otherFixedPoint)
  }

  /**
   * Check if this Money instance is greater than or equal to another Money or AssetAmount
   *
   * @param other - The Money or AssetAmount to compare with
   * @returns true if this money is greater than or equal to other, false otherwise
   * @throws Error if the assets are not the same type
   */
  greaterThanOrEqual(other: Money | AssetAmount): boolean {
    const otherAmount = other instanceof Money ? other.balance : other

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new Error('Cannot compare Money with different asset types')
    }

    const thisFixedPoint = new FixedPointNumber(this.balance.amount.amount, this.balance.amount.decimals)
    const otherFixedPoint = new FixedPointNumber(otherAmount.amount.amount, otherAmount.amount.decimals)
    
    return thisFixedPoint.greaterThanOrEqual(otherFixedPoint)
  }

  /**
   * Check if this Money instance is positive (greater than zero)
   *
   * @returns true if the amount is positive, false otherwise
   */
  isPositive(): boolean {
    return this.balance.amount.amount > 0n
  }

  /**
   * Check if this Money instance is negative (less than zero)
   *
   * @returns true if the amount is negative, false otherwise
   */
  isNegative(): boolean {
    return this.balance.amount.amount < 0n
  }

  /**
   * Return the maximum of this Money and other(s)
   *
   * @param other - The other Money instance(s) to compare with
   * @returns The Money instance with the largest value
   * @throws Error if any assets are not the same type
   */
  max(other: Money | Money[]): Money {
    const others = Array.isArray(other) ? other : [other]
    let maxValue = this
    
    for (const money of others) {
      if (!assetsEqual(this.balance.asset, money.balance.asset)) {
        throw new Error('Cannot compare Money with different asset types')
      }
      
      if (maxValue.lessThan(money)) {
        maxValue = money
      }
    }
    
    return maxValue
  }

  /**
   * Return the minimum of this Money and other(s)
   *
   * @param other - The other Money instance(s) to compare with
   * @returns The Money instance with the smallest value
   * @throws Error if any assets are not the same type
   */
  min(other: Money | Money[]): Money {
    const others = Array.isArray(other) ? other : [other]
    let minValue = this
    
    for (const money of others) {
      if (!assetsEqual(this.balance.asset, money.balance.asset)) {
        throw new Error('Cannot compare Money with different asset types')
      }
      
      if (minValue.greaterThan(money)) {
        minValue = money
      }
    }
    
    return minValue
  }
}
