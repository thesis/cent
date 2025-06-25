import { AssetAmount, PricePoint, UNIXTime } from "./types"
import { Money } from "./money"
import { nowUNIXTime, toUNIXTime } from "./time"
import { assetsEqual } from "./assets"

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
  invert(): Price {
    return new Price(this.amounts[1], this.amounts[0], this.time)
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
      assetsEqual(this.amounts[1].asset, other.amounts[1].asset)

    const invertedOrder = 
      assetsEqual(this.amounts[0].asset, other.amounts[1].asset) &&
      assetsEqual(this.amounts[1].asset, other.amounts[0].asset)

    return sameOrder || invertedOrder
  }
}