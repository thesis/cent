/**
 * @thesis-co/cent-supabase
 *
 * Precision-safe money handling for Supabase/PostgREST.
 * Automatically handles DECIMAL/NUMERIC columns to prevent JavaScript
 * floating-point precision loss.
 */

// Types
export type {
  CentSupabaseOptions,
  CurrencySource,
  MoneyColumnConfig,
  TableConfig,
} from "./types"

// Factory function
export { createCentSupabaseClient } from "./client"

// Helper functions for manual use
export {
  moneySelect,
  parseMoneyResult,
  serializeMoney,
  transformRealtimePayload,
} from "./helpers"
