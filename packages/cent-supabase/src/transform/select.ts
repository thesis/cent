import type { NormalizedTableConfig } from "../types"

/**
 * Result of rewriting a SELECT clause
 */
export interface RewriteSelectResult {
  /** The rewritten SELECT string */
  select: string
  /** Temporary column names that need cleanup in response (for SELECT * pattern) */
  tempColumns: string[]
}

/**
 * Rewrite a SELECT clause to cast money columns to text for precision safety.
 *
 * For `SELECT *`:
 * - Keeps the `*`
 * - Appends `::text` casts with temp aliases for money columns
 * - Example: `*` → `*, price::text as __cent_price`
 *
 * For explicit column lists:
 * - Casts money columns directly
 * - Example: `id, price` → `id, price::text`
 *
 * @param columns - The original SELECT columns string
 * @param tableConfig - Normalized table configuration
 * @returns The rewritten SELECT string and list of temp columns
 */
export function rewriteSelect(
  columns: string,
  tableConfig: NormalizedTableConfig,
): RewriteSelectResult {
  const trimmed = columns.trim()

  // Handle empty string
  if (!trimmed) {
    return { select: "", tempColumns: [] }
  }

  // Handle no money columns
  if (tableConfig.moneyColumns.length === 0) {
    return { select: trimmed, tempColumns: [] }
  }

  // Handle SELECT * pattern
  if (trimmed === "*") {
    const tempColumns: string[] = []
    const casts = tableConfig.moneyColumns.map((col) => {
      const tempName = getTempColumnName(col)
      tempColumns.push(tempName)
      return `${col}::text as ${tempName}`
    })
    return {
      select: `*, ${casts.join(", ")}`,
      tempColumns,
    }
  }

  // Handle explicit column list
  const result = rewriteExplicitColumns(trimmed, tableConfig.moneyColumns)
  return { select: result, tempColumns: [] }
}

/**
 * Aggregate functions that should be cast when containing money columns
 */
const AGGREGATE_FUNCTIONS = ["sum", "avg", "min", "max"]

/**
 * Rewrite explicit column list, casting money columns to text
 */
function rewriteExplicitColumns(
  columns: string,
  moneyColumns: string[],
): string {
  // Split by comma, preserving nested parentheses
  const parts = splitColumns(columns)

  const rewritten = parts.map((part) => {
    const trimmedPart = part.trim()

    // Skip if already has a cast (::)
    if (hasCast(trimmedPart)) {
      return trimmedPart
    }

    // Check for aggregate functions
    const aggregateMatch = matchAggregate(trimmedPart)
    if (aggregateMatch) {
      const { func, inner, alias } = aggregateMatch
      // Check if inner column is a money column
      if (moneyColumns.includes(inner)) {
        const cast = `${func}(${inner})::text`
        return alias ? `${cast}${alias}` : cast
      }
      return trimmedPart
    }

    // Skip nested relations (contains parentheses but not an aggregate)
    if (trimmedPart.includes("(")) {
      return trimmedPart
    }

    // Check for alias
    const aliasMatch = matchAlias(trimmedPart)
    if (aliasMatch) {
      const { column, alias } = aliasMatch
      if (moneyColumns.includes(column)) {
        return `${column}::text${alias}`
      }
      return trimmedPart
    }

    // Simple column - check if it's a money column (exact match)
    if (moneyColumns.includes(trimmedPart)) {
      return `${trimmedPart}::text`
    }

    return trimmedPart
  })

  return rewritten.join(", ")
}

/**
 * Split columns by comma, respecting parentheses
 */
function splitColumns(columns: string): string[] {
  const parts: string[] = []
  let current = ""
  let depth = 0

  for (const char of columns) {
    if (char === "(") {
      depth++
      current += char
    } else if (char === ")") {
      depth--
      current += char
    } else if (char === "," && depth === 0) {
      parts.push(current)
      current = ""
    } else {
      current += char
    }
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

/**
 * Check if a column expression already has a cast
 */
function hasCast(expr: string): boolean {
  // Look for :: not inside parentheses
  let depth = 0
  for (let i = 0; i < expr.length - 1; i++) {
    if (expr[i] === "(") depth++
    else if (expr[i] === ")") depth--
    else if (depth === 0 && expr[i] === ":" && expr[i + 1] === ":") {
      return true
    }
  }
  return false
}

/**
 * Match aggregate function pattern: func(column) [as alias]
 */
function matchAggregate(
  expr: string,
): { func: string; inner: string; alias: string } | null {
  const pattern = new RegExp(
    `^(${AGGREGATE_FUNCTIONS.join("|")})\\s*\\(\\s*([^)]+)\\s*\\)(\\s+(?:as\\s+)?\\w+)?$`,
    "i",
  )
  const match = expr.match(pattern)
  if (match) {
    return {
      func: match[1].toLowerCase(),
      inner: match[2].trim(),
      alias: match[3] || "",
    }
  }
  return null
}

/**
 * Match alias pattern: column [as] alias
 */
function matchAlias(expr: string): { column: string; alias: string } | null {
  // Match "column as alias" or "column alias" (but not aggregates)
  const pattern = /^(\w+)\s+(as\s+\w+|AS\s+\w+)$/
  const match = expr.match(pattern)
  if (match) {
    return {
      column: match[1],
      alias: ` ${match[2]}`,
    }
  }
  return null
}

/**
 * Prefix for temporary columns created during SELECT * rewriting
 */
export const TEMP_COLUMN_PREFIX = "__cent_"

/**
 * Get the temporary column name for a money column
 */
export function getTempColumnName(columnName: string): string {
  return `${TEMP_COLUMN_PREFIX}${columnName}`
}

/**
 * Check if a column name is a temporary cent column
 */
export function isTempColumn(columnName: string): boolean {
  return columnName.startsWith(TEMP_COLUMN_PREFIX)
}

/**
 * Get the original column name from a temporary column name
 */
export function getOriginalColumnName(tempColumnName: string): string {
  if (!isTempColumn(tempColumnName)) {
    return tempColumnName
  }
  return tempColumnName.slice(TEMP_COLUMN_PREFIX.length)
}
