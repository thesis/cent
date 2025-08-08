import { z } from "zod"
import { Currency, UNIXTime } from "./types"
import { FixedPointNumber, FixedPoint } from "./fixed-point"
import { RationalNumber } from "./rationals"
import { ExchangeRateSource } from "./exchange-rate-sources"
import { nowUNIXTime, UNIXTimeSchema, toUNIXTime } from "./time"
import { NonNegativeBigIntStringSchema } from "./validation-schemas"
import { AnyAssetJSONSchema } from "./money"
import { assetsEqual } from "./assets"
import { isFixedPointNumber, toFixedPointNumber } from "./money/utils"

/**
 * ExchangeRate data structure with clear base/quote semantics
 */
export type ExchangeRateData = {
  baseCurrency: Currency // The "1 unit" reference currency
  quoteCurrency: Currency // The "price per unit" currency
  rate: FixedPointNumber // Quote units per base unit
  timestamp?: UNIXTime | string // When rate was recorded (optional, auto-filled)
  source?: ExchangeRateSource // Optional source metadata
}

// JSON schema for FixedPointNumber in exchange rates
const FixedPointJSONSchema = z.object({
  amount: NonNegativeBigIntStringSchema,
  decimals: NonNegativeBigIntStringSchema,
})

// JSON schema for ExchangeRateSource
const ExchangeRateSourceJSONSchema = z.object({
  name: z.string(),
  priority: z.number(),
  reliability: z.number().min(0).max(1),
})

// JSON schema for ExchangeRateData
export const ExchangeRateJSONSchema = z.object({
  baseCurrency: AnyAssetJSONSchema,
  quoteCurrency: AnyAssetJSONSchema,
  rate: FixedPointJSONSchema,
  timestamp: UNIXTimeSchema.optional(),
  source: ExchangeRateSourceJSONSchema.optional(),
})

export type ExchangeRateJSON = z.infer<typeof ExchangeRateJSONSchema>

/**
 * ExchangeRate utility class providing static methods for exchange rate operations
 * Constructor supports both ExchangeRateData objects and individual arguments
 */
export class ExchangeRate implements ExchangeRateData {
  readonly baseCurrency: Currency

  readonly quoteCurrency: Currency

  readonly rate: FixedPointNumber

  readonly timestamp: UNIXTime

  readonly source?: ExchangeRateSource

  /**
   * Create an ExchangeRate from ExchangeRateData
   */
  constructor(data: ExchangeRateData)
  /**
   * Create an ExchangeRate from individual arguments
   */
  constructor(
    baseCurrency: Currency,
    quoteCurrency: Currency,
    rate: FixedPointNumber | string,
    timestamp?: UNIXTime | string,
    source?: ExchangeRateSource,
  )
  constructor(
    dataOrBaseCurrency: ExchangeRateData | Currency,
    quoteCurrency?: Currency,
    rate?: FixedPointNumber | string,
    timestamp?: UNIXTime | string,
    source?: ExchangeRateSource,
  ) {
    if (
      typeof dataOrBaseCurrency === "object" &&
      "baseCurrency" in dataOrBaseCurrency
    ) {
      // ExchangeRateData constructor
      const data = dataOrBaseCurrency as ExchangeRateData
      this.baseCurrency = data.baseCurrency
      this.quoteCurrency = data.quoteCurrency
      this.rate = data.rate
      if (data.timestamp) {
        this.timestamp =
          typeof data.timestamp === "string"
            ? toUNIXTime(data.timestamp)
            : data.timestamp
      } else {
        this.timestamp = nowUNIXTime()
      }
      this.source = data.source
    } else {
      // Individual arguments constructor
      const baseCurrency = dataOrBaseCurrency as Currency
      if (!quoteCurrency || !rate) {
        throw new Error("Missing required arguments: quoteCurrency and rate")
      }
      this.baseCurrency = baseCurrency
      this.quoteCurrency = quoteCurrency
      this.rate =
        typeof rate === "string"
          ? FixedPointNumber.fromDecimalString(rate)
          : rate
      if (timestamp) {
        this.timestamp =
          typeof timestamp === "string" ? toUNIXTime(timestamp) : timestamp
      } else {
        this.timestamp = nowUNIXTime()
      }
      this.source = source
    }
  }

  /**
   * Convert this ExchangeRate to ExchangeRateData format
   */
  toData(): ExchangeRateData {
    return {
      baseCurrency: this.baseCurrency,
      quoteCurrency: this.quoteCurrency,
      rate: this.rate,
      timestamp: this.timestamp,
      source: this.source,
    }
  }

  /**
   * Instance method to invert this exchange rate
   */
  invert(): ExchangeRate {
    return new ExchangeRate(ExchangeRate.invert(this.toData()))
  }

  /**
   * Instance method to multiply this exchange rate
   */
  multiply(
    multiplier: FixedPointNumber | string | bigint | ExchangeRate,
  ): ExchangeRate {
    if (multiplier instanceof ExchangeRate) {
      return new ExchangeRate(
        ExchangeRate.multiply(this.toData(), multiplier.toData()),
      )
    }
    return new ExchangeRate(ExchangeRate.multiply(this.toData(), multiplier))
  }

  /**
   * Instance method to convert money using this exchange rate
   */
  convert(
    money: import("./money").Money,
  ): import("./money").Money {
    return ExchangeRate.convert(money, this.toData())
  }

  /**
   * Instance method to check if this rate is stale
   */
  isStale(maxAge: number): boolean {
    return ExchangeRate.isStale(this.toData(), maxAge)
  }

  /**
   * Instance method to get the age of this rate
   */
  getAge(): number {
    return ExchangeRate.getAge(this.toData())
  }

  /**
   * Instance method to serialize this rate to JSON
   */
  toJSON(): ExchangeRateJSON {
    return ExchangeRate.toJSON(this.toData())
  }

  /**
   * Instance method to format this rate as a string
   */
  toString(options?: {
    format?: "symbol" | "code" | "ratio"
    precision?: number
    locale?: string
  }): string {
    return ExchangeRate.toString(this.toData(), options)
  }

  /**
   * Apply a spread to create bid/ask rates around this rate
   * @param spread - The spread as a FixedPointNumber, decimal string, or percent string
   * @returns An object containing bid, ask, and mid rates
   */
  spread(spread: FixedPointNumber | string): {
    bid: ExchangeRate
    ask: ExchangeRate
    mid: ExchangeRate
  } {
    // Parse the spread parameter into a FixedPointNumber
    let spreadFixed: FixedPointNumber
    if (typeof spread === "string") {
      spreadFixed = FixedPoint(spread)
    } else {
      spreadFixed = spread
    }

    // Calculate half the spread for symmetric application
    const halfSpread = spreadFixed.divide(new FixedPointNumber(2n, 0n))

    // Create bid rate: rate - (rate * halfSpread)
    const bidRate = this.rate.subtract(this.rate.multiply(halfSpread))

    // Create ask rate: rate + (rate * halfSpread)
    const askRate = this.rate.add(this.rate.multiply(halfSpread))

    // Create the bid, ask, and mid exchange rates
    const bidExchangeRate = new ExchangeRate({
      baseCurrency: this.baseCurrency,
      quoteCurrency: this.quoteCurrency,
      rate: bidRate,
      timestamp: this.timestamp,
      source: this.source,
    })

    const askExchangeRate = new ExchangeRate({
      baseCurrency: this.baseCurrency,
      quoteCurrency: this.quoteCurrency,
      rate: askRate,
      timestamp: this.timestamp,
      source: this.source,
    })

    const midExchangeRate = new ExchangeRate({
      baseCurrency: this.baseCurrency,
      quoteCurrency: this.quoteCurrency,
      rate: this.rate,
      timestamp: this.timestamp,
      source: this.source,
    })

    return {
      bid: bidExchangeRate,
      ask: askExchangeRate,
      mid: midExchangeRate,
    }
  }

  /**
   * Static method to create from JSON
   */
  static fromJSON(json: unknown): ExchangeRate {
    return new ExchangeRate(ExchangeRate.fromJSONData(json))
  }

  /**
   * Invert an ExchangeRate by swapping base and quote currencies
   */
  static invert(rate: ExchangeRateData): ExchangeRateData {
    if (rate.rate.amount === 0n) {
      throw new Error("Cannot invert zero rate")
    }

    // Use RationalNumber for division, then convert back to FixedPointNumber
    const rateRational = new RationalNumber({
      p: rate.rate.amount,
      q: 10n ** rate.rate.decimals,
    })

    const oneRational = new RationalNumber({ p: 1n, q: 1n })
    const invertedRational = oneRational.divide(rateRational)

    // Convert back to FixedPointNumber with appropriate precision
    const invertedFixed = invertedRational.toFixedPoint({ maxBits: 256 })

    return {
      baseCurrency: rate.quoteCurrency,
      quoteCurrency: rate.baseCurrency,
      rate: new FixedPointNumber(invertedFixed.amount, invertedFixed.decimals),
      timestamp: rate.timestamp,
      source: rate.source,
    }
  }

  /**
   * Multiply an ExchangeRate by a scalar or another ExchangeRate
   */
  static multiply(
    rate: ExchangeRateData,
    scalar: FixedPointNumber | string | bigint,
  ): ExchangeRateData
  static multiply(
    rate1: ExchangeRateData,
    rate2: ExchangeRateData,
  ): ExchangeRateData
  static multiply(
    rate: ExchangeRateData,
    multiplier: FixedPointNumber | string | bigint | ExchangeRateData,
  ): ExchangeRateData {
    if (typeof multiplier === "object" && "baseCurrency" in multiplier) {
      // Rate-to-rate multiplication
      const rate2 = multiplier as ExchangeRateData

      // Check for shared currency that allows multiplication
      // Case 1: rate1.quoteCurrency === rate2.baseCurrency (A/B * B/C = A/C)
      if (assetsEqual(rate.quoteCurrency, rate2.baseCurrency)) {
        return {
          baseCurrency: rate.baseCurrency,
          quoteCurrency: rate2.quoteCurrency,
          rate: rate.rate.multiply(rate2.rate),
          timestamp: rate.timestamp || rate2.timestamp,
          source: rate.source, // Use first rate's source
        }
      }

      // Case 2: rate1.baseCurrency === rate2.quoteCurrency (A/B * C/A = C/B)
      if (assetsEqual(rate.baseCurrency, rate2.quoteCurrency)) {
        return {
          baseCurrency: rate2.baseCurrency,
          quoteCurrency: rate.quoteCurrency,
          rate: rate2.rate.multiply(rate.rate),
          timestamp: rate.timestamp || rate2.timestamp,
          source: rate.source, // Use first rate's source
        }
      }

      const getAssetName = (asset: Currency) => asset.name || asset.code
      throw new Error(
        `Cannot multiply rates: no shared currency found between ${getAssetName(rate.baseCurrency)}/${getAssetName(rate.quoteCurrency)} and ${getAssetName(rate2.baseCurrency)}/${getAssetName(rate2.quoteCurrency)}`,
      )
    }

    // Scalar multiplication
    let multiplierFixed: FixedPointNumber
    if (typeof multiplier === "string") {
      multiplierFixed = FixedPointNumber.fromDecimalString(multiplier)
    } else if (typeof multiplier === "bigint") {
      multiplierFixed = new FixedPointNumber(multiplier, 0n)
    } else {
      multiplierFixed = multiplier
    }

    return {
      baseCurrency: rate.baseCurrency,
      quoteCurrency: rate.quoteCurrency,
      rate: rate.rate.multiply(multiplierFixed),
      timestamp: rate.timestamp,
      source: rate.source,
    }
  }

  /**
   * Convert money from one currency to another using an exchange rate
   */
  static convert(
    money: import("./money").Money,
    rate: ExchangeRateData,
  ): import("./money").Money {
    const MoneyClass = require("./money").Money
    const fromCurrency = money.currency
    
    // Get the money amount as FixedPointNumber (convert from RationalNumber if needed)
    const amount = isFixedPointNumber(money.amount) 
      ? money.amount 
      : toFixedPointNumber(money.amount)

    // Check if we can convert directly (from = base, to = quote)
    if (assetsEqual(fromCurrency, rate.baseCurrency)) {
      const convertedAmount = amount.multiply(rate.rate)
      return new MoneyClass(rate.quoteCurrency, convertedAmount)
    }

    // Check if we can convert in reverse (from = quote, to = base)
    if (assetsEqual(fromCurrency, rate.quoteCurrency)) {
      // Use RationalNumber for division, then convert back to FixedPointNumber
      const amountRational = new RationalNumber({
        p: amount.amount,
        q: 10n ** amount.decimals,
      })

      const rateRational = new RationalNumber({
        p: rate.rate.amount,
        q: 10n ** rate.rate.decimals,
      })

      const resultRational = amountRational.divide(rateRational)
      const resultFixed = resultRational.toFixedPoint({ maxBits: 256 })

      // Normalize to match the original amount's precision
      const result = new FixedPointNumber(
        resultFixed.amount,
        resultFixed.decimals,
      )
      const targetPrecision = new FixedPointNumber(0n, amount.decimals)
      const normalizedResult = result.normalize(targetPrecision)
      return new MoneyClass(rate.baseCurrency, normalizedResult)
    }

    throw new Error(
      `Currency mismatch: cannot convert ${fromCurrency.code} using rate ${rate.baseCurrency.code}/${rate.quoteCurrency.code}`,
    )
  }

  /**
   * Average multiple exchange rates
   */
  static average(rates: ExchangeRateData[]): ExchangeRateData {
    if (rates.length === 0) {
      throw new Error("At least one exchange rate is required for averaging")
    }

    if (rates.length === 1) {
      return {
        ...rates[0],
        source: {
          name: "Average of 1 source",
          priority: 1,
          reliability: rates[0].source?.reliability ?? 1.0,
        },
      }
    }

    // Validate currency compatibility
    const firstRate = rates[0]
    const referenceCurrencies = [
      firstRate.baseCurrency,
      firstRate.quoteCurrency,
    ]

    for (let i = 1; i < rates.length; i += 1) {
      const rate = rates[i]
      const currentCurrencies = [rate.baseCurrency, rate.quoteCurrency]

      // Check if currencies match in same order or inverted order
      const sameOrder =
        assetsEqual(referenceCurrencies[0], currentCurrencies[0]) &&
        assetsEqual(referenceCurrencies[1], currentCurrencies[1])

      const invertedOrder =
        assetsEqual(referenceCurrencies[0], currentCurrencies[1]) &&
        assetsEqual(referenceCurrencies[1], currentCurrencies[0])

      if (!sameOrder && !invertedOrder) {
        throw new Error(
          "Incompatible currency pairs: all rates must use the same two currencies",
        )
      }
    }

    // Normalize all rates to have the same currency order (same as first rate)
    const normalizedRates = rates.map((rate) => {
      const currentCurrencies = [rate.baseCurrency, rate.quoteCurrency]

      // Check if this rate needs to be inverted to match reference order
      const needsInversion =
        assetsEqual(referenceCurrencies[0], currentCurrencies[1]) &&
        assetsEqual(referenceCurrencies[1], currentCurrencies[0])

      return needsInversion ? ExchangeRate.invert(rate) : rate
    })

    // Calculate the average rate
    let sum = normalizedRates[0].rate
    for (let i = 1; i < normalizedRates.length; i += 1) {
      sum = sum.add(normalizedRates[i].rate)
    }

    // use RationalNumber for division, then convert back to FixedPointNumber
    const sumRational = new RationalNumber(sum)

    const averageRational = sumRational.divide(BigInt(normalizedRates.length))
    const averageRate = new FixedPointNumber(
      averageRational.toFixedPoint({ maxBits: 256 }),
    )

    // Find the most recent timestamp
    const mostRecentTime = rates.reduce((latest, rate) => {
      if (!rate.timestamp) return latest
      if (!latest) return rate.timestamp

      const currentTime = parseInt(rate.timestamp, 10)
      const latestTime = parseInt(latest, 10)
      return currentTime > latestTime ? rate.timestamp : latest
    }, rates[0].timestamp)

    // Create average source metadata
    const sourceNames = rates.map((rate) => rate.source?.name ?? "Unknown")
    const averageReliability =
      rates.reduce(
        (total, rate) => total + (rate.source?.reliability ?? 1.0),
        0,
      ) / rates.length

    const averageSource: ExchangeRateSource = {
      name: sourceNames.some((name) => name !== "Unknown")
        ? `Average of ${sourceNames.join(", ")}`
        : `Average of ${rates.length} sources`,
      priority: 1,
      reliability: averageReliability,
    }

    return {
      baseCurrency: firstRate.baseCurrency,
      quoteCurrency: firstRate.quoteCurrency,
      rate: averageRate,
      timestamp: mostRecentTime,
      source: averageSource,
    }
  }

  /**
   * Format an ExchangeRate as a human-readable string
   */
  static toString(
    rate: ExchangeRateData,
    options?: {
      format?: "symbol" | "code" | "ratio"
      precision?: number
      locale?: string
    },
  ): string {
    const { format = "symbol", precision = 2, locale = "en-US" } = options || {}

    const rateString = rate.rate.toString()
    const numberFormatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })

    const formattedRate = numberFormatter.format(rateString)

    const baseSymbol = rate.baseCurrency.symbol || rate.baseCurrency.code
    const quoteSymbol = rate.quoteCurrency.symbol || rate.quoteCurrency.code

    if (format === "ratio") {
      return `1 ${rate.baseCurrency.code} = ${formattedRate} ${rate.quoteCurrency.code}`
    }

    if (format === "code") {
      return `${formattedRate} ${rate.quoteCurrency.code}/${rate.baseCurrency.code}`
    }

    // Default symbol format
    return `${formattedRate} ${quoteSymbol}/${baseSymbol}`
  }

  /**
   * Check if a rate is stale based on its timestamp
   */
  static isStale(rate: ExchangeRateData, maxAge: number): boolean {
    if (!rate.timestamp) return false

    const now = Date.now()
    const rateTime = parseInt(rate.timestamp, 10)
    const age = now - rateTime

    return age > maxAge
  }

  /**
   * Get the age of a rate in milliseconds
   */
  static getAge(rate: ExchangeRateData): number {
    if (!rate.timestamp) return 0

    const now = Date.now()
    const rateTime = parseInt(rate.timestamp, 10)
    return now - rateTime
  }

  /**
   * Serialize an ExchangeRate to JSON
   */
  static toJSON(rate: ExchangeRateData): ExchangeRateJSON {
    return {
      baseCurrency: {
        ...rate.baseCurrency,
        decimals: rate.baseCurrency.decimals.toString(),
      },
      quoteCurrency: {
        ...rate.quoteCurrency,
        decimals: rate.quoteCurrency.decimals.toString(),
      },
      rate: {
        amount: rate.rate.amount.toString(),
        decimals: rate.rate.decimals.toString(),
      },
      timestamp: rate.timestamp,
      source: rate.source,
    }
  }

  /**
   * Deserialize an ExchangeRateData from JSON
   */
  static fromJSONData(json: unknown): ExchangeRateData {
    const validationResult = ExchangeRateJSONSchema.safeParse(json)

    if (!validationResult.success) {
      throw new Error(
        `Invalid ExchangeRate JSON: ${validationResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ")}`,
      )
    }

    const validatedData = validationResult.data

    try {
      // Type guard function to check if an object has a decimals property
      const hasDecimals = (obj: unknown): obj is { decimals: string } =>
        typeof obj === "object" && obj !== null && "decimals" in obj

      if (
        !hasDecimals(validatedData.baseCurrency) ||
        !hasDecimals(validatedData.quoteCurrency)
      ) {
        throw new Error("Invalid currency data: missing decimals property")
      }

      return {
        baseCurrency: {
          ...validatedData.baseCurrency,
          decimals: BigInt(validatedData.baseCurrency.decimals),
        } as Currency,
        quoteCurrency: {
          ...validatedData.quoteCurrency,
          decimals: BigInt(validatedData.quoteCurrency.decimals),
        } as Currency,
        rate: new FixedPointNumber(
          BigInt(validatedData.rate.amount),
          BigInt(validatedData.rate.decimals),
        ),
        timestamp: validatedData.timestamp as UNIXTime,
        source: validatedData.source,
      }
    } catch (error) {
      throw new Error(
        `Failed to parse ExchangeRate from JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  }
}
