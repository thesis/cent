import { Money, MoneyClass, Price } from "@thesis-co/cent"
import { z } from "zod"

/**
 * Schema for Price from an object with two amounts
 */
export const zPriceFromObject = z
  .object({
    numerator: z.union([z.string(), z.instanceof(MoneyClass)]),
    denominator: z.union([z.string(), z.instanceof(MoneyClass)]),
    time: z.string().optional(),
  })
  .transform((data, ctx) => {
    try {
      const numerator =
        typeof data.numerator === "string"
          ? Money(data.numerator)
          : data.numerator
      const denominator =
        typeof data.denominator === "string"
          ? Money(data.denominator)
          : data.denominator
      return new Price(numerator, denominator, data.time)
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Invalid price: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      return z.NEVER
    }
  })

/**
 * Schema for Price from a tuple of two money strings
 * e.g., ["$50,000", "1 BTC"]
 */
export const zPriceFromTuple = z
  .tuple([z.string(), z.string()])
  .transform((data, ctx) => {
    try {
      const [str1, str2] = data
      const money1 = Money(str1)
      const money2 = Money(str2)
      return new Price(money1, money2)
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Invalid price: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      return z.NEVER
    }
  })

/**
 * Options for zPrice schema
 */
export interface ZPriceOptions {
  /** Expected currency for numerator */
  numeratorCurrency?: string
  /** Expected currency for denominator */
  denominatorCurrency?: string
}

/**
 * Create a Price validation schema with optional currency constraints
 *
 * @example
 * ```ts
 * // Basic - any currencies
 * const schema = zPrice()
 * schema.parse({ numerator: "$50,000", denominator: "1 BTC" })
 *
 * // With currency constraints
 * const btcUsdSchema = zPrice("USD", "BTC")
 * btcUsdSchema.parse(["$50,000", "1 BTC"]) // OK
 * ```
 */
export function zPrice(
  numeratorCurrency?: string,
  denominatorCurrency?: string,
) {
  const baseSchema = z.union([zPriceFromObject, zPriceFromTuple])

  if (!numeratorCurrency && !denominatorCurrency) {
    return baseSchema
  }

  return baseSchema.transform((price, ctx) => {
    const numCurrency = price.amounts[0].asset
    const denomCurrency = price.amounts[1].asset

    if (
      numeratorCurrency &&
      "code" in numCurrency &&
      numCurrency.code !== numeratorCurrency
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Expected numerator currency ${numeratorCurrency}, got ${numCurrency.code}`,
      })
      return z.NEVER
    }

    if (
      denominatorCurrency &&
      "code" in denomCurrency &&
      denomCurrency.code !== denominatorCurrency
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Expected denominator currency ${denominatorCurrency}, got ${denomCurrency.code}`,
      })
      return z.NEVER
    }

    return price
  })
}
