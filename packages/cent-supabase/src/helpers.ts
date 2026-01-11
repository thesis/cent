import type { MoneyColumnConfig, NormalizedTableConfig } from "./types"
import { rewriteSelect } from "./transform/select"
import { transformResponseData } from "./transform/response"
import { serializeMoneyInData } from "./transform/mutation"

/**
 * Normalize a simple column config to NormalizedTableConfig
 */
function normalizeColumnConfig(
  columns: Record<string, MoneyColumnConfig>,
): NormalizedTableConfig {
  const moneyColumns = Object.keys(columns)
  const money: NormalizedTableConfig["money"] = {}

  for (const [col, config] of Object.entries(columns)) {
    if ("currencyColumn" in config) {
      money[col] = {
        currencyColumn: config.currencyColumn,
        currencyCode: undefined,
        minorUnits: config.minorUnits ?? false,
      }
    } else {
      money[col] = {
        currencyColumn: undefined,
        currencyCode: config.currencyCode,
        minorUnits: config.minorUnits ?? false,
      }
    }
  }

  return { moneyColumns, money }
}

/**
 * Build a SELECT string with ::text casts for money columns.
 * Useful for manual query building.
 *
 * @param columns - Column names to select (string or array)
 * @param moneyColumns - Names of columns that are money
 * @returns SELECT string with appropriate casts
 *
 * @example
 * ```typescript
 * moneySelect(['id', 'name', 'price'], ['price'])
 * // Returns: "id, name, price::text"
 *
 * moneySelect('*', ['price', 'cost'])
 * // Returns: "*, price::text as __cent_price, cost::text as __cent_cost"
 * ```
 */
export function moneySelect(
  columns: string | string[],
  moneyColumns: string[],
): string {
  const colString = Array.isArray(columns) ? columns.join(", ") : columns
  const config: NormalizedTableConfig = {
    moneyColumns,
    money: Object.fromEntries(
      moneyColumns.map((col) => [
        col,
        { currencyCode: "USD", currencyColumn: undefined, minorUnits: false },
      ]),
    ),
  }
  return rewriteSelect(colString, config).select
}

/**
 * Transform response data by converting string amounts to Money instances.
 * Useful for RPC results or when using the raw Supabase client.
 *
 * @param data - Response data from Supabase
 * @param columns - Money column configurations
 * @returns Transformed data with Money instances
 *
 * @example
 * ```typescript
 * const { data } = await supabase.rpc('calculate_total', { order_id: '...' });
 * const result = parseMoneyResult(data, {
 *   total: { currencyCode: 'USD' }
 * });
 * ```
 */
export function parseMoneyResult<T>(
  data: T,
  columns: Record<string, MoneyColumnConfig>,
): T {
  const config = normalizeColumnConfig(columns)
  return transformResponseData(data, config, [])
}

/**
 * Serialize Money instances to strings for database mutations.
 * Also auto-populates currency columns from Money instances.
 *
 * @param data - Data containing Money instances
 * @param columns - Money column configurations
 * @returns Serialized data ready for insert/update
 *
 * @example
 * ```typescript
 * const serialized = serializeMoney(
 *   { total: Money('€150.00'), name: 'Order 1' },
 *   { total: { currencyColumn: 'currency' } }
 * );
 * // Returns: { total: '150.00', currency: 'EUR', name: 'Order 1' }
 * ```
 */
export function serializeMoney<T>(
  data: T,
  columns: Record<string, MoneyColumnConfig>,
): T {
  const config = normalizeColumnConfig(columns)
  return serializeMoneyInData(data, config)
}

/**
 * Transform a realtime payload by converting money columns to Money instances.
 * Useful when using raw channel subscriptions.
 *
 * @param payload - Realtime payload from Supabase
 * @param config - Table configuration with money columns
 * @returns Transformed payload with Money instances
 *
 * @example
 * ```typescript
 * channel.on('postgres_changes', { ... }, (payload) => {
 *   const transformed = transformRealtimePayload(payload, {
 *     money: { price: { currencyCode: 'USD' } }
 *   });
 * });
 * ```
 */
export function transformRealtimePayload<T extends { new?: unknown; old?: unknown }>(
  payload: T,
  config: { money: Record<string, MoneyColumnConfig> },
): T {
  const tableConfig = normalizeColumnConfig(config.money)
  const result = { ...payload }

  if (result.new) {
    result.new = transformResponseData(result.new, tableConfig, [])
  }
  if (result.old) {
    result.old = transformResponseData(result.old, tableConfig, [])
  }

  return result
}
