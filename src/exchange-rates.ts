import { z } from "zod"
import { AssetAmount, UNIXTime } from "./types"
import { Money as MoneyClass, AnyAssetJSONSchema } from "./money"
import { Price } from "./prices"
import { ExchangeRateSource } from "./exchange-rate-sources"
import { UNIXTimeSchema } from "./time"
import { NonNegativeBigIntStringSchema } from "./validation-schemas"

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
