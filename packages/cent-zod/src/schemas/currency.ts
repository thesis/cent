import { type Currency, currencies, getCurrencyFromCode } from "@thesis-co/cent"
import { z } from "zod"
import { zNonNegativeBigIntString } from "./common"

/**
 * Schema that validates a currency code string and transforms to Currency object
 */
export const zCurrencyCode = z.string().transform((code, ctx) => {
  try {
    return getCurrencyFromCode(code)
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      error: `Unknown currency code: ${code}`,
    })
    return z.NEVER
  }
})

/**
 * Schema for full Currency object representation (validation only, no transform)
 */
export const zCurrencyObject = z.object({
  name: z.string(),
  code: z.string(),
  decimals: z.union([z.bigint(), zNonNegativeBigIntString]),
  symbol: z.string(),
  fractionalUnit: z
    .union([
      z.string(),
      z.array(z.string()),
      z.record(z.string(), z.union([z.string(), z.array(z.string())])),
    ])
    .optional(),
  iso4217Support: z.boolean().optional(),
})

/**
 * Options for zCurrency schema
 */
export interface ZCurrencyOptions {
  /** Only allow these currency codes */
  allowed?: string[]
  /** Deny these currency codes */
  denied?: string[]
  /** Filter by currency type */
  type?: "fiat" | "crypto" | "all"
}

/**
 * Create a currency validation schema
 *
 * @example
 * ```ts
 * // Any valid currency
 * const schema = zCurrency()
 * schema.parse("USD") // Returns USD Currency object
 *
 * // Only specific currencies
 * const usdEurSchema = zCurrency({ allowed: ["USD", "EUR"] })
 *
 * // Only fiat currencies
 * const fiatSchema = zCurrency({ type: "fiat" })
 * ```
 */
export function zCurrency(options?: ZCurrencyOptions) {
  return z.string().transform((code, ctx) => {
    const upperCode = code.toUpperCase()

    // Check allowlist
    if (options?.allowed && !options.allowed.includes(upperCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Currency ${upperCode} is not in allowed list: ${options.allowed.join(", ")}`,
      })
      return z.NEVER
    }

    // Check denylist
    if (options?.denied?.includes(upperCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Currency ${upperCode} is not allowed`,
      })
      return z.NEVER
    }

    // Get the currency
    let currency: Currency
    try {
      currency = getCurrencyFromCode(upperCode)
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        error: `Unknown currency code: ${code}`,
      })
      return z.NEVER
    }

    // Check type filter
    if (options?.type && options.type !== "all") {
      const isFiat = currency.iso4217Support === true
      if (options.type === "fiat" && !isFiat) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          error: `Currency ${upperCode} is not a fiat currency`,
        })
        return z.NEVER
      }
      if (options.type === "crypto" && isFiat) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          error: `Currency ${upperCode} is not a cryptocurrency`,
        })
        return z.NEVER
      }
    }

    return currency
  })
}

/**
 * Get all valid currency codes
 */
export function getValidCurrencyCodes(): string[] {
  return Object.keys(currencies)
}
