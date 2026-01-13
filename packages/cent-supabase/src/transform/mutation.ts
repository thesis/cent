import {
  MoneyClass,
  type MoneyClass as Money,
} from "@thesis-co/cent"
import type { NormalizedTableConfig, NormalizedMoneyColumnConfig } from "../types"

/**
 * Serialize Money instances in mutation data to strings for database insertion.
 *
 * For each money column:
 * 1. If the value is a Money instance:
 *    - Convert to decimal string (or minor units string if minorUnits: true)
 *    - Auto-populate the currency column from Money's currency code (if currencyColumn config)
 * 2. Pass through non-Money values unchanged
 *
 * @param data - Data to be inserted/updated (single row or array)
 * @param tableConfig - Normalized table configuration
 * @returns Serialized data with Money instances converted to strings
 */
export function serializeMoneyInData<T>(
  data: T,
  tableConfig: NormalizedTableConfig,
): T {
  // Handle null/undefined
  if (data == null) {
    return data
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((row) =>
      serializeRow(row as Record<string, unknown>, tableConfig),
    ) as T
  }

  // Handle single object
  if (typeof data === "object") {
    return serializeRow(
      data as Record<string, unknown>,
      tableConfig,
    ) as T
  }

  return data
}

/**
 * Serialize a single row of data, converting Money instances to strings
 */
export function serializeRow(
  row: Record<string, unknown>,
  tableConfig: NormalizedTableConfig,
): Record<string, unknown> {
  const result = { ...row }

  // Track currency column values to detect conflicts
  const currencyColumnValues: Record<string, string> = {}

  // Process each money column
  for (const columnName of tableConfig.moneyColumns) {
    const config = tableConfig.money[columnName]
    const value = result[columnName]

    if (MoneyClass.isMoney(value)) {
      // Serialize Money to string
      result[columnName] = serializeMoneyValue(value, config.minorUnits)

      // Auto-populate currency column if configured
      if (config.currencyColumn) {
        const currencyCode = value.currency.code

        // Check for conflicts with other Money values targeting same currency column
        if (config.currencyColumn in currencyColumnValues) {
          const existingCurrency = currencyColumnValues[config.currencyColumn]
          if (existingCurrency !== currencyCode) {
            throw new Error(
              `Conflicting currencies for column '${config.currencyColumn}': ` +
                `${existingCurrency} vs ${currencyCode}`,
            )
          }
        }

        // Set currency column value
        currencyColumnValues[config.currencyColumn] = currencyCode
        result[config.currencyColumn] = currencyCode
      }
    }
    // Non-Money values pass through unchanged
  }

  return result
}

/**
 * Serialize a Money value to a string representation for database storage
 */
export function serializeMoneyValue(
  money: Money,
  minorUnits: boolean,
): string {
  if (minorUnits) {
    return money.toMinorUnits().toString()
  }
  return money.toDecimalString()
}
