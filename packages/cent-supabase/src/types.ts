/**
 * Configuration for a money column with dynamic currency (from another column)
 */
export interface DynamicCurrencyConfig {
  /** Column name containing the currency code */
  currencyColumn: string
  /**
   * Whether values are stored in minor units (cents, satoshis, wei).
   * @default false
   */
  minorUnits?: boolean
}

/**
 * Configuration for a money column with static currency
 */
export interface StaticCurrencyConfig {
  /** Static currency code (e.g., 'USD', 'EUR', 'BTC') */
  currencyCode: string
  /**
   * Whether values are stored in minor units (cents, satoshis, wei).
   * @default false
   */
  minorUnits?: boolean
}

/**
 * Configuration for a money column - either dynamic or static currency
 */
export type MoneyColumnConfig = DynamicCurrencyConfig | StaticCurrencyConfig

/**
 * Currency source type for convenience
 */
export type CurrencySource = MoneyColumnConfig

/**
 * Configuration for a single table
 */
export interface TableConfig {
  /**
   * Money column configurations.
   * Key is the column name, value is the currency configuration.
   */
  money: Record<string, MoneyColumnConfig>
}

/**
 * Options for creating a Cent-enhanced Supabase client
 */
export interface CentSupabaseOptions {
  /**
   * Table configurations.
   * Key is the table name, value is the table configuration.
   */
  tables: Record<string, TableConfig>
}

/**
 * Internal normalized configuration
 */
export interface NormalizedConfig {
  tables: Record<string, NormalizedTableConfig>
}

/**
 * Normalized table configuration with computed properties
 */
export interface NormalizedTableConfig {
  money: Record<string, NormalizedMoneyColumnConfig>
  /** List of money column names for quick lookup */
  moneyColumns: string[]
}

/**
 * Normalized money column configuration
 */
export interface NormalizedMoneyColumnConfig {
  /** Currency column name (for dynamic currency) */
  currencyColumn?: string
  /** Static currency code */
  currencyCode?: string
  /** Whether stored in minor units */
  minorUnits: boolean
}

/**
 * Type guard to check if a currency source uses a column
 */
export function hasCurrencyColumn(
  config: MoneyColumnConfig,
): config is DynamicCurrencyConfig {
  return "currencyColumn" in config
}

/**
 * Type guard to check if a currency source uses a static code
 */
export function hasCurrencyCode(
  config: MoneyColumnConfig,
): config is StaticCurrencyConfig {
  return "currencyCode" in config
}

/**
 * Normalize user-provided options into internal config format
 */
export function normalizeConfig(options: CentSupabaseOptions): NormalizedConfig {
  const tables: Record<string, NormalizedTableConfig> = {}

  for (const [tableName, tableConfig] of Object.entries(options.tables)) {
    const money: Record<string, NormalizedMoneyColumnConfig> = {}
    const moneyColumns: string[] = []

    for (const [columnName, columnConfig] of Object.entries(tableConfig.money)) {
      moneyColumns.push(columnName)

      money[columnName] = {
        currencyColumn: hasCurrencyColumn(columnConfig)
          ? columnConfig.currencyColumn
          : undefined,
        currencyCode: hasCurrencyCode(columnConfig)
          ? columnConfig.currencyCode
          : undefined,
        minorUnits: columnConfig.minorUnits ?? false,
      }
    }

    tables[tableName] = { money, moneyColumns }
  }

  return { tables }
}
