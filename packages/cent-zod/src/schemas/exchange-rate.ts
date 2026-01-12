import {
  ExchangeRate,
  FixedPointNumber,
  getCurrencyFromCode,
} from "@thesis-co/cent"
import { z } from "zod"
import { zDecimalString, zFixedPointJSON } from "./common"
import { zCurrencyObject } from "./currency"

/**
 * Schema for ExchangeRateSource
 */
export const zExchangeRateSource = z.object({
  name: z.string(),
  priority: z.number(),
  reliability: z.number().min(0).max(1),
})

/**
 * Schema for ExchangeRate from full JSON representation
 */
export const zExchangeRateJSON = z
  .object({
    baseCurrency: z.union([zCurrencyObject, z.string()]),
    quoteCurrency: z.union([zCurrencyObject, z.string()]),
    rate: z.union([zFixedPointJSON, zDecimalString]),
    timestamp: z.string().optional(),
    source: zExchangeRateSource.optional(),
  })
  .transform((data, ctx) => {
    try {
      const baseCurrency =
        typeof data.baseCurrency === "string"
          ? getCurrencyFromCode(data.baseCurrency)
          : data.baseCurrency
      const quoteCurrency =
        typeof data.quoteCurrency === "string"
          ? getCurrencyFromCode(data.quoteCurrency)
          : data.quoteCurrency

      let rate: FixedPointNumber
      if (typeof data.rate === "string") {
        rate = FixedPointNumber.fromDecimalString(data.rate)
      } else {
        rate = new FixedPointNumber(data.rate.amount, data.rate.decimals)
      }

      return new ExchangeRate({
        baseCurrency,
        quoteCurrency,
        rate,
        timestamp: data.timestamp,
        source: data.source,
      })
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Invalid exchange rate: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      return z.NEVER
    }
  })

/**
 * Schema for compact ExchangeRate input
 * e.g., { base: "USD", quote: "EUR", rate: "0.92" }
 */
export const zExchangeRateCompact = z
  .object({
    base: z.string(),
    quote: z.string(),
    rate: z.string(),
    timestamp: z.string().optional(),
  })
  .transform((data, ctx) => {
    try {
      const baseCurrency = getCurrencyFromCode(data.base)
      const quoteCurrency = getCurrencyFromCode(data.quote)
      const rate = FixedPointNumber.fromDecimalString(data.rate)

      return new ExchangeRate({
        baseCurrency,
        quoteCurrency,
        rate,
        timestamp: data.timestamp,
      })
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Invalid exchange rate: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      return z.NEVER
    }
  })

/**
 * Options for zExchangeRate schema
 */
export interface ZExchangeRateOptions {
  /** Expected base currency */
  base?: string
  /** Expected quote currency */
  quote?: string
  /** Maximum age of timestamp in milliseconds */
  maxAge?: number
}

/**
 * Create an ExchangeRate validation schema with optional constraints
 *
 * @example
 * ```ts
 * // Basic - any currencies
 * const schema = zExchangeRate()
 * schema.parse({ base: "USD", quote: "EUR", rate: "0.92" })
 *
 * // With currency constraints
 * const usdEurSchema = zExchangeRate("USD", "EUR")
 *
 * // With staleness check
 * const freshRateSchema = zExchangeRate({
 *   base: "BTC",
 *   quote: "USD",
 *   maxAge: 60000, // 1 minute
 * })
 * ```
 */
export function zExchangeRate(
  baseOrOptions?: string | ZExchangeRateOptions,
  quote?: string,
) {
  const options: ZExchangeRateOptions =
    typeof baseOrOptions === "string"
      ? { base: baseOrOptions, quote }
      : (baseOrOptions ?? {})

  const baseSchema = z.union([zExchangeRateJSON, zExchangeRateCompact])

  if (!options.base && !options.quote && !options.maxAge) {
    return baseSchema
  }

  return baseSchema.transform((rate, ctx) => {
    // Validate base currency
    if (options.base && rate.baseCurrency.code !== options.base) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Expected base currency ${options.base}, got ${rate.baseCurrency.code}`,
      })
      return z.NEVER
    }

    // Validate quote currency
    if (options.quote && rate.quoteCurrency.code !== options.quote) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Expected quote currency ${options.quote}, got ${rate.quoteCurrency.code}`,
      })
      return z.NEVER
    }

    // Validate timestamp age
    if (options.maxAge && rate.timestamp) {
      const timestampMs = Number(rate.timestamp) * 1000
      const age = Date.now() - timestampMs
      if (age > options.maxAge) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          error: `Exchange rate is stale: ${age}ms old (max: ${options.maxAge}ms)`,
        })
        return z.NEVER
      }
    }

    return rate
  })
}
