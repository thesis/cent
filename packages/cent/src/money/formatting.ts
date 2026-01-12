import { FRACTIONAL_UNIT_SYMBOLS } from "../currencies"
import type { FixedPointNumber } from "../fixed-point"
import type { RoundingMode } from "../types"
import {
  findFractionalUnitInfo,
  pluralizeFractionalUnit,
} from "./fractional-units"

// Forward declaration for Money type to avoid circular dependency
// The actual Money class is in index.ts
export interface MoneyLike {
  readonly currency: {
    code?: string
    name?: string
    symbol?: string
    decimals?: bigint
    fractionalUnit?: string | string[] | Record<number, string | string[]>
    iso4217Support?: boolean
  }
  readonly amount: FixedPointNumber
}

// Extend Intl.NumberFormatOptions to include roundingMode for older TypeScript versions
interface NumberFormatOptionsWithRounding extends Intl.NumberFormatOptions {
  roundingMode?: RoundingMode
}

/**
 * Safely convert a bigint to a number with range checking
 * @param value - The bigint value to convert
 * @param context - Description for error messages
 * @returns The number value
 * @throws Error if value exceeds safe integer range
 */
export function safeNumberFromBigInt(value: bigint, context: string): number {
  if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
    throw new Error(`${context} (${value}) exceeds safe integer range`)
  }
  return Number(value)
}

/**
 * Format a FixedPointNumber as a string for precise display formatting
 * This preserves full precision by using the underlying BigInt representation
 * @param fp - The FixedPointNumber to format
 * @returns The decimal string representation with full precision
 */
export function fixedPointToDecimalString(fp: FixedPointNumber): string {
  return fp.toString()
}

/**
 * Options for formatting Money instances to strings
 */
export interface MoneyToStringOptions {
  /** Display locale (default "en-US") */
  locale?: string
  /** Use compact notation (e.g., $1M instead of $1,000,000) */
  compact?: boolean
  /** Maximum number of decimal places to display */
  maxDecimals?: number | bigint
  /** Minimum number of decimal places to display (forces trailing zeros) */
  minDecimals?: number | bigint
  /** Preferred fractional unit for non-ISO currencies */
  preferredUnit?: string
  /** Prefer symbol formatting over code for non-ISO currencies */
  preferSymbol?: boolean
  /** Use fractional unit symbol (e.g., "§10K" instead of "10K sats") */
  preferFractionalSymbol?: boolean
  /** Rounding mode for number formatting */
  roundingMode?: RoundingMode
  /** Exclude currency symbol/code from the formatted string */
  excludeCurrency?: boolean
}

/**
 * Get the currency display part (symbol or code)
 *
 * @param asset - The currency asset
 * @param preferSymbol - Whether to prefer symbol over code
 * @param unitSuffix - Optional unit suffix from fractional unit conversion
 * @returns The currency display string
 */
export function getCurrencyDisplayPart(
  asset: unknown,
  preferSymbol: boolean,
  unitSuffix?: string,
): string {
  if (unitSuffix) {
    return ` ${unitSuffix}`
  }

  if (
    preferSymbol &&
    typeof asset === "object" &&
    asset !== null &&
    "symbol" in asset
  ) {
    return "" // Symbol would go at the beginning, handled separately
  }

  if (typeof asset === "object" && asset !== null && "code" in asset) {
    return ` ${(asset as { code: string }).code}`
  }

  return ""
}

/**
 * Convert money value to preferred fractional unit if specified
 *
 * @param money - The Money instance
 * @param preferredUnit - The preferred fractional unit
 * @returns Object with decimal string value and unit suffix
 */
export function convertToPreferredUnit(
  money: MoneyLike,
  preferredUnit?: string,
): { decimalString: string; unitSuffix?: string } {
  // Money should have FixedPointNumber amount here due to formatting conversion
  const fp = money.amount
  let decimalString = fixedPointToDecimalString(fp)
  let unitSuffix: string | undefined

  if (
    preferredUnit &&
    "fractionalUnit" in money.currency &&
    money.currency.fractionalUnit
  ) {
    const { fractionalUnit } = money.currency
    const assetDecimals =
      "decimals" in money.currency && money.currency.decimals !== undefined
        ? safeNumberFromBigInt(money.currency.decimals, "Asset decimal places")
        : 0
    const unitInfo = findFractionalUnitInfo(
      fractionalUnit,
      preferredUnit,
      assetDecimals,
    )

    if (unitInfo) {
      // Convert to the fractional unit using BigInt arithmetic
      const multiplierDecimals = BigInt(unitInfo.decimals)
      const convertedFp = fp.multiply({
        amount: 10n ** multiplierDecimals,
        decimals: 0n,
      })
      decimalString = fixedPointToDecimalString(convertedFp)

      // Parse the decimal string to determine pluralization
      const numericValue = parseFloat(decimalString)
      if (numericValue === 1) {
        unitSuffix = preferredUnit
      } else {
        unitSuffix = pluralizeFractionalUnit(preferredUnit)
      }
    }
  }

  return { decimalString, unitSuffix }
}

/**
 * Normalize locale string to a standard format
 *
 * @param locale - The input locale string
 * @returns Normalized locale string
 */
export function normalizeLocale(locale: string): string {
  // Convert underscore to hyphen (e.g., "en_US" -> "en-US")
  return locale.replace("_", "-")
}

/**
 * Determine if an asset supports ISO 4217 formatting
 *
 * @param asset - The asset to check
 * @returns true if ISO 4217 formatting should be used
 */
export function shouldUseIsoFormatting(asset: unknown): boolean {
  return (
    typeof asset === "object" &&
    asset !== null &&
    "iso4217Support" in asset &&
    (asset as { iso4217Support: boolean }).iso4217Support === true
  )
}

/**
 * Format money using Intl.NumberFormat with currency support
 *
 * @param money - The Money instance to format
 * @param locale - The locale to use for formatting
 * @param compact - Whether to use compact notation
 * @param maxDecimals - Maximum decimal places
 * @param roundingMode - Rounding mode for number formatting
 * @returns Formatted string using ISO 4217 currency formatting
 */
export function formatWithIntlCurrency(
  money: MoneyLike,
  locale: string,
  compact: boolean,
  maxDecimals?: number | bigint,
  minDecimals?: number | bigint,
  roundingMode?: RoundingMode,
  excludeCurrency: boolean = false,
): string {
  // Money should have FixedPointNumber amount here due to formatting conversion
  const fp = money.amount
  const decimalString = fixedPointToDecimalString(fp)

  // Get currency code for ISO formatting
  const currencyCode =
    "code" in money.currency ? (money.currency as { code: string }).code : "XXX"

  // Determine decimal places
  const assetDecimals =
    "decimals" in money.currency && money.currency.decimals !== undefined
      ? safeNumberFromBigInt(money.currency.decimals, "Asset decimal places")
      : 2
  const requestedMinDecimals =
    minDecimals !== undefined
      ? safeNumberFromBigInt(
          typeof minDecimals === "bigint" ? minDecimals : BigInt(minDecimals),
          "Min decimal places",
        )
      : undefined

  const requestedMaxDecimals =
    maxDecimals !== undefined
      ? Math.min(
          safeNumberFromBigInt(
            typeof maxDecimals === "bigint" ? maxDecimals : BigInt(maxDecimals),
            "Max decimal places",
          ),
          20,
        )
      : undefined

  // Determine final decimal places based on priority:
  // 1. If both min and max are specified, max takes precedence when there's conflict
  // 2. If only min is specified, it can extend beyond currency defaults
  // 3. Default behavior for unspecified values
  let finalMinDecimals: number
  if (requestedMinDecimals !== undefined) {
    if (requestedMaxDecimals !== undefined) {
      finalMinDecimals = Math.min(requestedMinDecimals, requestedMaxDecimals)
    } else {
      finalMinDecimals = requestedMinDecimals
    }
  } else if (compact) {
    finalMinDecimals = 0
  } else {
    finalMinDecimals = Math.min(
      assetDecimals,
      requestedMaxDecimals ?? assetDecimals,
    )
  }

  let finalMaxDecimals: number
  if (requestedMaxDecimals !== undefined) {
    finalMaxDecimals = requestedMaxDecimals
  } else if (
    requestedMinDecimals !== undefined &&
    requestedMinDecimals > assetDecimals
  ) {
    finalMaxDecimals = requestedMinDecimals
  } else {
    finalMaxDecimals = assetDecimals
  }

  const formatterOptions: NumberFormatOptionsWithRounding = {
    style: excludeCurrency ? "decimal" : "currency",
    currency: excludeCurrency ? undefined : currencyCode,
    notation: compact ? "compact" : "standard",
    compactDisplay: compact ? "short" : undefined,
    minimumFractionDigits: finalMinDecimals,
    maximumFractionDigits: finalMaxDecimals,
  }

  if (roundingMode) {
    formatterOptions.roundingMode = roundingMode
  }

  const formatter = new Intl.NumberFormat(
    normalizeLocale(locale),
    formatterOptions,
  )

  // Convert decimal string to number for formatting
  return formatter.format(decimalString)
}

/**
 * Format money using custom formatting for non-ISO currencies
 *
 * @param money - The Money instance to format
 * @param locale - The locale to use for formatting
 * @param compact - Whether to use compact notation
 * @param maxDecimals - Maximum decimal places
 * @param preferredUnit - Preferred fractional unit
 * @param preferSymbol - Whether to prefer symbol over code
 * @param preferFractionalSymbol - Whether to use fractional unit symbol
 * @param roundingMode - Rounding mode for number formatting
 * @returns Formatted string using custom formatting
 */
export function formatWithCustomFormatting(
  money: MoneyLike,
  locale: string,
  compact: boolean,
  maxDecimals?: number | bigint,
  minDecimals?: number | bigint,
  preferredUnit?: string,
  preferSymbol: boolean = false,
  preferFractionalSymbol: boolean = false,
  roundingMode?: RoundingMode,
  excludeCurrency: boolean = false,
): string {
  // Handle fractional unit conversion if specified
  const { decimalString, unitSuffix } = convertToPreferredUnit(
    money,
    preferredUnit,
  )

  // Determine decimal places
  const assetDecimals =
    "decimals" in money.currency && money.currency.decimals !== undefined
      ? safeNumberFromBigInt(money.currency.decimals, "Asset decimal places")
      : 2
  const requestedMinDecimals =
    minDecimals !== undefined
      ? safeNumberFromBigInt(
          typeof minDecimals === "bigint" ? minDecimals : BigInt(minDecimals),
          "Min decimal places",
        )
      : undefined

  const requestedMaxDecimals =
    maxDecimals !== undefined
      ? safeNumberFromBigInt(
          typeof maxDecimals === "bigint" ? maxDecimals : BigInt(maxDecimals),
          "Max decimal places",
        )
      : undefined

  // Determine final decimal places based on priority:
  // 1. If both min and max are specified, max takes precedence when there's conflict
  // 2. If only min is specified, it can extend beyond currency defaults
  // 3. Default behavior for unspecified values
  let finalMinDecimals: number
  if (requestedMinDecimals !== undefined) {
    if (requestedMaxDecimals !== undefined) {
      finalMinDecimals = Math.min(requestedMinDecimals, requestedMaxDecimals)
    } else {
      finalMinDecimals = requestedMinDecimals
    }
  } else {
    finalMinDecimals = 0
  }

  let finalMaxDecimals: number
  if (requestedMaxDecimals !== undefined) {
    finalMaxDecimals = requestedMaxDecimals
  } else if (
    requestedMinDecimals !== undefined &&
    requestedMinDecimals > assetDecimals
  ) {
    finalMaxDecimals = requestedMinDecimals
  } else {
    finalMaxDecimals = assetDecimals
  }

  // Format the number part using Intl.NumberFormat with string input
  const formatterOptions: NumberFormatOptionsWithRounding = {
    style: "decimal",
    notation: compact ? "compact" : "standard",
    compactDisplay: compact ? "short" : undefined,
    minimumFractionDigits: finalMinDecimals,
    maximumFractionDigits: finalMaxDecimals,
  }

  if (roundingMode) {
    formatterOptions.roundingMode = roundingMode
  }

  const formatter = new Intl.NumberFormat(
    normalizeLocale(locale),
    formatterOptions,
  )

  // Convert decimal string to number for formatting
  const formattedNumber = formatter.format(decimalString)

  // Return just the formatted number if currency should be excluded
  if (excludeCurrency) {
    return formattedNumber
  }

  // Handle fractional unit symbol formatting
  if (preferFractionalSymbol && preferredUnit && unitSuffix) {
    // Look for a fractional unit symbol that matches the currency and unit
    const fractionalSymbol = Object.values(FRACTIONAL_UNIT_SYMBOLS).find(
      (info) =>
        info.currency.code === money.currency.code &&
        (info.unit === preferredUnit ||
          (preferredUnit === "sat" && info.unit === "sat") ||
          (preferredUnit === "satoshi" && info.unit === "sat") ||
          (preferredUnit === "cent" && info.unit === "cent") ||
          (preferredUnit === "pence" && info.unit === "pence")),
    )

    if (fractionalSymbol) {
      return `${fractionalSymbol.symbol}${formattedNumber}`
    }
  }

  // Handle symbol vs code formatting
  if (preferSymbol && "symbol" in money.currency && !unitSuffix) {
    return `${(money.currency as { symbol: string }).symbol}${formattedNumber}`
  }

  // Add currency code or unit suffix
  const currencyPart = getCurrencyDisplayPart(
    money.currency,
    preferSymbol,
    unitSuffix,
  )
  return `${formattedNumber}${currencyPart}`
}
