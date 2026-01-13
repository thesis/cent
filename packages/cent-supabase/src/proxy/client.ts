import type { SupabaseClient } from "@supabase/supabase-js"
import type { NormalizedConfig } from "../types"
import { createQueryBuilderProxy } from "./query-builder"
import { createRealtimeChannelProxy } from "./realtime"

/**
 * Create a proxied Supabase client that handles Money columns
 */
export function createClientProxy<T extends SupabaseClient<any, any, any>>(
  client: T,
  config: NormalizedConfig,
): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      if (typeof value === "function") {
        // Intercept from()
        if (prop === "from") {
          return (tableName: string) => {
            const queryBuilder = target.from(tableName)
            const tableConfig = config.tables[tableName]

            // If no config for this table, return the original query builder
            if (!tableConfig) {
              return queryBuilder
            }

            return createQueryBuilderProxy(queryBuilder, tableConfig)
          }
        }

        // Intercept channel() for realtime
        if (prop === "channel") {
          return (name: string, opts?: any) => {
            const channel = target.channel(name, opts)
            return createRealtimeChannelProxy(channel, config)
          }
        }

        // Pass through other methods
        return value.bind(target)
      }

      return value
    },
  })
}
