import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { CentSupabaseOptions, NormalizedConfig } from "./types"
import { normalizeConfig } from "./types"
import { createClientProxy } from "./proxy/client"

/**
 * Extended Supabase client type with Money support
 */
export type CentSupabaseClient<DB = any> = SupabaseClient<DB>

/**
 * Create a Cent-enhanced Supabase client.
 *
 * This wraps the standard Supabase client to automatically:
 * - Cast money columns to text in SELECT queries (preserving precision)
 * - Transform response data into Money instances
 * - Serialize Money instances in mutations
 * - Handle realtime subscriptions
 *
 * @param supabaseUrl - Your Supabase project URL
 * @param supabaseKey - Your Supabase anon/service key
 * @param options - Cent configuration specifying money columns per table
 * @param supabaseOptions - Options passed to underlying createClient
 * @returns Enhanced Supabase client with Money support
 *
 * @example
 * ```typescript
 * const supabase = createCentSupabaseClient(
 *   process.env.SUPABASE_URL,
 *   process.env.SUPABASE_ANON_KEY,
 *   {
 *     tables: {
 *       orders: {
 *         money: {
 *           total: { currencyColumn: 'currency' },
 *           tax: { currencyColumn: 'currency' }
 *         }
 *       },
 *       products: {
 *         money: {
 *           price: { currencyCode: 'USD' }
 *         }
 *       }
 *     }
 *   }
 * );
 * ```
 */
export function createCentSupabaseClient<DB = any>(
  supabaseUrl: string,
  supabaseKey: string,
  options: CentSupabaseOptions,
  supabaseOptions?: Parameters<typeof createClient>[2],
): CentSupabaseClient<DB> {
  // Create the underlying Supabase client
  const client = createClient<DB>(supabaseUrl, supabaseKey, supabaseOptions)

  // Normalize the configuration
  const config: NormalizedConfig = normalizeConfig(options)

  // Return proxied client with Money handling
  return createClientProxy(client, config) as CentSupabaseClient<DB>
}

/**
 * Wrap an existing Supabase client with Money column handling.
 *
 * Use this when you already have a Supabase client instance and want
 * to add Money handling to it.
 *
 * @param client - An existing Supabase client
 * @param options - Cent configuration specifying money columns per table
 * @returns Enhanced Supabase client with Money support
 */
export function wrapSupabaseClient<DB = any>(
  client: SupabaseClient<DB>,
  options: CentSupabaseOptions,
): CentSupabaseClient<DB> {
  const config: NormalizedConfig = normalizeConfig(options)
  return createClientProxy(client, config) as CentSupabaseClient<DB>
}
