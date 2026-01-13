import {
  Money,
  MoneyClass,
  PriceRangeClass,
  PriceRangeFactory,
} from "@thesis-co/cent"
import { z } from "zod"

/**
 * Schema for PriceRange from string (e.g., "$50 - $100")
 */
export const zPriceRangeString = z.string().transform((val, ctx) => {
  try {
    return PriceRangeFactory(val)
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      error: `Invalid price range string: ${error instanceof Error ? error.message : "Unknown error"}`,
    })
    return z.NEVER
  }
})

/**
 * Schema for PriceRange from min/max object
 */
export const zPriceRangeObject = z
  .object({
    min: z.union([z.string(), z.instanceof(MoneyClass)]),
    max: z.union([z.string(), z.instanceof(MoneyClass)]),
  })
  .transform((data, ctx) => {
    try {
      const min = typeof data.min === "string" ? Money(data.min) : data.min
      const max = typeof data.max === "string" ? Money(data.max) : data.max
      return new PriceRangeClass(min, max)
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Invalid price range: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      return z.NEVER
    }
  })

/**
 * Schema for PriceRange from JSON (with nested Money JSON)
 */
export const zPriceRangeJSON = z
  .object({
    min: z.unknown(),
    max: z.unknown(),
  })
  .transform((data, ctx) => {
    try {
      return PriceRangeClass.fromJSON(data)
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Invalid price range JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      return z.NEVER
    }
  })

/**
 * Options for zPriceRange schema
 */
export interface ZPriceRangeOptions {
  /** Expected currency */
  currency?: string
  /** Minimum allowed span between min and max */
  minSpan?: string
  /** Maximum allowed span between min and max */
  maxSpan?: string
  /** Bounds constraints */
  bounds?: {
    /** Minimum allowed value for the range's min */
    min?: string
    /** Maximum allowed value for the range's max */
    max?: string
  }
}

/**
 * Create a PriceRange validation schema with optional constraints
 *
 * @example
 * ```ts
 * // Basic - any currency
 * const schema = zPriceRange()
 * schema.parse("$50 - $100") // PriceRange instance
 *
 * // Currency constrained
 * const usdSchema = zPriceRange("USD")
 *
 * // With span and bounds constraints
 * const filterSchema = zPriceRange({
 *   currency: "USD",
 *   bounds: { min: "$0", max: "$10000" },
 *   minSpan: "$10",
 * })
 * ```
 */
export function zPriceRange(currencyOrOptions?: string | ZPriceRangeOptions) {
  const options: ZPriceRangeOptions =
    typeof currencyOrOptions === "string"
      ? { currency: currencyOrOptions }
      : (currencyOrOptions ?? {})

  const baseSchema = z.union([
    zPriceRangeString,
    zPriceRangeObject,
    zPriceRangeJSON,
  ])

  if (
    !options.currency &&
    !options.minSpan &&
    !options.maxSpan &&
    !options.bounds
  ) {
    return baseSchema
  }

  // Parse constraint values
  let minSpanMoney: InstanceType<typeof MoneyClass> | undefined
  let maxSpanMoney: InstanceType<typeof MoneyClass> | undefined
  let boundsMin: InstanceType<typeof MoneyClass> | undefined
  let boundsMax: InstanceType<typeof MoneyClass> | undefined

  if (options.minSpan) {
    minSpanMoney = Money(options.minSpan)
  }
  if (options.maxSpan) {
    maxSpanMoney = Money(options.maxSpan)
  }
  if (options.bounds?.min) {
    boundsMin = Money(options.bounds.min)
  }
  if (options.bounds?.max) {
    boundsMax = Money(options.bounds.max)
  }

  return baseSchema.transform((range, ctx) => {
    // Currency validation
    if (options.currency && range.currency.code !== options.currency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Expected currency ${options.currency}, got ${range.currency.code}`,
      })
      return z.NEVER
    }

    // Min span validation
    if (minSpanMoney && range.span.compare(minSpanMoney) < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Range span must be at least ${minSpanMoney.toString()}`,
      })
      return z.NEVER
    }

    // Max span validation
    if (maxSpanMoney && range.span.compare(maxSpanMoney) > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Range span must be at most ${maxSpanMoney.toString()}`,
      })
      return z.NEVER
    }

    // Bounds min validation
    if (boundsMin && range.min.compare(boundsMin) < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Range minimum must be at least ${boundsMin.toString()}`,
      })
      return z.NEVER
    }

    // Bounds max validation
    if (boundsMax && range.max.compare(boundsMax) > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Range maximum must be at most ${boundsMax.toString()}`,
      })
      return z.NEVER
    }

    return range
  })
}
