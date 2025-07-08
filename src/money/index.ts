import { z, ZodError } from "zod"
import { AssetAmount, FixedPoint, RoundingMode, Currency } from "../types"
import { MoneyAmount } from "./types"
import { FixedPointNumber, FixedPointJSONSchema } from "../fixed-point"
import { RationalNumber, RationalNumberJSONSchema } from "../rationals"
import { assetsEqual, isAssetAmount } from "../assets"
import { NonNegativeBigIntStringSchema } from "../validation-schemas"
import { parseMoneyString } from "./parsing"
import {
  isFixedPointNumber,
  isRationalNumber,
  toFixedPointNumber,
  isZero as isMoneyAmountZero,
  isPositive as isMoneyAmountPositive,
  isNegative as isMoneyAmountNegative,
} from "./utils"

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
function safeNumberFromBigInt(value: bigint, context: string): number {
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
function fixedPointToDecimalString(fp: FixedPointNumber): string {
  return fp.toString()
}

// Schema for basic Asset
const AssetJSONSchema = z.object({
  name: z.string(),
})

// Schema for FungibleAsset (extends Asset)
const FungibleAssetJSONSchema = AssetJSONSchema.extend({
  code: z.string(),
  decimals: NonNegativeBigIntStringSchema,
  fractionalUnit: z
    .union([
      z.string(),
      z.array(z.string()),
      z.record(z.string(), z.union([z.string(), z.array(z.string())])),
    ])
    .optional(),
})

// Schema for Currency (extends FungibleAsset)
const CurrencyJSONSchema = FungibleAssetJSONSchema.extend({
  symbol: z.string(),
})

// Union schema for any asset type
const AnyAssetJSONSchema = z.union([
  CurrencyJSONSchema,
  FungibleAssetJSONSchema,
  AssetJSONSchema,
])

// Schema for MoneyAmount (union of FixedPointNumber and RationalNumber)
// Type is inferred from structure: {amount, decimals} vs {p, q}
const MoneyAmountJSONSchema = z.union([
  FixedPointJSONSchema, // {amount: string, decimals: string}
  RationalNumberJSONSchema, // {p: string, q: string}
])

// Schema for the complete Money JSON structure
export const MoneyJSONSchema = z.object({
  currency: AnyAssetJSONSchema,
  amount: MoneyAmountJSONSchema,
})

// Type for the validated Money JSON structure
export type MoneyJSON = z.infer<typeof MoneyJSONSchema>

/**
 * Safe validation of Money JSON data using Zod schema
 * @param data - The data to validate
 * @returns Result object with success flag and either data or error
 */
export function safeValidateMoneyJSON(data: unknown):
  | {
      success: true
      data: MoneyJSON
    }
  | {
      success: false
      error: ZodError
    } {
  const result = MoneyJSONSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
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
  /** Rounding mode for number formatting */
  roundingMode?: RoundingMode
}

/**
 * Pluralize fractional unit names
 *
 * @param unitName - The singular unit name
 * @returns The pluralized unit name
 */
export function pluralizeFractionalUnit(unitName: string): string {
  // Handle special cases for irregular plurals
  const irregularPlurals: Record<string, string> = {
    penny: "pence",
    kopek: "kopeks",
    grosz: "groszy",
    fils: "fils", // Already plural
    sen: "sen", // Already plural
    pul: "puls",
    qəpik: "qəpiks",
    tyiyn: "tyiyns",
    möngö: "möngös",
  }

  if (irregularPlurals[unitName]) {
    return irregularPlurals[unitName]
  }

  // Handle regular pluralization rules
  if (unitName.endsWith("y")) {
    return `${unitName.slice(0, -1)}ies`
  }
  if (unitName.endsWith("z")) {
    return `${unitName}zes`
  }
  if (
    unitName.endsWith("s") ||
    unitName.endsWith("sh") ||
    unitName.endsWith("ch") ||
    unitName.endsWith("x")
  ) {
    return `${unitName}es`
  }
  return `${unitName}s`
}

/**
 * Find information about a fractional unit
 *
 * @param fractionalUnit - The fractional unit definition from the asset
 * @param unitName - The unit name to search for
 * @returns Unit information or null if not found
 */
export function findFractionalUnitInfo(
  fractionalUnit: string | string[] | Record<number, string | string[]>,
  unitName: string,
  assetDecimals: number,
): { decimals: number; name: string } | null {
  if (typeof fractionalUnit === "string") {
    if (fractionalUnit === unitName) {
      return { decimals: assetDecimals, name: fractionalUnit }
    }
  } else if (Array.isArray(fractionalUnit)) {
    if (fractionalUnit.includes(unitName)) {
      return { decimals: assetDecimals, name: fractionalUnit[0] }
    }
  } else {
    const entries = Object.entries(fractionalUnit)
    const foundEntry = entries.find(([, names]) => {
      const nameArray = Array.isArray(names) ? names : [names]
      return nameArray.includes(unitName)
    })

    if (foundEntry) {
      const [decimalsStr, names] = foundEntry
      const decimals = parseInt(decimalsStr, 10)
      const nameArray = Array.isArray(names) ? names : [names]
      return { decimals, name: nameArray[0] }
    }
  }

  return null
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
  money: Money,
  preferredUnit?: string,
): { decimalString: string; unitSuffix?: string } {
  // Money should have FixedPointNumber amount here due to formatting conversion
  const fp = money.amount as FixedPointNumber
  let decimalString = fixedPointToDecimalString(fp)
  let unitSuffix: string | undefined

  if (
    preferredUnit &&
    "fractionalUnit" in money.currency &&
    money.currency.fractionalUnit
  ) {
    const { fractionalUnit } = money.currency
    const assetDecimals =
      "decimals" in money.currency
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
  money: Money,
  locale: string,
  compact: boolean,
  maxDecimals?: number | bigint,
  minDecimals?: number | bigint,
  roundingMode?: RoundingMode,
): string {
  // Money should have FixedPointNumber amount here due to formatting conversion
  const fp = money.amount as FixedPointNumber
  const decimalString = fixedPointToDecimalString(fp)

  // Get currency code for ISO formatting
  const currencyCode =
    "code" in money.currency ? (money.currency as { code: string }).code : "XXX"

  // Determine decimal places
  const assetDecimals =
    "decimals" in money.currency
      ? safeNumberFromBigInt(
          (money.currency as { decimals: bigint }).decimals,
          "Asset decimal places",
        )
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
    style: "currency",
    currency: currencyCode,
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
  return formatter.format(parseFloat(decimalString))
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
 * @param roundingMode - Rounding mode for number formatting
 * @returns Formatted string using custom formatting
 */
export function formatWithCustomFormatting(
  money: Money,
  locale: string,
  compact: boolean,
  maxDecimals?: number | bigint,
  minDecimals?: number | bigint,
  preferredUnit?: string,
  preferSymbol: boolean = false,
  roundingMode?: RoundingMode,
): string {
  // Handle fractional unit conversion if specified
  const { decimalString, unitSuffix } = convertToPreferredUnit(
    money,
    preferredUnit,
  )

  // Determine decimal places
  const assetDecimals =
    "decimals" in money.currency
      ? safeNumberFromBigInt(
          (money.currency as { decimals: bigint }).decimals,
          "Asset decimal places",
        )
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
  const formattedNumber = formatter.format(parseFloat(decimalString))

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

export class Money {
  readonly currency: Currency

  readonly amount: MoneyAmount

  /**
   * Create a new Money instance
   *
   * @param currency - The currency for this money
   * @param amount - The amount as either FixedPointNumber or RationalNumber
   */
  constructor(currency: Currency, amount: MoneyAmount)
  /**
   * Create a new Money instance (backward compatibility)
   *
   * @param balance - The asset amount balance
   */
  constructor(balance: AssetAmount)
  constructor(currencyOrBalance: Currency | AssetAmount, amount?: MoneyAmount) {
    if (amount !== undefined) {
      // New constructor: (currency, amount)
      this.currency = currencyOrBalance as Currency
      this.amount = amount
    } else {
      // Legacy constructor: (balance)
      const balance = currencyOrBalance as AssetAmount
      this.currency = balance.asset as Currency
      this.amount = new FixedPointNumber(
        balance.amount.amount,
        balance.amount.decimals,
      )
    }
  }

  /**
   * Helper method to convert string arguments to Money instances
   *
   * @param value - String representation or existing Money instance
   * @param referenceCurrency - Currency to validate against if value is a string
   * @returns Money instance
   * @throws Error if string parsing fails or currencies don't match
   */
  private static parseStringToMoney(
    value: string | Money,
    referenceCurrency: Currency,
  ): Money {
    if (value instanceof Money) {
      return value
    }

    // Parse the string to get a Money instance
    const parseResult = parseMoneyString(value)
    const parsed = new Money({
      asset: parseResult.currency,
      amount: {
        amount: parseResult.amount.amount,
        decimals: parseResult.amount.decimals,
      },
    })

    // Validate that currencies match
    if (!assetsEqual(parsed.currency, referenceCurrency)) {
      throw new Error(
        `Currency mismatch: expected ${referenceCurrency.code || referenceCurrency.name}, got ${parsed.currency.code || parsed.currency.name}`,
      )
    }

    return parsed
  }

  /**
   * Get the asset for this Money instance (convenience getter for backward compatibility)
   */
  get asset() {
    return this.currency
  }

  /**
   * Get the balance as AssetAmount for backward compatibility
   */
  get balance(): AssetAmount {
    const fixedPoint = isFixedPointNumber(this.amount)
      ? this.amount
      : toFixedPointNumber(this.amount)

    return {
      asset: this.currency,
      amount: {
        amount: fixedPoint.amount,
        decimals: fixedPoint.decimals,
      },
    }
  }

  /**
   * Add money or an asset amount to this Money instance
   *
   * @param other - The Money, AssetAmount, or string representation to add
   * @returns A new Money instance with the sum
   * @throws Error if the assets are not the same type
   */
  add(other: Money | AssetAmount | string): Money {
    let otherMoney: Money
    if (typeof other === "string") {
      otherMoney = Money.parseStringToMoney(other, this.currency)
    } else if (other instanceof Money) {
      otherMoney = other
    } else {
      otherMoney = new Money(other)
    }

    if (!assetsEqual(this.currency, otherMoney.currency)) {
      throw new Error("Cannot add Money with different asset types")
    }

    // If both are FixedPointNumber, use fast path
    if (
      isFixedPointNumber(this.amount) &&
      isFixedPointNumber(otherMoney.amount)
    ) {
      const result = this.amount.add(otherMoney.amount)
      return new Money(this.currency, result)
    }

    // If either is RationalNumber, convert both to RationalNumber and add
    const thisRational = isRationalNumber(this.amount)
      ? this.amount
      : new RationalNumber({ p: this.amount.amount, q: this.amount.q })

    const otherRational = isRationalNumber(otherMoney.amount)
      ? otherMoney.amount
      : new RationalNumber({
          p: otherMoney.amount.amount,
          q: otherMoney.amount.q,
        })

    const result = thisRational.add(otherRational)
    return new Money(this.currency, result)
  }

  /**
   * Subtract money or an asset amount from this Money instance
   *
   * @param other - The Money, AssetAmount, or string representation to subtract
   * @returns A new Money instance with the difference
   * @throws Error if the assets are not the same type
   */
  subtract(other: Money | AssetAmount | string): Money {
    let otherMoney: Money
    if (typeof other === "string") {
      otherMoney = Money.parseStringToMoney(other, this.currency)
    } else if (other instanceof Money) {
      otherMoney = other
    } else {
      otherMoney = new Money(other)
    }

    if (!assetsEqual(this.currency, otherMoney.currency)) {
      throw new Error("Cannot subtract Money with different asset types")
    }

    // If both are FixedPointNumber, use fast path
    if (
      isFixedPointNumber(this.amount) &&
      isFixedPointNumber(otherMoney.amount)
    ) {
      const result = this.amount.subtract(otherMoney.amount)
      return new Money(this.currency, result)
    }

    // If either is RationalNumber, convert both to RationalNumber and subtract
    const thisRational = isRationalNumber(this.amount)
      ? this.amount
      : new RationalNumber({ p: this.amount.amount, q: this.amount.q })

    const otherRational = isRationalNumber(otherMoney.amount)
      ? otherMoney.amount
      : new RationalNumber({
          p: otherMoney.amount.amount,
          q: otherMoney.amount.q,
        })

    const result = thisRational.subtract(otherRational)
    return new Money(this.currency, result)
  }

  /**
   * Concretize this Money instance to the asset's decimal precision
   *
   * @returns A tuple of [concrete, change] Money instances
   * @throws Error if the asset is not a FungibleAsset
   */
  concretize(): [Money, Money] {
    // Check if the asset has a decimals property (is a FungibleAsset)
    if (!("decimals" in this.balance.asset)) {
      throw new Error("Cannot concretize Money with non-fungible asset")
    }

    const assetDecimals = this.balance.asset.decimals
    const currentDecimals = this.balance.amount.decimals

    // If already at the correct precision, return original and zero change
    if (currentDecimals === assetDecimals) {
      const zeroChange = new Money({
        asset: this.balance.asset,
        amount: {
          amount: 0n,
          decimals: assetDecimals,
        },
      })
      return [this, zeroChange]
    }

    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )

    // Normalize to asset decimals (this will round down if we're going to fewer decimals)
    const concreteFixedPoint = thisFixedPoint.normalize(
      {
        amount: 0n,
        decimals: assetDecimals,
      },
      true,
    )

    // Create the concrete Money instance
    const concrete = new Money({
      asset: this.balance.asset,
      amount: {
        amount: concreteFixedPoint.amount,
        decimals: assetDecimals,
      },
    })

    // Calculate the change by subtracting concrete from original
    const change = this.subtract(concrete)

    return [concrete, change]
  }

  /**
   * Multiply this Money instance by a scalar or fixed-point number
   *
   * @param other - The value to multiply by (bigint or FixedPoint)
   * @returns A new Money instance with the product
   */
  multiply(other: bigint | FixedPoint): Money {
    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )
    const result = thisFixedPoint.multiply(other)

    return new Money({
      asset: this.balance.asset,
      amount: {
        amount: result.amount,
        decimals: result.decimals,
      },
    })
  }

  /**
   * Check if this Money instance represents zero value
   *
   * @returns true if the amount is zero, false otherwise
   */
  isZero(): boolean {
    return isMoneyAmountZero(this.amount)
  }

  /**
   * Check if this Money instance is less than another Money or AssetAmount
   *
   * @param other - The Money, AssetAmount, or string representation to compare with
   * @returns true if this money is less than other, false otherwise
   * @throws Error if the assets are not the same type
   */
  lessThan(other: Money | AssetAmount | string): boolean {
    let otherMoney: Money
    if (typeof other === "string") {
      otherMoney = Money.parseStringToMoney(other, this.currency)
    } else if (other instanceof Money) {
      otherMoney = other
    } else {
      otherMoney = new Money(other)
    }
    const otherAmount = otherMoney.balance

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new Error("Cannot compare Money with different asset types")
    }

    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )
    const otherFixedPoint = new FixedPointNumber(
      otherAmount.amount.amount,
      otherAmount.amount.decimals,
    )

    return thisFixedPoint.lessThan(otherFixedPoint)
  }

  /**
   * Check if this Money instance is less than or equal to another Money or AssetAmount
   *
   * @param other - The Money, AssetAmount, or string representation to compare with
   * @returns true if this money is less than or equal to other, false otherwise
   * @throws Error if the assets are not the same type
   */
  lessThanOrEqual(other: Money | AssetAmount | string): boolean {
    let otherMoney: Money
    if (typeof other === "string") {
      otherMoney = Money.parseStringToMoney(other, this.currency)
    } else if (other instanceof Money) {
      otherMoney = other
    } else {
      otherMoney = new Money(other)
    }
    const otherAmount = otherMoney.balance

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new Error("Cannot compare Money with different asset types")
    }

    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )
    const otherFixedPoint = new FixedPointNumber(
      otherAmount.amount.amount,
      otherAmount.amount.decimals,
    )

    return thisFixedPoint.lessThanOrEqual(otherFixedPoint)
  }

  /**
   * Check if this Money instance is greater than another Money or AssetAmount
   *
   * @param other - The Money, AssetAmount, or string representation to compare with
   * @returns true if this money is greater than other, false otherwise
   * @throws Error if the assets are not the same type
   */
  greaterThan(other: Money | AssetAmount | string): boolean {
    let otherMoney: Money
    if (typeof other === "string") {
      otherMoney = Money.parseStringToMoney(other, this.currency)
    } else if (other instanceof Money) {
      otherMoney = other
    } else {
      otherMoney = new Money(other)
    }
    const otherAmount = otherMoney.balance

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new Error("Cannot compare Money with different asset types")
    }

    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )
    const otherFixedPoint = new FixedPointNumber(
      otherAmount.amount.amount,
      otherAmount.amount.decimals,
    )

    return thisFixedPoint.greaterThan(otherFixedPoint)
  }

  /**
   * Check if this Money instance is greater than or equal to another Money or AssetAmount
   *
   * @param other - The Money, AssetAmount, or string representation to compare with
   * @returns true if this money is greater than or equal to other, false otherwise
   * @throws Error if the assets are not the same type
   */
  greaterThanOrEqual(other: Money | AssetAmount | string): boolean {
    let otherMoney: Money
    if (typeof other === "string") {
      otherMoney = Money.parseStringToMoney(other, this.currency)
    } else if (other instanceof Money) {
      otherMoney = other
    } else {
      otherMoney = new Money(other)
    }
    const otherAmount = otherMoney.balance

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new Error("Cannot compare Money with different asset types")
    }

    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )
    const otherFixedPoint = new FixedPointNumber(
      otherAmount.amount.amount,
      otherAmount.amount.decimals,
    )

    return thisFixedPoint.greaterThanOrEqual(otherFixedPoint)
  }

  /**
   * Check if this Money instance is positive (greater than zero)
   *
   * @returns true if the amount is positive, false otherwise
   */
  isPositive(): boolean {
    return isMoneyAmountPositive(this.amount)
  }

  /**
   * Check if this Money instance is negative (less than zero)
   *
   * @returns true if the amount is negative, false otherwise
   */
  isNegative(): boolean {
    return isMoneyAmountNegative(this.amount)
  }

  /**
   * Get the absolute value of this Money instance
   *
   * @returns A new Money instance with the absolute value
   */
  absolute(): Money {
    if (!this.isNegative()) {
      return this
    }

    // If both amount types support multiplication by -1, use that approach
    if (isFixedPointNumber(this.amount)) {
      const result = this.amount.multiply(-1n)
      return new Money(this.currency, result)
    }

    // For RationalNumber, negate by flipping the sign of p
    const rational = this.amount as RationalNumber
    const result = new RationalNumber({ p: -rational.p, q: rational.q })
    return new Money(this.currency, result)
  }

  /**
   * Get the negation of this Money instance (flip the sign)
   *
   * @returns A new Money instance with the opposite sign
   */
  negate(): Money {
    // If both amount types support multiplication by -1, use that approach
    if (isFixedPointNumber(this.amount)) {
      const result = this.amount.multiply(-1n)
      return new Money(this.currency, result)
    }

    // For RationalNumber, negate by flipping the sign of p
    const rational = this.amount as RationalNumber
    const result = new RationalNumber({ p: -rational.p, q: rational.q })
    return new Money(this.currency, result)
  }

  /**
   * Allocate this Money instance proportionally based on ratios
   *
   * Distributes the money according to the provided ratios, handling remainders
   * using the largest remainder method to ensure exact totals are preserved.
   *
   * When distributeFractionalUnits is false, fractional units beyond the currency's
   * canonical precision are separated out as "change" that can be handled separately.
   * This is useful for removing long decimal tails from RationalNumber amounts or
   * routing sub-unit remainders to separate ledgers.
   *
   * @param ratios - Array of positive integers representing allocation ratios
   * @param options - Allocation options
   * @param options.distributeFractionalUnits - When true (default), fractional units
   *   are distributed among recipients. When false, fractional units beyond the
   *   currency's canonical precision are returned as a separate "change" amount.
   * @returns Array of Money instances proportional to the ratios. When distributeFractionalUnits
   *   is false, includes an additional element containing fractional unit change.
   * @throws Error if ratios are empty, contain non-positive values, or all ratios are zero
   *
   * @example
   * // Standard allocation (distributeFractionalUnits: true)
   * const money = Money("$100")
   * const [first, second, third] = money.allocate([1, 2, 1]) // [$25, $50, $25]
   *
   * // Separate fractional units (distributeFractionalUnits: false)
   * const precise = Money("$100.00015")
   * const parts = precise.allocate([1, 1, 1], { distributeFractionalUnits: false })
   * // Returns: [$33.33, $33.33, $33.34, $0.00015] - change separated
   */
  allocate(
    ratios: number[],
    options: { distributeFractionalUnits?: boolean } = {},
  ): Money[] {
    if (ratios.length === 0) {
      throw new Error("Cannot allocate with empty ratios array")
    }

    // Validate ratios are non-negative
    ratios.forEach((ratio) => {
      if (ratio < 0) {
        throw new Error("Cannot allocate with negative ratios")
      }
    })

    const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0)
    if (totalRatio === 0) {
      throw new Error("Cannot allocate with all zero ratios")
    }

    const { distributeFractionalUnits = true } = options

    // Convert to FixedPointNumber for calculations
    const fixedPointAmount = isFixedPointNumber(this.amount)
      ? this.amount
      : toFixedPointNumber(this.amount)

    let workingAmount = fixedPointAmount
    let fractionalChange: Money | null = null

    // Handle fractional units separation if requested
    if (!distributeFractionalUnits && "decimals" in this.currency) {
      const currencyDecimals = this.currency.decimals
      const currentDecimals = fixedPointAmount.decimals

      if (currentDecimals > currencyDecimals) {
        // Separate fractional units beyond currency precision
        const [concrete, change] = this.concretize()
        workingAmount = isFixedPointNumber(concrete.amount)
          ? concrete.amount
          : toFixedPointNumber(concrete.amount)
        fractionalChange = change
      }
    }

    const totalAmount = workingAmount.amount
    const { decimals } = workingAmount

    // Calculate base allocations (rounded down)
    const allocations: bigint[] = []
    const remainders: number[] = []

    for (let i = 0; i < ratios.length; i += 1) {
      const ratio = ratios[i]
      // Calculate exact allocation as totalAmount * ratio / totalRatio
      const exactAllocation = (totalAmount * BigInt(ratio)) / BigInt(totalRatio)
      const remainder =
        Number((totalAmount * BigInt(ratio)) % BigInt(totalRatio)) / totalRatio

      allocations.push(exactAllocation)
      remainders.push(remainder)
    }

    // Calculate how much we've allocated so far
    const allocatedTotal = allocations.reduce((sum, amount) => sum + amount, 0n)
    const unallocatedAmount = totalAmount - allocatedTotal

    // Distribute the unallocated amount using largest remainder method
    if (unallocatedAmount > 0n) {
      // Create array of indices sorted by remainder (largest first)
      const indicesByRemainder = remainders
        .map((remainder, index) => ({ remainder, index }))
        .sort((a, b) => b.remainder - a.remainder)
        .map((item) => item.index)

      // Distribute one unit to each of the top remainder holders
      let remaining = unallocatedAmount
      indicesByRemainder.forEach((index) => {
        if (remaining <= 0n) return
        allocations[index] += 1n
        remaining -= 1n
      })
    }

    // Create Money instances from allocations
    const result = allocations.map(
      (amount) =>
        new Money(this.currency, new FixedPointNumber(amount, decimals)),
    )

    // Add fractional change as final element if we separated it
    if (fractionalChange && !fractionalChange.isZero()) {
      result.push(fractionalChange)
    }

    return result
  }

  /**
   * Distribute this Money instance evenly across N parts
   *
   * Splits the money into the specified number of equal parts, handling remainders
   * using the largest remainder method to ensure exact totals are preserved.
   *
   * When distributeFractionalUnits is false, fractional units beyond the currency's
   * canonical precision are separated as "change" that can be handled separately.
   * This is useful for cleanly separating sub-unit precision from main allocations.
   *
   * @param parts - Number of parts to split into (must be positive)
   * @param options - Distribution options
   * @param options.distributeFractionalUnits - When true (default), fractional units
   *   are distributed among recipients. When false, fractional units beyond the
   *   currency's canonical precision are returned as a separate "change" amount.
   * @returns Array of Money instances split as evenly as possible. When distributeFractionalUnits
   *   is false, includes an additional element containing fractional unit change.
   * @throws Error if parts is not a positive integer
   *
   * @example
   * // Standard distribution (distributeFractionalUnits: true)
   * const money = Money("$100")
   * const [a, b, c] = money.distribute(3) // [$33.34, $33.33, $33.33]
   *
   * // Separate fractional units (distributeFractionalUnits: false)
   * const precise = Money("$100.00015")
   * const parts = precise.distribute(3, { distributeFractionalUnits: false })
   * // Returns: [$33.33, $33.33, $33.34, $0.00015] - change separated
   */
  distribute(
    parts: number,
    options: { distributeFractionalUnits?: boolean } = {},
  ): Money[] {
    if (!Number.isInteger(parts) || parts <= 0) {
      throw new Error("Parts must be a positive integer")
    }

    // Use allocate with equal ratios
    const equalRatios = Array(parts).fill(1)
    return this.allocate(equalRatios, options)
  }

  /**
   * Return the maximum of this Money and other(s)
   *
   * @param other - The other Money instance(s) or string(s) to compare with
   * @returns The Money instance with the largest value
   * @throws Error if any assets are not the same type
   */
  max(other: Money | Money[] | string | string[]): Money {
    const otherArray = Array.isArray(other) ? other : [other]
    const others = otherArray.map((item) =>
      typeof item === "string"
        ? Money.parseStringToMoney(item, this.currency)
        : item,
    )
    const currentBalance = this.balance

    return others.reduce((maxValue: Money, money) => {
      if (!assetsEqual(currentBalance.asset, money.balance.asset)) {
        throw new Error("Cannot compare Money with different asset types")
      }

      return maxValue.lessThan(money) ? money : maxValue
    }, this)
  }

  /**
   * Return the minimum of this Money and other(s)
   *
   * @param other - The other Money instance(s) or string(s) to compare with
   * @returns The Money instance with the smallest value
   * @throws Error if any assets are not the same type
   */
  min(other: Money | Money[] | string | string[]): Money {
    const otherArray = Array.isArray(other) ? other : [other]
    const others = otherArray.map((item) =>
      typeof item === "string"
        ? Money.parseStringToMoney(item, this.currency)
        : item,
    )
    const currentBalance = this.balance

    return others.reduce((minValue: Money, money) => {
      if (!assetsEqual(currentBalance.asset, money.balance.asset)) {
        throw new Error("Cannot compare Money with different asset types")
      }

      return minValue.greaterThan(money) ? money : minValue
    }, this)
  }

  /**
   * Check if this Money instance has any fractional amount (change)
   *
   * @returns true if there are any non-zero digits to the right of the decimal point, false otherwise
   */
  hasChange(): boolean {
    // Return false if the asset doesn't have a decimals property
    if (!("decimals" in this.balance.asset)) {
      return false
    }

    const currentDecimals = this.balance.amount.decimals

    // If no decimal places, there can't be any fractional amount
    if (currentDecimals === 0n) {
      return false
    }

    // Check if there are any non-zero digits in the fractional part
    const divisor = 10n ** currentDecimals
    const remainder = this.balance.amount.amount % divisor

    return remainder !== 0n
  }

  /**
   * Check if this Money instance has sub-units beyond the commonly
   * transferable fractional unit (eg $1.001 for USD, including a
   * fraction of a cent)
   *
   * @returns true if there are fractional amounts beyond the asset's decimal precision, false otherwise
   */
  hasSubUnits(): boolean {
    // Return false if the asset doesn't have a decimals property
    if (!("decimals" in this.balance.asset)) {
      return false
    }

    const assetDecimals = this.balance.asset.decimals
    const currentDecimals = this.balance.amount.decimals

    // If current precision is same or less than asset precision, no sub-units
    if (currentDecimals <= assetDecimals) {
      return false
    }

    // Check if there are any non-zero digits beyond the asset's decimal precision
    const extraDecimals = currentDecimals - assetDecimals
    const divisor = 10n ** extraDecimals
    const remainder = this.balance.amount.amount % divisor

    return remainder !== 0n
  }

  /**
   * Serialize this Money instance to JSON
   *
   * @returns A validated JSON-serializable object with currency and amount
   */
  toJSON(): MoneyJSON {
    // Helper function to serialize any value, converting bigints to strings
    const serializeValue = (value: unknown): unknown => {
      if (typeof value === "bigint") {
        return value.toString()
      }
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          return value.map(serializeValue)
        }
        const result: Record<string, unknown> = {}
        Object.entries(value).forEach(([key, val]) => {
          result[key] = serializeValue(val)
        })
        return result
      }
      return value
    }

    // Serialize amount directly based on type - structure determines type
    const amountData = isFixedPointNumber(this.amount)
      ? this.amount.toJSON() // {amount: string, decimals: string}
      : this.amount.toJSON() // {p: string, q: string}

    const result = {
      currency: serializeValue(this.currency),
      amount: amountData,
    }

    // Validate the output using Zod schema for type safety
    return MoneyJSONSchema.parse(result)
  }

  /**
   * Check if this Money instance is equal to another Money instance
   *
   * @param other - The other Money instance or string representation to compare with
   * @returns true if both Money instances have the same asset and amount, false otherwise
   */
  equals(other: Money | string): boolean {
    const otherMoney =
      typeof other === "string"
        ? Money.parseStringToMoney(other, this.currency)
        : other

    // Check if currencies are equal
    if (!assetsEqual(this.currency, otherMoney.currency)) {
      return false
    }

    // If both are the same type, use direct comparison
    if (
      isFixedPointNumber(this.amount) &&
      isFixedPointNumber(otherMoney.amount)
    ) {
      return this.amount.equals(otherMoney.amount)
    }

    if (isRationalNumber(this.amount) && isRationalNumber(otherMoney.amount)) {
      return (
        this.amount.p === otherMoney.amount.p &&
        this.amount.q === otherMoney.amount.q
      )
    }

    // Mixed types - convert both to comparable decimal strings
    const thisDecimal = isFixedPointNumber(this.amount)
      ? this.amount.toString()
      : this.amount.toDecimalString(50n)
    const otherDecimal = isFixedPointNumber(otherMoney.amount)
      ? otherMoney.amount.toString()
      : otherMoney.amount.toDecimalString(50n)

    return thisDecimal === otherDecimal
  }

  /**
   * Create a Money instance from JSON data
   *
   * @param json - The JSON data to deserialize
   * @returns A new Money instance
   * @throws ZodError if the JSON data is invalid
   */
  static fromJSON(json: unknown): Money {
    // First validate that json is an object
    if (typeof json !== "object" || json === null) {
      throw new Error("Invalid JSON input: expected object")
    }

    // Check if this is the old format (has 'asset' instead of 'currency')
    if ("asset" in json && !("currency" in json)) {
      // Old format compatibility
      const deserializeAsset = (asset: unknown): unknown => {
        const result: Record<string, unknown> = {
          ...(asset as Record<string, unknown>),
        }
        if ("decimals" in result && typeof result.decimals === "string") {
          result.decimals = BigInt(result.decimals)
        }
        return result
      }

      const jsonObj = json as { asset: unknown; amount: unknown }
      const asset = deserializeAsset(jsonObj.asset)
      const amount = FixedPointNumber.fromJSON(jsonObj.amount)

      return new Money({
        asset: asset as Currency,
        amount: {
          amount: amount.amount,
          decimals: amount.decimals,
        },
      })
    }

    // New format - validate with Zod schema
    const parsed = MoneyJSONSchema.parse(json)

    // Helper function to deserialize currency, converting string bigints back to bigints
    const deserializeCurrency = (currency: unknown): Currency => {
      const result: Record<string, unknown> = {
        ...(currency as Record<string, unknown>),
      }

      // Convert decimals back to bigint if present (FungibleAsset/Currency)
      if ("decimals" in result && typeof result.decimals === "string") {
        result.decimals = BigInt(result.decimals)
      }

      return result as Currency
    }

    const currency = deserializeCurrency(parsed.currency)

    // Deserialize amount based on structure - infer type from fields
    let amount: MoneyAmount
    if (typeof parsed.amount === "string") {
      amount = FixedPointNumber.fromJSON(parsed.amount) // string -> FixedPointNumber
    } else if ("p" in parsed.amount && "q" in parsed.amount) {
      amount = RationalNumber.fromJSON(parsed.amount) // {p, q} -> RationalNumber
    } else {
      amount = FixedPointNumber.fromJSON(parsed.amount) // legacy {amount, decimals} -> FixedPointNumber
    }

    return new Money(currency, amount)
  }

  /**
   * Convert this Money instance to a localized string representation
   *
   * @param options - Formatting options for the string representation
   * @returns A formatted string representation
   */
  toString(options: MoneyToStringOptions = {}): string {
    const {
      locale = "en-US",
      compact = false,
      maxDecimals,
      minDecimals,
      preferredUnit,
      preferSymbol = false,
      roundingMode,
    } = options

    // Convert RationalNumber to FixedPointNumber for formatting
    const formattingMoney = isRationalNumber(this.amount)
      ? new Money(this.currency, toFixedPointNumber(this.amount))
      : this

    // Determine if we should use ISO 4217 formatting
    const useIsoFormatting = shouldUseIsoFormatting(formattingMoney.currency)

    if (useIsoFormatting) {
      return formatWithIntlCurrency(
        formattingMoney,
        locale,
        compact,
        maxDecimals,
        minDecimals,
        roundingMode,
      )
    }
    return formatWithCustomFormatting(
      formattingMoney,
      locale,
      compact,
      maxDecimals,
      minDecimals,
      preferredUnit,
      preferSymbol,
      roundingMode,
    )
  }

  /**
   * Convert this Money instance to another currency using a price or exchange rate
   *
   * Uses lossless conversion when possible (when price denominators only contain factors of 2 and 5).
   * Falls back to precision-preserving RationalNumber arithmetic when exact division isn't possible.
   *
   * @param price - Price or ExchangeRate to use for conversion
   * @param options - Conversion options (reserved for future use)
   * @returns A new Money instance in the target currency
   * @throws Error if conversion is not possible or currencies don't match
   *
   * @example
   * const usd = Money("$100")
   * const btcPrice = new Price(Money("$50,000"), Money("1 BTC"))
   * const btc = usd.convert(btcPrice) // Returns Money with BTC amount
   */
  convert(
    price: import("../prices").Price | import("../exchange-rates").ExchangeRate,
  ): Money {
    // Get the price amounts - both Price and ExchangeRate have amounts array
    const [amount1, amount2] = price.amounts

    // Convert AssetAmount to Money for easier handling
    const money1 = new Money(amount1)
    const money2 = new Money(amount2)

    // Determine conversion direction
    let fromMoney: Money
    let toMoney: Money
    if (assetsEqual(this.currency, money1.currency)) {
      fromMoney = money1
      toMoney = money2
    } else if (assetsEqual(this.currency, money2.currency)) {
      fromMoney = money2
      toMoney = money1
    } else {
      throw new Error(
        `Cannot convert ${this.currency.code || this.currency.name} using price with currencies ${money1.currency.code || money1.currency.name} and ${money2.currency.code || money2.currency.name}`,
      )
    }

    // TODO: Implement lossless division when FixedPointNumber.divide() is fixed
    // For now, always use RationalNumber arithmetic for precision

    // Precision-preserving path: use RationalNumber arithmetic
    const thisRational = isRationalNumber(this.amount)
      ? this.amount
      : new RationalNumber({
          p: this.amount.amount,
          q: 10n ** this.amount.decimals,
        })

    const toRational = isRationalNumber(toMoney.amount)
      ? toMoney.amount
      : new RationalNumber({
          p: toMoney.amount.amount,
          q: 10n ** toMoney.amount.decimals,
        })

    const fromRational = isRationalNumber(fromMoney.amount)
      ? fromMoney.amount
      : new RationalNumber({
          p: fromMoney.amount.amount,
          q: 10n ** fromMoney.amount.decimals,
        })

    // Calculate: thisRational * (toRational / fromRational)
    // Which is: thisRational * toRational * (1 / fromRational)
    // Which is: thisRational * toRational * (q / p) of fromRational
    const rate = new RationalNumber({
      p: toRational.p * fromRational.q,
      q: toRational.q * fromRational.p,
    })
    const result = thisRational.multiply(rate)

    return new Money(toMoney.currency, result)
  }
}

/**
 * Factory function for creating Money instances from string representations
 * Also supports original constructor pattern with AssetAmount
 *
 * Supports multiple formats:
 * - Currency symbols: "$100", "€1,234.56", "£50.25"
 * - Currency codes: "USD 100", "100 EUR", "JPY 1,000"
 * - Crypto main units: "₿1.5", "BTC 0.001", "ETH 2.5"
 * - Crypto sub-units: "1000 sat", "100000 wei", "50 gwei"
 * - Number formats: US (1,234.56) and EU (1.234,56)
 *
 * Symbol disambiguation uses trading volume priority:
 * $ → USD, £ → GBP, ¥ → JPY, € → EUR, etc.
 * Use currency codes for non-primary currencies.
 *
 * @param input - String representation of money amount or AssetAmount
 * @returns Money instance
 * @throws Error for invalid format or unknown currency
 *
 * @example
 * Money("$100.50")        // USD $100.50
 * Money("€1.234,56")      // EUR €1,234.56 (EU format)
 * Money("JPY 1,000")      // JPY ¥1,000 (no decimals)
 * Money("1000 sat")       // BTC 0.00001000 (satoshis)
 * Money("100 gwei")       // ETH 0.0000001 (gwei)
 */
export function MoneyFactory(input: string): Money
export function MoneyFactory(balance: AssetAmount): Money
export function MoneyFactory(json: unknown): Money
export function MoneyFactory(
  inputOrBalanceOrJson: string | AssetAmount | unknown,
): Money {
  if (typeof inputOrBalanceOrJson === "string") {
    // String parsing mode
    const parseResult = parseMoneyString(inputOrBalanceOrJson)

    return new Money({
      asset: parseResult.currency,
      amount: {
        amount: parseResult.amount.amount,
        decimals: parseResult.amount.decimals,
      },
    })
  }

  if (isAssetAmount(inputOrBalanceOrJson)) {
    return new Money(inputOrBalanceOrJson)
  }

  // JSON deserialization mode
  return Money.fromJSON(inputOrBalanceOrJson)
}
