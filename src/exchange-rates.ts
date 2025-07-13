import { z } from "zod"
import { AssetAmount, UNIXTime, Currency } from "./types"
import { Money as MoneyClass, AnyAssetJSONSchema } from "./money"
import { Price } from "./prices"
import { ExchangeRateSource } from "./exchange-rate-sources"
import { UNIXTimeSchema } from "./time"
import { NonNegativeBigIntStringSchema } from "./validation-schemas"
import { FixedPointNumber } from "./fixed-point"
import "./types/intl-extensions"

/**
 * Get symbol for currency if requested, otherwise empty string
 */
function getSymbolForCurrency(currency: Currency, useSymbol: boolean): string {
  if (!useSymbol || !("symbol" in currency)) {
    return ""
  }
  return (currency as { symbol: string }).symbol
}

/**
 * Get currency code for display
 */
function getCurrencyCode(currency: Currency): string {
  return currency.code
}

// Schema for FixedPoint amounts in JSON (object format for exchange rates)
const FixedPointObjectJSONSchema = z.object({
  amount: NonNegativeBigIntStringSchema,
  decimals: NonNegativeBigIntStringSchema,
})

// Schema for AssetAmount in JSON
const AssetAmountJSONSchema = z.object({
  asset: AnyAssetJSONSchema,
  amount: FixedPointObjectJSONSchema,
})

// Schema for ExchangeRateSource
const ExchangeRateSourceJSONSchema = z.object({
  name: z.string(),
  priority: z.number(),
  reliability: z.number().min(0).max(1),
})

// Schema for ExchangeRate JSON
export const ExchangeRateJSONSchema = z.object({
  amounts: z.tuple([AssetAmountJSONSchema, AssetAmountJSONSchema]),
  time: UNIXTimeSchema,
  source: ExchangeRateSourceJSONSchema.optional(),
})

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

  /**
   * Serialize this ExchangeRate to a JSON-compatible object
   * @returns Serializable object representation
   */
  toJSON(): ExchangeRateJSON {
    return {
      amounts: [
        {
          asset: this.amounts[0].asset,
          amount: {
            amount: this.amounts[0].amount.amount.toString(),
            decimals: this.amounts[0].amount.decimals.toString(),
          },
        },
        {
          asset: this.amounts[1].asset,
          amount: {
            amount: this.amounts[1].amount.amount.toString(),
            decimals: this.amounts[1].amount.decimals.toString(),
          },
        },
      ],
      time: this.time,
      source: this.source,
    }
  }

  /**
   * Format this ExchangeRate as a human-readable string
   * @param options - Formatting options
   * @returns Formatted string representation
   */
  toString(options?: {
    format?: "symbol" | "code" | "ratio"
    precision?: number
    locale?: string
    showSymbolFor?: "numerator" | "denominator" | "both" | "none"
  }): string {
    const {
      format = "symbol",
      precision,
      locale = "en-US",
      showSymbolFor = "denominator",
    } = options || {}

    // Get the ratio and convert to a FixedPoint for rounding
    const ratio = this.asRatio()

    // Determine precision: use provided value or base currency decimals (numerator)
    const [baseAsset] = this.amounts
    const defaultPrecision =
      "decimals" in baseAsset.asset ? Number(baseAsset.asset.decimals) : 0
    const finalPrecision =
      precision !== undefined ? precision : defaultPrecision

    // Convert ratio to FixedPoint with sufficient precision for display
    const fixedPointData = ratio.toFixedPoint({ maxBits: 256 })

    // Create a FixedPointNumber instance to access toString() method
    const roundedRatio = new FixedPointNumber(
      fixedPointData.amount,
      fixedPointData.decimals,
    )

    // Get decimal string representation (no Number conversion needed!)
    const decimalString = roundedRatio.toString()

    // Create Money instances for easier currency access
    const baseMoney = new MoneyClass(this.amounts[0])
    const quoteMoney = new MoneyClass(this.amounts[1])

    // Create number formatter
    const numberFormatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: finalPrecision,
      maximumFractionDigits: finalPrecision,
    })

    const formattedRate = numberFormatter.format(decimalString)

    if (format === "ratio") {
      // Format: "117,000.00 USD/BTC"
      return `${formattedRate} ${getCurrencyCode(baseMoney.currency)}/${getCurrencyCode(quoteMoney.currency)}`
    }

    if (format === "code") {
      // Format: "$117,000.00 BTCUSD"
      const symbol = getSymbolForCurrency(
        baseMoney.currency,
        showSymbolFor !== "none",
      )
      const pairCode = `${getCurrencyCode(quoteMoney.currency)}${getCurrencyCode(baseMoney.currency)}`
      return `${symbol}${formattedRate} ${pairCode}`
    }

    // Default symbol format: "$117,000.00 / BTC"
    const symbol = getSymbolForCurrency(
      baseMoney.currency,
      showSymbolFor !== "none",
    )
    const denomSymbol =
      showSymbolFor === "both"
        ? getSymbolForCurrency(quoteMoney.currency, true)
        : getCurrencyCode(quoteMoney.currency)

    return `${symbol}${formattedRate} / ${denomSymbol}`
  }

  /**
   * Create an ExchangeRate from a JSON representation
   * @param json - JSON object to deserialize
   * @returns New ExchangeRate instance
   * @throws Error if JSON is invalid or malformed
   */
  static fromJSON(json: unknown): ExchangeRate {
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
      const amounts: [AssetAmount, AssetAmount] = [
        {
          asset: validatedData.amounts[0].asset,
          amount: {
            amount: BigInt(validatedData.amounts[0].amount.amount),
            decimals: BigInt(validatedData.amounts[0].amount.decimals),
          },
        },
        {
          asset: validatedData.amounts[1].asset,
          amount: {
            amount: BigInt(validatedData.amounts[1].amount.amount),
            decimals: BigInt(validatedData.amounts[1].amount.decimals),
          },
        },
      ]

      return new ExchangeRate(
        amounts[0],
        amounts[1],
        validatedData.time,
        validatedData.source,
      )
    } catch (error) {
      throw new Error(
        `Failed to parse ExchangeRate from JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  }
}

/**
 * JSON representation of an ExchangeRate (inferred from Zod schema)
 */
export type ExchangeRateJSON = z.infer<typeof ExchangeRateJSONSchema>
