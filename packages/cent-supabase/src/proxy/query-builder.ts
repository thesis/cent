import type { NormalizedTableConfig } from "../types"
import { rewriteSelect, type RewriteSelectResult } from "../transform/select"
import { transformResponseData } from "../transform/response"
import { serializeMoneyInData } from "../transform/mutation"

// Query builder type - using interface for the methods we need
interface QueryBuilder {
  select(columns: string, options?: unknown): unknown
  insert(data: unknown, options?: unknown): unknown
  update(data: unknown, options?: unknown): unknown
  upsert(data: unknown, options?: unknown): unknown
}

/**
 * Create a proxied query builder that handles Money columns
 */
export function createQueryBuilderProxy<T extends QueryBuilder>(
  queryBuilder: T,
  tableConfig: NormalizedTableConfig,
): T {
  return new Proxy(queryBuilder as object, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      if (typeof value === "function") {
        // Intercept select()
        if (prop === "select") {
          return createSelectInterceptor(target as QueryBuilder, tableConfig)
        }

        // Intercept mutation methods
        if (prop === "insert" || prop === "upsert") {
          return createInsertInterceptor(target as QueryBuilder, prop, tableConfig)
        }

        if (prop === "update") {
          return createUpdateInterceptor(target as QueryBuilder, tableConfig)
        }

        // Pass through other methods, but wrap the result
        return (...args: unknown[]) => {
          const result = (value as Function).apply(target, args)
          if (result && typeof result === "object" && "then" in result) {
            return createFilterBuilderProxy(result, tableConfig, { select: "*", tempColumns: [] })
          }
          return result
        }
      }

      return value
    },
  }) as T
}

/**
 * Create a select() interceptor that rewrites the SELECT clause
 */
function createSelectInterceptor(
  target: QueryBuilder,
  tableConfig: NormalizedTableConfig,
) {
  return (columns?: string, options?: { head?: boolean; count?: "exact" | "planned" | "estimated" }) => {
    const columnsStr = columns ?? "*"
    const rewriteResult = rewriteSelect(columnsStr, tableConfig)

    const result = target.select(rewriteResult.select, options)
    return createFilterBuilderProxy(result, tableConfig, rewriteResult)
  }
}

/**
 * Create an insert/upsert interceptor that serializes Money values
 */
function createInsertInterceptor(
  target: QueryBuilder,
  method: "insert" | "upsert",
  tableConfig: NormalizedTableConfig,
) {
  return (data: unknown, options?: unknown) => {
    const serialized = serializeMoneyInData(data, tableConfig)
    const result = target[method](serialized, options)
    return createFilterBuilderProxy(result, tableConfig, { select: "*", tempColumns: [] })
  }
}

/**
 * Create an update interceptor that serializes Money values
 */
function createUpdateInterceptor(
  target: QueryBuilder,
  tableConfig: NormalizedTableConfig,
) {
  return (data: unknown, options?: unknown) => {
    const serialized = serializeMoneyInData(data, tableConfig)
    const result = target.update(serialized, options)
    return createFilterBuilderProxy(result, tableConfig, { select: "*", tempColumns: [] })
  }
}

/**
 * Create a proxied filter builder that transforms response data
 */
export function createFilterBuilderProxy<T>(
  filterBuilder: T,
  tableConfig: NormalizedTableConfig,
  selectResult: RewriteSelectResult,
): T {
  return new Proxy(filterBuilder as object, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      if (typeof value === "function") {
        // Intercept select() on filter builder (for chained selects)
        if (prop === "select") {
          return (columns?: string, options?: unknown) => {
            const columnsStr = columns ?? "*"
            const newSelectResult = rewriteSelect(columnsStr, tableConfig)
            const result = (target as QueryBuilder).select(newSelectResult.select, options)
            return createFilterBuilderProxy(result, tableConfig, newSelectResult)
          }
        }

        // Intercept then() to transform response
        if (prop === "then") {
          return (onfulfilled?: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) => {
            return (value as Function).call(target, (response: { data?: unknown }) => {
              if (response && response.data) {
                response.data = transformResponseData(
                  response.data,
                  tableConfig,
                  selectResult.tempColumns,
                )
              }
              return onfulfilled ? onfulfilled(response) : response
            }, onrejected)
          }
        }

        // Pass through other methods, wrapping the result
        return (...args: unknown[]) => {
          const result = (value as Function).apply(target, args)
          // If result is thenable, wrap it
          if (result && typeof result === "object" && "then" in result) {
            return createFilterBuilderProxy(result, tableConfig, selectResult)
          }
          return result
        }
      }

      return value
    },
  }) as T
}
