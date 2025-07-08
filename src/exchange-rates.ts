import { AssetAmount, UNIXTime } from "./types"
import { Money as MoneyClass } from "./money"
import { Price } from "./prices"
import { ExchangeRateSource } from "./exchange-rate-sources"

export class ExchangeRate extends Price {
  public readonly source?: ExchangeRateSource

  /**
   * Create a new ExchangeRate instance
   *
   * @param a - The first asset amount or Money instance
   * @param b - The second asset amount or Money instance
   * @param time - Optional UNIX timestamp (string or UNIXTime). Defaults to current time
   * @param source - Optional source metadata for this rate
   */
  constructor(
    a: AssetAmount | MoneyClass,
    b: AssetAmount | MoneyClass,
    time?: UNIXTime | string,
    source?: ExchangeRateSource,
  ) {
    super(a, b, time)
    this.source = source
  }

  /**
   * Invert this ExchangeRate by swapping the order of amounts
   *
   * @returns A new ExchangeRate instance with amounts swapped
   */
  invert(): ExchangeRate {
    return new ExchangeRate(
      this.amounts[1],
      this.amounts[0],
      this.time,
      this.source,
    )
  }

  /**
   * Check if this rate is stale based on its timestamp
   * @param maxAge - Maximum age in milliseconds
   * @returns Whether the rate is stale
   */
  isStale(maxAge: number): boolean {
    const now = Date.now()
    const rateTime =
      typeof this.time === "string"
        ? parseInt(this.time, 10)
        : parseInt(this.time, 10)
    const age = now - rateTime

    return age > maxAge
  }

  /**
   * Get the age of this rate in milliseconds
   * @returns Age in milliseconds
   */
  getAge(): number {
    const now = Date.now()
    const rateTime =
      typeof this.time === "string"
        ? parseInt(this.time, 10)
        : parseInt(this.time, 10)

    return now - rateTime
  }
}
