import type { RealtimeChannel } from "@supabase/supabase-js"
import type { NormalizedConfig } from "../types"
import { transformResponseData } from "../transform/response"

/**
 * Create a proxied realtime channel that transforms Money columns in payloads
 */
export function createRealtimeChannelProxy<T extends RealtimeChannel>(
  channel: T,
  config: NormalizedConfig,
): T {
  return new Proxy(channel, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      if (typeof value === "function") {
        // Intercept on() for postgres_changes
        if (prop === "on") {
          return (
            type: string,
            filter: { event: string; schema?: string; table?: string; filter?: string },
            callback: (payload: any) => void,
          ) => {
            // Only intercept postgres_changes
            if (type === "postgres_changes" && filter.table) {
              const tableConfig = config.tables[filter.table]

              if (tableConfig) {
                // Wrap the callback to transform Money columns
                const wrappedCallback = (payload: any) => {
                  if (payload.new) {
                    payload.new = transformResponseData(payload.new, tableConfig, [])
                  }
                  if (payload.old) {
                    payload.old = transformResponseData(payload.old, tableConfig, [])
                  }
                  callback(payload)
                }

                const result = target.on(type as any, filter as any, wrappedCallback)
                return createRealtimeChannelProxy(result as T, config)
              }
            }

            // Pass through for non-configured tables or other event types
            const result = target.on(type as any, filter as any, callback)
            return createRealtimeChannelProxy(result as T, config)
          }
        }

        // Pass through other methods, wrapping the result if it returns the channel
        return (...args: unknown[]) => {
          const result = value.apply(target, args)
          // If result is the channel (for chaining), wrap it
          if (result === target || (result && typeof result === "object" && "on" in result)) {
            return createRealtimeChannelProxy(result as T, config)
          }
          return result
        }
      }

      return value
    },
  })
}
