import { Money as MoneyClass, MoneyFactory as Money, MoneyToStringOptions } from "./money"
import { Currency } from "./types"
import { assetsEqual } from "./assets"
import { ExchangeRate } from "./exchange-rates"
import { FixedPoint } from "./fixed-point"

/**
 * Options for formatting PriceRange instances to strings
 */
export interface PriceRangeToStringOptions extends MoneyToStringOptions {
  /** Display format style */
  format?: "default" | "compact" | "from" | "upTo" | "range" | "between"
}

/**
 * JSON representation of a PriceRange
 */
export interface PriceRangeJSON {
  min: unknown
  max: unknown
}

/**
 * PriceRange class for representing price ranges with precision
 */
export class PriceRange {
  readonly min: MoneyClass

  readonly max: MoneyClass

  /**
   * Create a new PriceRange instance
   * @param min - The minimum price
   * @param max - The maximum price
   */
  constructor(min: MoneyClass, max: MoneyClass) {
    // Validate currencies match
    if (!assetsEqual(min.currency, max.currency)) {
      throw new Error(
        `Currency mismatch: min currency ${min.currency.code || min.currency.name} does not match max currency ${max.currency.code || max.currency.name}`,
      )
    }

    // Validate logical range
    if (min.greaterThan(max)) {
      throw new Error(
        "Invalid range: maximum must be greater than or equal to minimum",
      )
    }

    this.min = min
    this.max = max
  }

  /**
   * Get the currency for this price range
   */
  get currency(): Currency {
    return this.min.currency
  }

  /**
   * Get the span (difference) between max and min
   */
  get span(): MoneyClass {
    return this.max.subtract(this.min)
  }

  /**
   * Get the midpoint of the range
   */
  get midpoint(): MoneyClass {
    // Calculate (min + max) / 2 using precise arithmetic
    // We use FixedPoint("0.5") to avoid any floating point operations
    const sum = this.min.add(this.max)
    return sum.multiply(FixedPoint("0.5"))
  }

  /**
   * Check if the range is empty (min equals max)
   */
  get isEmpty(): boolean {
    return this.min.equals(this.max)
  }

  /**
   * Check if a price is within this range (inclusive)
   * @param price - The price to check
   * @returns true if the price is within the range
   */
  contains(price: MoneyClass | string): boolean {
    const priceValue = typeof price === "string" ? Money(price) : price

    // Validate currency compatibility
    if (!assetsEqual(this.currency, priceValue.currency)) {
      throw new Error(
        `Currency mismatch: range currency ${this.currency.code || this.currency.name} does not match price currency ${priceValue.currency.code || priceValue.currency.name}`,
      )
    }

    return (
      priceValue.greaterThanOrEqual(this.min) &&
      priceValue.lessThanOrEqual(this.max)
    )
  }

  /**
   * Check if the entire range is above a given price
   * @param price - The price to compare against
   * @returns true if the minimum is above the given price
   */
  isAbove(price: MoneyClass | string): boolean {
    const priceValue = typeof price === "string" ? Money(price) : price

    // Validate currency compatibility
    if (!assetsEqual(this.currency, priceValue.currency)) {
      throw new Error(
        `Currency mismatch: range currency ${this.currency.code || this.currency.name} does not match price currency ${priceValue.currency.code || priceValue.currency.name}`,
      )
    }

    return this.min.greaterThan(priceValue)
  }

  /**
   * Check if the entire range is below a given price
   * @param price - The price to compare against
   * @returns true if the maximum is below the given price
   */
  isBelow(price: MoneyClass | string): boolean {
    const priceValue = typeof price === "string" ? Money(price) : price

    // Validate currency compatibility
    if (!assetsEqual(this.currency, priceValue.currency)) {
      throw new Error(
        `Currency mismatch: range currency ${this.currency.code || this.currency.name} does not match price currency ${priceValue.currency.code || priceValue.currency.name}`,
      )
    }

    return this.max.lessThan(priceValue)
  }

  /**
   * Check if this range overlaps with another range
   * @param other - The other range to check
   * @returns true if the ranges overlap
   */
  overlaps(other: PriceRange): boolean {
    // Validate currency compatibility
    if (!assetsEqual(this.currency, other.currency)) {
      throw new Error(
        "Currency mismatch: cannot compare ranges with different currencies",
      )
    }

    // Ranges overlap if: this.min <= other.max AND other.min <= this.max
    return (
      this.min.lessThanOrEqual(other.max) && other.min.lessThanOrEqual(this.max)
    )
  }

  /**
   * Get the intersection of this range with another range
   * @param other - The other range to intersect with
   * @returns The intersection range, or null if no intersection
   */
  intersect(other: PriceRange): PriceRange | null {
    // Validate currency compatibility
    if (!assetsEqual(this.currency, other.currency)) {
      throw new Error(
        "Currency mismatch: cannot intersect ranges with different currencies",
      )
    }

    if (!this.overlaps(other)) {
      return null
    }

    // Intersection min is the maximum of the two mins
    // Intersection max is the minimum of the two maxs
    const intersectionMin = this.min.max(other.min)
    const intersectionMax = this.max.min(other.max)

    return new PriceRange(intersectionMin, intersectionMax)
  }

  /**
   * Get the union of this range with another range
   * @param other - The other range to union with
   * @returns The union range
   */
  union(other: PriceRange): PriceRange {
    // Validate currency compatibility
    if (!assetsEqual(this.currency, other.currency)) {
      throw new Error(
        "Currency mismatch: cannot union ranges with different currencies",
      )
    }

    // Union min is the minimum of the two mins
    // Union max is the maximum of the two maxs
    const unionMin = this.min.min(other.min)
    const unionMax = this.max.max(other.max)

    return new PriceRange(unionMin, unionMax)
  }

  /**
   * Split this range into equal parts
   * @param parts - Number of parts to split into
   * @returns Array of PriceRange instances
   */
  split(parts: number): PriceRange[] {
    if (!Number.isInteger(parts) || parts <= 0) {
      throw new Error("Parts must be a positive integer")
    }

    if (parts === 1) {
      return [this]
    }

    const ranges: PriceRange[] = []
    const totalSpan = this.span

    // Calculate the size of each part using precise division
    // We distribute the span evenly using Money's distribute method
    const spanParts = totalSpan.distribute(parts)

    let currentMin = this.min
    for (let i = 0; i < parts; i += 1) {
      const currentMax = currentMin.add(spanParts[i])
      ranges.push(new PriceRange(currentMin, currentMax))
      currentMin = currentMax
    }

    return ranges
  }

  /**
   * Convert this range to another currency using an exchange rate
   * @param exchangeRate - The exchange rate to use for conversion
   * @returns A new PriceRange in the target currency
   */
  convert(exchangeRate: ExchangeRate): PriceRange {
    const convertedMin = this.min.convert(exchangeRate)
    const convertedMax = this.max.convert(exchangeRate)

    return new PriceRange(convertedMin, convertedMax)
  }

  /**
   * Check if this range equals another range
   * @param other - The other range to compare with
   * @returns true if ranges are equal
   */
  equals(other: PriceRange): boolean {
    return this.min.equals(other.min) && this.max.equals(other.max)
  }

  /**
   * Convert this PriceRange to a string representation
   * @param options - Formatting options
   * @returns Formatted string representation
   */
  toString(options: PriceRangeToStringOptions = {}): string {
    const { format = "default", ...moneyOptions } = options

    // Handle equal min/max case
    if (this.isEmpty) {
      return this.min.toString(moneyOptions)
    }

    const minStr = this.min.toString(moneyOptions)
    const maxStr = this.max.toString(moneyOptions)

    switch (format) {
      case "compact": {
        // For compact format, use no decimal places and get just the currency symbol
        const compactOptions = { ...moneyOptions, maxDecimals: 0 }
        const minCompact = this.min.toString({
          ...compactOptions,
          preferSymbol: true,
        })
        const maxCompact = this.max.toString({
          ...compactOptions,
          preferSymbol: false,
        })
        // Extract symbol from min
        const symbol = minCompact.replace(/[0-9.,\s-]+/g, "")
        // Extract numbers
        const minNumber = minCompact.replace(/[^0-9.,\s-]+/g, "").trim()
        const maxNumber = maxCompact.replace(/[^0-9.,\s-]+/g, "").trim()
        return `${symbol}${minNumber}-${maxNumber}`
      }

      case "from":
        return `From ${minStr}`

      case "upTo":
        return `Up to ${maxStr}`

      case "range":
        return `${minStr} to ${maxStr}`

      case "between":
        return `Between ${minStr} and ${maxStr}`

      case "default":
      default:
        return `${minStr} - ${maxStr}`
    }
  }

  /**
   * Serialize this PriceRange to JSON
   * @param options - Serialization options
   * @returns JSON representation
   */
  toJSON(options: { compact?: boolean } = {}): PriceRangeJSON {
    return {
      min: this.min.toJSON(options),
      max: this.max.toJSON(options),
    }
  }

  /**
   * Create a PriceRange from JSON data
   * @param json - JSON data
   * @returns PriceRange instance
   */
  static fromJSON(json: unknown): PriceRange {
    if (typeof json !== "object" || json === null) {
      throw new Error("Invalid JSON input: expected object")
    }

    const jsonObj = json as { min: unknown; max: unknown }

    if (!("min" in jsonObj) || !("max" in jsonObj)) {
      throw new Error("Invalid JSON input: missing min or max properties")
    }

    const min = MoneyClass.fromJSON(jsonObj.min)
    const max = MoneyClass.fromJSON(jsonObj.max)

    return new PriceRange(min, max)
  }

  /**
   * Create a range for prices under a maximum value
   * @param max - The maximum price
   * @returns PriceRange from zero to max
   */
  static under(max: MoneyClass): PriceRange {
    const zero = new MoneyClass({
      asset: max.currency,
      amount: {
        amount: 0n,
        decimals: max.currency.decimals,
      },
    })
    return new PriceRange(zero, max)
  }

  /**
   * Create a range for prices over a minimum value
   * @param min - The minimum price
   * @param max - The maximum price (required for bounded range)
   * @returns PriceRange from min to max
   */
  static over(min: MoneyClass, max: MoneyClass): PriceRange {
    return new PriceRange(min, max)
  }

  /**
   * Create a range between two prices
   * @param min - The minimum price
   * @param max - The maximum price
   * @returns PriceRange between min and max
   */
  static between(min: MoneyClass, max: MoneyClass): PriceRange {
    return new PriceRange(min, max)
  }

  /**
   * Create a range around a base price with a percentage margin
   * @param basePrice - The center price
   * @param percentage - The percentage margin (e.g., "10%" or "0.1")
   * @returns PriceRange with basePrice ± percentage
   */
  static around(basePrice: MoneyClass, percentage: string): PriceRange {
    // Parse percentage string and convert to decimal
    const percentageValue = percentage.endsWith("%")
      ? FixedPoint(percentage)
      : FixedPoint(percentage)

    // Calculate the margin amount
    const margin = basePrice.multiply(percentageValue)

    // Create range: basePrice - margin to basePrice + margin
    const min = basePrice.subtract(margin)
    const max = basePrice.add(margin)

    return new PriceRange(min, max)
  }

  /**
   * Create price buckets dividing a range into equal parts
   * @param min - The minimum price
   * @param max - The maximum price
   * @param buckets - Number of buckets to create
   * @returns Array of PriceRange instances
   */
  static createBuckets(
    min: MoneyClass,
    max: MoneyClass,
    buckets: number,
  ): PriceRange[] {
    const range = new PriceRange(min, max)
    return range.split(buckets)
  }
}

/**
 * Parse a price range string into min and max Money instances
 * @param rangeStr - String like "$50 - $100" or "$50-100"
 * @returns Object with min and max Money instances
 */
function parsePriceRangeString(rangeStr: string): {
  min: MoneyClass
  max: MoneyClass
} {
  // Handle different separator formats
  const separators = [" - ", " -", "- ", "-"]
  let parts: string[] = []

  // Find the separator and split the string
  const foundSeparator = separators.find((sep) => rangeStr.includes(sep))
  if (foundSeparator) {
    parts = rangeStr.split(foundSeparator)
  }

  if (parts.length !== 2) {
    throw new Error(
      `Invalid range format: "${rangeStr}". Expected format like "$50 - $100" or "$50-100"`,
    )
  }

  const [minStr, maxStr] = parts
  let min: MoneyClass
  let max: MoneyClass

  try {
    min = Money(minStr.trim())
  } catch (error) {
    throw new Error(`Invalid minimum price: "${minStr.trim()}"`)
  }

  // For compact format like "$50-100", the max part might not have currency symbol
  try {
    max = Money(maxStr.trim())
  } catch (error) {
    // Try adding the same currency as min
    const minCurrency = min.currency
    if ("symbol" in minCurrency && minCurrency.symbol) {
      try {
        max = Money(`${minCurrency.symbol}${maxStr.trim()}`)
      } catch (symbolError) {
        if ("code" in minCurrency && minCurrency.code) {
          max = Money(`${minCurrency.code} ${maxStr.trim()}`)
        } else {
          throw new Error(`Invalid maximum price: "${maxStr.trim()}"`)
        }
      }
    } else if ("code" in minCurrency && minCurrency.code) {
      max = Money(`${minCurrency.code} ${maxStr.trim()}`)
    } else {
      throw new Error(`Invalid maximum price: "${maxStr.trim()}"`)
    }
  }

  return { min, max }
}

/**
 * Factory function for creating PriceRange instances
 * @param input - String representation or min Money instance
 * @param max - Max Money instance (when first param is min)
 * @returns PriceRange instance
 */
export function PriceRangeFactory(input: string): PriceRange
export function PriceRangeFactory(
  min: MoneyClass | string,
  max: MoneyClass | string,
): PriceRange
export function PriceRangeFactory(
  inputOrMin: string | MoneyClass,
  max?: MoneyClass | string,
): PriceRange {
  if (typeof inputOrMin === "string" && max === undefined) {
    // Parse range string like "$50 - $100"
    const { min, max: parsedMax } = parsePriceRangeString(inputOrMin)
    return new PriceRange(min, parsedMax)
  }

  if (max !== undefined) {
    // Two separate arguments
    const minMoney =
      typeof inputOrMin === "string" ? Money(inputOrMin) : inputOrMin
    const maxMoney = typeof max === "string" ? Money(max) : max
    return new PriceRange(minMoney, maxMoney)
  }

  throw new Error(
    "Invalid arguments: provide either a range string or min and max values",
  )
}

/**
 * Alias for PriceRangeFactory for convenience
 */
export const PriceRangeFactoryAlias = PriceRangeFactory
