import { z } from "zod"
import { AssetAmount, FixedPoint, RoundingMode } from "../types"
import { FixedPointNumber, FixedPointJSONSchema } from "../fixed-point"
import { assetsEqual } from "../assets"
import { DecimalStringSchema } from "../decimal-strings"
import { NonNegativeBigIntStringSchema } from "../validation-schemas"
import { parseMoneyString } from "./parsing"

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
      z.record(z.number(), z.union([z.string(), z.array(z.string())])),
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

// Schema for the complete Money JSON structure
export const MoneyJSONSchema = z.object({
  asset: AnyAssetJSONSchema,
  amount: FixedPointJSONSchema,
})

export class Money {
  readonly balance: AssetAmount

  /**
   * Create a new Money instance
   *
   * @param balance - The asset amount balance
   */
  constructor(balance: AssetAmount) {
    this.balance = balance
  }

  /**
   * Get the asset for this Money instance (convenience getter)
   */
  get asset() {
    return this.balance.asset
  }

  /**
   * Add money or an asset amount to this Money instance
   *
   * @param other - The Money or AssetAmount to add
   * @returns A new Money instance with the sum
   * @throws Error if the assets are not the same type
   */
  add(other: Money | AssetAmount): Money {
    const otherAmount = other instanceof Money ? other.balance : other

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new Error("Cannot add Money with different asset types")
    }

    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )
    const otherFixedPoint = new FixedPointNumber(
      otherAmount.amount.amount,
      otherAmount.amount.decimals,
    )
    const result = thisFixedPoint.add(otherFixedPoint)

    return new Money({
      asset: this.balance.asset,
      amount: {
        amount: result.amount,
        decimals: result.decimals,
      },
    })
  }

  /**
   * Subtract money or an asset amount from this Money instance
   *
   * @param other - The Money or AssetAmount to subtract
   * @returns A new Money instance with the difference
   * @throws Error if the assets are not the same type
   */
  subtract(other: Money | AssetAmount): Money {
    const otherAmount = other instanceof Money ? other.balance : other

    if (!assetsEqual(this.balance.asset, otherAmount.asset)) {
      throw new Error("Cannot subtract Money with different asset types")
    }

    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )
    const otherFixedPoint = new FixedPointNumber(
      otherAmount.amount.amount,
      otherAmount.amount.decimals,
    )
    const result = thisFixedPoint.subtract(otherFixedPoint)

    return new Money({
      asset: this.balance.asset,
      amount: {
        amount: result.amount,
        decimals: result.decimals,
      },
    })
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
    return this.balance.amount.amount === 0n
  }

  /**
   * Check if this Money instance is less than another Money or AssetAmount
   *
   * @param other - The Money or AssetAmount to compare with
   * @returns true if this money is less than other, false otherwise
   * @throws Error if the assets are not the same type
   */
  lessThan(other: Money | AssetAmount): boolean {
    const otherAmount = other instanceof Money ? other.balance : other

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
   * @param other - The Money or AssetAmount to compare with
   * @returns true if this money is less than or equal to other, false otherwise
   * @throws Error if the assets are not the same type
   */
  lessThanOrEqual(other: Money | AssetAmount): boolean {
    const otherAmount = other instanceof Money ? other.balance : other

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
   * @param other - The Money or AssetAmount to compare with
   * @returns true if this money is greater than other, false otherwise
   * @throws Error if the assets are not the same type
   */
  greaterThan(other: Money | AssetAmount): boolean {
    const otherAmount = other instanceof Money ? other.balance : other

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
   * @param other - The Money or AssetAmount to compare with
   * @returns true if this money is greater than or equal to other, false otherwise
   * @throws Error if the assets are not the same type
   */
  greaterThanOrEqual(other: Money | AssetAmount): boolean {
    const otherAmount = other instanceof Money ? other.balance : other

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
    return this.balance.amount.amount > 0n
  }

  /**
   * Check if this Money instance is negative (less than zero)
   *
   * @returns true if the amount is negative, false otherwise
   */
  isNegative(): boolean {
    return this.balance.amount.amount < 0n
  }

  /**
   * Return the maximum of this Money and other(s)
   *
   * @param other - The other Money instance(s) to compare with
   * @returns The Money instance with the largest value
   * @throws Error if any assets are not the same type
   */
  max(other: Money | Money[]): Money {
    const others = Array.isArray(other) ? other : [other]
    let maxValue: Money = this

    for (const money of others) {
      if (!assetsEqual(this.balance.asset, money.balance.asset)) {
        throw new Error("Cannot compare Money with different asset types")
      }

      if (maxValue.lessThan(money)) {
        maxValue = money
      }
    }

    return maxValue
  }

  /**
   * Return the minimum of this Money and other(s)
   *
   * @param other - The other Money instance(s) to compare with
   * @returns The Money instance with the smallest value
   * @throws Error if any assets are not the same type
   */
  min(other: Money | Money[]): Money {
    const others = Array.isArray(other) ? other : [other]
    let minValue: Money = this

    for (const money of others) {
      if (!assetsEqual(this.balance.asset, money.balance.asset)) {
        throw new Error("Cannot compare Money with different asset types")
      }

      if (minValue.greaterThan(money)) {
        minValue = money
      }
    }

    return minValue
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
   * @returns A JSON-serializable object representing the AssetAmount
   */
  toJSON(): any {
    // Helper function to serialize any value, converting bigints to strings
    const serializeValue = (value: any): any => {
      if (typeof value === "bigint") {
        return value.toString()
      }
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          return value.map(serializeValue)
        }
        const result: any = {}
        for (const [key, val] of Object.entries(value)) {
          result[key] = serializeValue(val)
        }
        return result
      }
      return value
    }

    return {
      asset: serializeValue(this.balance.asset),
      amount: new FixedPointNumber(
        this.balance.amount.amount,
        this.balance.amount.decimals,
      ).toJSON(),
    }
  }

  /**
   * Check if this Money instance is equal to another Money instance
   *
   * @param other - The other Money instance to compare with
   * @returns true if both Money instances have the same asset and amount, false otherwise
   */
  equals(other: Money): boolean {
    // Check if assets are equal
    if (!assetsEqual(this.balance.asset, other.balance.asset)) {
      return false
    }

    // Check if amounts are equal
    const thisFixedPoint = new FixedPointNumber(
      this.balance.amount.amount,
      this.balance.amount.decimals,
    )
    const otherFixedPoint = new FixedPointNumber(
      other.balance.amount.amount,
      other.balance.amount.decimals,
    )

    return thisFixedPoint.equals(otherFixedPoint)
  }

  /**
   * Create a Money instance from JSON data
   *
   * @param json - The JSON data to deserialize
   * @returns A new Money instance
   * @throws Error if the JSON data is invalid
   */
  static fromJSON(json: any): Money {
    const parsed = MoneyJSONSchema.parse(json)

    // Helper function to deserialize asset, converting string bigints back to bigints
    const deserializeAsset = (asset: any): any => {
      const result: any = { ...asset }

      // Convert decimals back to bigint if present (FungibleAsset/Currency)
      if ("decimals" in result) {
        result.decimals = BigInt(result.decimals)
      }

      return result
    }

    const asset = deserializeAsset(parsed.asset)
    const amount = FixedPointNumber.fromJSON(parsed.amount)

    return new Money({
      asset,
      amount: {
        amount: amount.amount,
        decimals: amount.decimals,
      },
    })
  }

  /**
   * Convert this Money instance to a localized string representation
   *
   * @param options - Formatting options for the string representation
   * @returns A formatted string representation
   */
  toString(options: MoneyToStringOptions = {}): string {
    return formatMoney(this, options)
  }
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
  /** Preferred fractional unit for non-ISO currencies */
  preferredUnit?: string
  /** Prefer symbol formatting over code for non-ISO currencies */
  preferSymbol?: boolean
  /** Rounding mode for number formatting */
  roundingMode?: RoundingMode
}

/**
 * Format a Money instance to a localized string
 *
 * @param money - The Money instance to format
 * @param options - Formatting options
 * @returns A formatted string representation
 */
function formatMoney(
  money: Money,
  options: MoneyToStringOptions = {},
): string {
  const {
    locale = "en-US",
    compact = false,
    maxDecimals,
    preferredUnit,
    preferSymbol = false,
    roundingMode,
  } = options

  // Determine if we should use ISO 4217 formatting
  const useIsoFormatting = shouldUseIsoFormatting(money.balance.asset)

  if (useIsoFormatting) {
    return formatWithIntlCurrency(money, locale, compact, maxDecimals, roundingMode)
  }
  return formatWithCustomFormatting(
    money,
    locale,
    compact,
    maxDecimals,
    preferredUnit,
    preferSymbol,
    roundingMode,
  )
}

/**
 * Determine if an asset supports ISO 4217 formatting
 *
 * @param asset - The asset to check
 * @returns true if ISO 4217 formatting should be used
 */
export function shouldUseIsoFormatting(asset: any): boolean {
  return "iso4217Support" in asset && asset.iso4217Support === true
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
  roundingMode?: RoundingMode,
): string {
  const fp = new FixedPointNumber(
    money.balance.amount.amount,
    money.balance.amount.decimals,
  )
  const decimalString = fixedPointToDecimalString(fp)

  // Get currency code for ISO formatting
  const currencyCode =
    "code" in money.balance.asset ? money.balance.asset.code : "XXX"

  // Determine decimal places
  const assetDecimals =
    "decimals" in money.balance.asset 
      ? safeNumberFromBigInt(money.balance.asset.decimals, "Asset decimal places")
      : 2
  const finalMaxDecimals =
    maxDecimals !== undefined
      ? Math.min(safeNumberFromBigInt(typeof maxDecimals === 'bigint' ? maxDecimals : BigInt(maxDecimals), "Max decimal places"), 20)
      : assetDecimals
  const finalMinDecimals = compact
    ? 0
    : Math.min(assetDecimals, finalMaxDecimals)

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

  const formatter = new Intl.NumberFormat(normalizeLocale(locale), formatterOptions)

  // Use decimal string directly to avoid precision loss
  return formatter.format(decimalString as string)
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
    "decimals" in money.balance.asset 
      ? safeNumberFromBigInt(money.balance.asset.decimals, "Asset decimal places")
      : 2
  const finalMaxDecimals =
    maxDecimals !== undefined 
      ? safeNumberFromBigInt(typeof maxDecimals === 'bigint' ? maxDecimals : BigInt(maxDecimals), "Max decimal places")
      : assetDecimals

  // Format the number part using Intl.NumberFormat with string input
  const formatterOptions: NumberFormatOptionsWithRounding = {
    style: "decimal",
    notation: compact ? "compact" : "standard",
    compactDisplay: compact ? "short" : undefined,
    minimumFractionDigits: 0,
    maximumFractionDigits: finalMaxDecimals,
  }

  if (roundingMode) {
    formatterOptions.roundingMode = roundingMode
  }

  const formatter = new Intl.NumberFormat(normalizeLocale(locale), formatterOptions)

  // Use decimal string directly to avoid precision loss
  const formattedNumber = formatter.format(decimalString as string)

  // Handle symbol vs code formatting
  if (preferSymbol && "symbol" in money.balance.asset && !unitSuffix) {
    return `${money.balance.asset.symbol}${formattedNumber}`
  }

  // Add currency code or unit suffix
  const currencyPart = getCurrencyDisplayPart(
    money.balance.asset,
    preferSymbol,
    unitSuffix,
  )
  return `${formattedNumber}${currencyPart}`
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
  const fp = new FixedPointNumber(
    money.balance.amount.amount,
    money.balance.amount.decimals,
  )
  let decimalString = fixedPointToDecimalString(fp)
  let unitSuffix: string | undefined

  if (
    preferredUnit &&
    "fractionalUnit" in money.balance.asset &&
    money.balance.asset.fractionalUnit
  ) {
    const { fractionalUnit } = money.balance.asset
    const assetDecimals =
      "decimals" in money.balance.asset
        ? safeNumberFromBigInt(money.balance.asset.decimals, "Asset decimal places")
        : 0
    const unitInfo = findFractionalUnitInfo(
      fractionalUnit,
      preferredUnit,
      assetDecimals,
    )

    if (unitInfo) {
      // Convert to the fractional unit using BigInt arithmetic
      const multiplierDecimals = BigInt(unitInfo.decimals)
      const convertedFp = fp.multiply({ amount: 10n ** multiplierDecimals, decimals: 0n })
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
    for (const [decimalsStr, names] of Object.entries(fractionalUnit)) {
      const decimals = parseInt(decimalsStr, 10)
      const nameArray = Array.isArray(names) ? names : [names]

      if (nameArray.includes(unitName)) {
        return { decimals, name: nameArray[0] }
      }
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
  asset: any,
  preferSymbol: boolean,
  unitSuffix?: string,
): string {
  if (unitSuffix) {
    return ` ${unitSuffix}`
  }

  if (preferSymbol && "symbol" in asset) {
    return "" // Symbol would go at the beginning, handled separately
  }

  if ("code" in asset) {
    return ` ${asset.code}`
  }

  return ""
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
 * Pluralize fractional unit names
 *
 * @param unitName - The singular unit name
 * @returns The pluralized unit name
 */
export function pluralizeFractionalUnit(unitName: string): string {
  // Handle special cases for irregular plurals
  const irregularPlurals: Record<string, string> = {
    "penny": "pence",
    "kopek": "kopeks",
    "grosz": "groszy",
    "fils": "fils", // Already plural
    "sen": "sen", // Already plural
    "pul": "puls",
    "qəpik": "qəpiks",
    "tyiyn": "tyiyns",
    "möngö": "möngös"
  }

  if (irregularPlurals[unitName]) {
    return irregularPlurals[unitName]
  }

  // Handle regular pluralization rules
  if (unitName.endsWith("y")) {
    return unitName.slice(0, -1) + "ies"
  } else if (unitName.endsWith("z")) {
    return unitName + "zes"
  } else if (unitName.endsWith("s") || unitName.endsWith("sh") || unitName.endsWith("ch") || unitName.endsWith("x")) {
    return unitName + "es"
  } else {
    return unitName + "s"
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
export function MoneyFactory(inputOrBalance: string | AssetAmount): Money {
  if (typeof inputOrBalance === 'string') {
    // String parsing mode
    const parseResult = parseMoneyString(inputOrBalance)
    
    return new Money({
      asset: parseResult.currency,
      amount: {
        amount: parseResult.amount.amount,
        decimals: parseResult.amount.decimals
      }
    })
  } else {
    // Original constructor mode
    return new Money(inputOrBalance)
  }
}
