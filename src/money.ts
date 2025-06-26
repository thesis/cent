import { AssetAmount, FixedPoint } from "./types"
import { FixedPointNumber, FixedPointJSONSchema } from "./fixed-point"
import { assetsEqual } from "./assets"
import { DecimalStringSchema } from "./decimal-strings"
import { z } from "zod"

// Schema for basic Asset
const AssetJSONSchema = z.object({
  name: z.string()
})

// Schema for FungibleAsset (extends Asset)
const FungibleAssetJSONSchema = AssetJSONSchema.extend({
  code: z.string(),
  decimals: z.string().regex(/^\d+$/, "Decimals must be a valid non-negative integer string"),
  fractionalUnit: z.union([
    z.string(),
    z.array(z.string()),
    z.record(z.number(), z.union([z.string(), z.array(z.string())]))
  ]).optional()
})

// Schema for Currency (extends FungibleAsset)
const CurrencyJSONSchema = FungibleAssetJSONSchema.extend({
  symbol: z.string()
})

// Union schema for any asset type
const AnyAssetJSONSchema = z.union([
  CurrencyJSONSchema,
  FungibleAssetJSONSchema,
  AssetJSONSchema
])

// Schema for the complete Money JSON structure
export const MoneyJSONSchema = z.object({
  asset: AnyAssetJSONSchema,
  amount: FixedPointJSONSchema
})

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
    }, true)

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
    let maxValue: Money = this

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
    let minValue: Money = this

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

  /**
   * Check if this Money instance has any fractional amount (change)
   *
   * @returns true if there are any non-zero digits to the right of the decimal point, false otherwise
   */
  hasChange(): boolean {
    // Return false if the asset doesn't have a decimals property
    if (!('decimals' in this.balance.asset)) {
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
    if (!('decimals' in this.balance.asset)) {
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
   * @returns A JSON-serializable object representing the AssetAmount
   */
  toJSON(): any {
    // Helper function to serialize any value, converting bigints to strings
    const serializeValue = (value: any): any => {
      if (typeof value === 'bigint') {
        return value.toString()
      } else if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          return value.map(serializeValue)
        } else {
          const result: any = {}
          for (const [key, val] of Object.entries(value)) {
            result[key] = serializeValue(val)
          }
          return result
        }
      }
      return value
    }

    return {
      asset: serializeValue(this.balance.asset),
      amount: new FixedPointNumber(this.balance.amount.amount, this.balance.amount.decimals).toJSON()
    }
  }

  /**
   * Check if this Money instance is equal to another Money instance
   *
   * @param other - The other Money instance to compare with
   * @returns true if both Money instances have the same asset and amount, false otherwise
   */
  equals(other: Money): boolean {
    // Check if assets are equal
    if (!assetsEqual(this.balance.asset, other.balance.asset)) {
      return false
    }

    // Check if amounts are equal
    const thisFixedPoint = new FixedPointNumber(this.balance.amount.amount, this.balance.amount.decimals)
    const otherFixedPoint = new FixedPointNumber(other.balance.amount.amount, other.balance.amount.decimals)
    
    return thisFixedPoint.equals(otherFixedPoint)
  }

  /**
   * Create a Money instance from JSON data
   *
   * @param json - The JSON data to deserialize
   * @returns A new Money instance
   * @throws Error if the JSON data is invalid
   */
  static fromJSON(json: any): Money {
    const parsed = MoneyJSONSchema.parse(json)
    
    // Helper function to deserialize asset, converting string bigints back to bigints
    const deserializeAsset = (asset: any): any => {
      const result: any = { ...asset }
      
      // Convert decimals back to bigint if present (FungibleAsset/Currency)
      if ('decimals' in result) {
        result.decimals = BigInt(result.decimals)
      }
      
      return result
    }

    const asset = deserializeAsset(parsed.asset)
    const amount = FixedPointNumber.fromJSON(parsed.amount)

    return new Money({
      asset,
      amount: {
        amount: amount.amount,
        decimals: amount.decimals
      }
    })
  }
}
