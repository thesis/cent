import * as Cent from "@thesis-co/cent"
import { transform } from "sucrase"

interface ExecutionResult {
  output: string
  error: string | null
}

function formatValue(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "bigint") return `${value}n`
  if (Array.isArray(value)) {
    return `[${value.map(formatValue).join(", ")}]`
  }
  if (typeof value === "object" && value !== null) {
    // Check if it has a toString method that's not the default Object.toString
    if (
      "toString" in value &&
      typeof (value as { toString: () => string }).toString === "function"
    ) {
      const str = (value as { toString: () => string }).toString()
      // If toString returns something meaningful (not [object Object])
      if (!str.startsWith("[object ")) {
        return str
      }
    }
    try {
      return JSON.stringify(
        value,
        (_, v) => (typeof v === "bigint" ? `${v}n` : v),
        2,
      )
    } catch {
      return String(value)
    }
  }
  return String(value)
}

// Strip import statements since cent is provided globally
function stripImports(code: string): string {
  // Remove import statements for @thesis-co/cent
  return code.replace(
    /^import\s+.*from\s+['"]@thesis-co\/cent['"];?\s*$/gm,
    "// import removed - cent is available globally",
  )
}

export function executeCode(code: string): ExecutionResult {
  const logs: string[] = []
  let error: string | null = null

  try {
    // Strip imports before transformation
    const strippedCode = stripImports(code)

    // Transform TypeScript to JavaScript (without import transform since we stripped them)
    const compiled = transform(strippedCode, {
      transforms: ["typescript"],
      production: true,
    }).code

    // Create mock console
    const mockConsole = {
      log: (...args: unknown[]) => {
        logs.push(args.map(formatValue).join(" "))
      },
      error: (...args: unknown[]) => {
        logs.push(`Error: ${args.map(formatValue).join(" ")}`)
      },
      warn: (...args: unknown[]) => {
        logs.push(`Warning: ${args.map(formatValue).join(" ")}`)
      },
      info: (...args: unknown[]) => {
        logs.push(args.map(formatValue).join(" "))
      },
    }

    // Execute in sandboxed context with cent available
    const fn = new Function(
      "console",
      "Money",
      "FixedPoint",
      "Rational",
      "Round",
      "Price",
      "PriceRange",
      "ExchangeRate",
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "BTC",
      "ETH",
      compiled,
    )

    fn(
      mockConsole,
      Cent.Money,
      Cent.FixedPoint,
      Cent.Rational,
      Cent.Round,
      Cent.Price,
      Cent.PriceRange,
      Cent.ExchangeRate,
      Cent.USD,
      Cent.EUR,
      Cent.GBP,
      Cent.JPY,
      Cent.BTC,
      Cent.ETH,
    )
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  return {
    output: logs.join("\n"),
    error,
  }
}
