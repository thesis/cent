import { AssetAmount, UNIXTime } from "./types"
import { Money as MoneyClass } from "./money"
import { Price } from "./prices"

export class ExchangeRate extends Price {
  /**
   * Create a new ExchangeRate instance
   *
   * @param a - The first asset amount or Money instance
   * @param b - The second asset amount or Money instance
   * @param time - Optional UNIX timestamp (string or UNIXTime). Defaults to current time
   */
  constructor(
    a: AssetAmount | MoneyClass,
    b: AssetAmount | MoneyClass,
    time?: UNIXTime | string,
  ) {
    super(a, b, time)
  }

  /**
   * Invert this ExchangeRate by swapping the order of amounts
   *
   * @returns A new ExchangeRate instance with amounts swapped
   */
  invert(): ExchangeRate {
    return new ExchangeRate(this.amounts[1], this.amounts[0], this.time)
  }
}
