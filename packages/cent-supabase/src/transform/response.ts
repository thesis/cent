import {
  Money as MoneyFactory,
  type MoneyClass as Money,
} from "@thesis-co/cent"
import type { NormalizedTableConfig, NormalizedMoneyColumnConfig } from "../types"
import { getOriginalColumnName, isTempColumn, TEMP_COLUMN_PREFIX } from "./select"

/**
 * Transform response data by converting string amounts to Money instances.
 *
 * Handles two patterns:
 * 1. Temp columns from SELECT * (e.g., `__cent_price` → use value for `price`)
 * 2. Direct string values from explicit SELECT (e.g., `price: "100.50"`)
 *
 * @param data - Response data from Supabase (single row or array)
 * @param tableConfig - Normalized table configuration
 * @param tempColumns - List of temporary column names to process and remove
 * @returns Transformed data with Money instances
 */
export function transformResponseData<T>(
  data: T,
  tableConfig: NormalizedTableConfig,
  tempColumns: string[] = [],
): T {
  // Handle null/undefined
  if (data == null) {
    return data
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((row) =>
      transformRow(row as Record<string, unknown>, tableConfig, tempColumns),
    ) as T
  }

  // Handle single object
  if (typeof data === "object") {
    return transformRow(
      data as Record<string, unknown>,
      tableConfig,
      tempColumns,
    ) as T
  }

  return data
}

/**
 * Transform a single row of data
 */
export function transformRow(
  row: Record<string, unknown>,
  tableConfig: NormalizedTableConfig,
  tempColumns: string[] = [],
): Record<string, unknown> {
  const result = { ...row }
  const tempColumnSet = new Set(tempColumns)

  // Process each money column
  for (const columnName of tableConfig.moneyColumns) {
    const config = tableConfig.money[columnName]
    const tempColumnName = `${TEMP_COLUMN_PREFIX}${columnName}`

    // Check if we have a temp column (SELECT * pattern)
    if (tempColumnSet.has(tempColumnName) && tempColumnName in result) {
      const value = result[tempColumnName]
      if (typeof value === "string") {
        const currencyCode = getCurrencyCode(result, config)
        if (currencyCode) {
          result[columnName] = createMoneyFromValue(
            value,
            currencyCode,
            config.minorUnits,
          )
        }
      }
      // Remove temp column
      delete result[tempColumnName]
    }
    // Check for direct string value (explicit SELECT pattern)
    else if (columnName in result) {
      const value = result[columnName]
      if (typeof value === "string") {
        const currencyCode = getCurrencyCode(result, config)
        if (currencyCode) {
          result[columnName] = createMoneyFromValue(
            value,
            currencyCode,
            config.minorUnits,
          )
        }
      }
      // Non-string values (numbers, null, undefined) pass through unchanged
    }
  }

  // Clean up any remaining temp columns not in our config
  for (const key of Object.keys(result)) {
    if (isTempColumn(key)) {
      delete result[key]
    }
  }

  return result
}

/**
 * Get the currency code for a money column from either config or row data
 */
function getCurrencyCode(
  row: Record<string, unknown>,
  config: NormalizedMoneyColumnConfig,
): string | undefined {
  if (config.currencyCode) {
    return config.currencyCode
  }
  if (config.currencyColumn) {
    const currency = row[config.currencyColumn]
    if (typeof currency === "string") {
      return currency
    }
  }
  return undefined
}

/**
 * Create a Money instance from a string value and column config
 */
export function createMoneyFromValue(
  value: string,
  currencyCode: string,
  minorUnits: boolean,
): Money {
  if (minorUnits) {
    // Value is in minor units (cents, satoshis), convert to Money
    const minorAmount = BigInt(value)
    return MoneyFactory(minorAmount, currencyCode)
  }
  // Value is a decimal string
  return MoneyFactory(`${value} ${currencyCode}`)
}
