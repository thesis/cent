import {
  type Currency,
  getCurrencyFromCode,
  Money,
  MoneyClass,
} from "@thesis-co/cent"
import { z } from "zod"
import { zDecimalString, zRationalNumberJSON } from "./common"
import { zCurrencyObject } from "./currency"

/**
 * Schema for MoneyAmount JSON:
 * - Decimal string: "100.50"
 * - Rational number: { p: "10050", q: "100" }
 */
const zMoneyAmountJSON = z.union([zDecimalString, zRationalNumberJSON])

/**
 * Schema for Money JSON object representation
 * Transforms to Money instance
 */
export const zMoneyJSON = z
  .object({
    currency: z.union([zCurrencyObject, z.string()]),
    amount: zMoneyAmountJSON,
  })
  .transform((data) => {
    return MoneyClass.fromJSON(data)
  })

/**
 * Schema that parses money string format (e.g., "$100.50", "100 USD")
 * Transforms to Money instance
 */
export const zMoneyString = z.string().transform((val, ctx) => {
  try {
    return Money(val)
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      error: `Invalid money string: ${error instanceof Error ? error.message : "Unknown error"}`,
      params: { centError: "PARSE_ERROR" },
    })
    return z.NEVER
  }
})

/**
 * Options for zMoney schema
 */
export interface ZMoneyOptions {
  /** Restrict to specific currency */
  currency?: string
  /** Minimum value (inclusive) */
  min?: string
  /** Maximum value (inclusive) */
  max?: string
  /** Require positive value (> 0) */
  positive?: boolean
  /** Require non-negative value (>= 0) */
  nonNegative?: boolean
  /** Require non-zero value (!= 0) */
  nonZero?: boolean
}

/**
 * Create a Money validation schema with optional constraints
 *
 * @example
 * ```ts
 * // Basic - any currency
 * const schema = zMoney()
 * schema.parse("$100.50") // Money instance
 *
 * // Currency constrained
 * const usdSchema = zMoney("USD")
 * usdSchema.parse("$100") // OK
 * usdSchema.parse("€100") // Error
 *
 * // With validation options
 * const paymentSchema = zMoney({
 *   currency: "USD",
 *   min: "$0.50",
 *   max: "$10000",
 *   positive: true,
 * })
 * ```
 */
export function zMoney(currencyOrOptions?: string | ZMoneyOptions) {
  const options: ZMoneyOptions =
    typeof currencyOrOptions === "string"
      ? { currency: currencyOrOptions }
      : (currencyOrOptions ?? {})

  // Parse min/max as Money if provided
  let minMoney: InstanceType<typeof MoneyClass> | undefined
  let maxMoney: InstanceType<typeof MoneyClass> | undefined

  if (options.min) {
    try {
      minMoney = Money(options.min)
    } catch {
      throw new Error(`Invalid min value: ${options.min}`)
    }
  }

  if (options.max) {
    try {
      maxMoney = Money(options.max)
    } catch {
      throw new Error(`Invalid max value: ${options.max}`)
    }
  }

  // Get expected currency if specified
  let expectedCurrency: Currency | undefined
  if (options.currency) {
    expectedCurrency = getCurrencyFromCode(options.currency)
  }

  return z
    .union([zMoneyString, zMoneyJSON, z.instanceof(MoneyClass)])
    .transform((money, ctx) => {
      // Handle passthrough of Money instances
      const result = money instanceof MoneyClass ? money : money

      // Currency validation
      if (expectedCurrency && result.currency.code !== expectedCurrency.code) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          error: `Expected currency ${expectedCurrency.code}, got ${result.currency.code}`,
        })
        return z.NEVER
      }

      // Min validation
      if (minMoney && result.compare(minMoney) < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          error: `Amount must be at least ${minMoney.toString()}`,
        })
        return z.NEVER
      }

      // Max validation
      if (maxMoney && result.compare(maxMoney) > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          error: `Amount must be at most ${maxMoney.toString()}`,
        })
        return z.NEVER
      }

      // Positive validation
      if (options.positive && !result.isPositive()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          error: "Amount must be positive",
        })
        return z.NEVER
      }

      // Non-negative validation
      if (options.nonNegative && result.isNegative()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          error: "Amount must be non-negative",
        })
        return z.NEVER
      }

      // Non-zero validation
      if (options.nonZero && result.isZero()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          error: "Amount must not be zero",
        })
        return z.NEVER
      }

      return result
    })
}
