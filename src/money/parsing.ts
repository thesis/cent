import { Currency } from "../types"
import {
  currencies,
  PRIMARY_SYMBOL_MAP,
  getPrimaryCurrency,
} from "../currencies"
import { FixedPointNumber } from "../fixed-point"

/**
 * Result of parsing a money string
 */
export interface MoneyParseResult {
  currency: Currency
  amount: FixedPointNumber
}

/**
 * Validate US comma grouping (thousands separators every 3 digits)
 */
function validateUSCommaGrouping(str: string): void {
  // Should be like: 1,234 or 1,234,567 (groups of 3 from right)
  const withoutCommas = str.replace(/,/g, "")
  if (withoutCommas.length <= 3) {
    throw new Error(`Invalid comma usage: "${str}"`)
  }

  const parts = str.split(",")
  // First part can be 1-3 digits, rest must be exactly 3
  if (parts[0].length === 0 || parts[0].length > 3) {
    throw new Error(`Invalid comma grouping: "${str}"`)
  }

  for (let i = 1; i < parts.length; i += 1) {
    if (parts[i].length !== 3) {
      throw new Error(`Invalid comma grouping: "${str}"`)
    }
  }
}

/**
 * Validate EU dot grouping (thousands separators every 3 digits)
 */
function validateEUDotGrouping(str: string): void {
  // Should be like: 1.234 or 1.234.567 (groups of 3 from right)
  const withoutDots = str.replace(/\./g, "")
  if (withoutDots.length <= 3) {
    throw new Error(`Invalid dot usage: "${str}"`)
  }

  const parts = str.split(".")
  // First part can be 1-3 digits, rest must be exactly 3
  if (parts[0].length === 0 || parts[0].length > 3) {
    throw new Error(`Invalid dot grouping: "${str}"`)
  }

  for (let i = 1; i < parts.length; i += 1) {
    if (parts[i].length !== 3) {
      throw new Error(`Invalid dot grouping: "${str}"`)
    }
  }
}

/**
 * Parse number string with format detection
 * Returns { amount: bigint, decimals: number } where amount includes decimal places
 */
function parseNumber(
  amountStr: string,
  format: "US" | "EU",
): { amount: bigint; decimals: number } {
  let cleaned = amountStr.trim()

  // Handle negative signs
  const isNegative = cleaned.startsWith("-") || cleaned.startsWith("−")
  if (isNegative) {
    cleaned = cleaned.slice(1).trim()
  }

  if (format === "US") {
    // US format: 1,234.56 (comma thousands, dot decimal)
    const parts = cleaned.split(".")
    if (parts.length > 2) {
      throw new Error(`Invalid number format: "${amountStr}"`)
    }

    const integerPart = parts[0].replace(/,/g, "")
    const decimalPart = parts[1] || ""

    // Validate integer part has valid comma grouping
    if (parts[0].includes(",")) {
      validateUSCommaGrouping(parts[0])
    }

    // Validate characters
    if (
      !/^\d+$/.test(integerPart) ||
      (decimalPart && !/^\d+$/.test(decimalPart))
    ) {
      throw new Error(`Invalid number format: "${amountStr}"`)
    }

    const fullNumber = integerPart + decimalPart
    const result = BigInt(fullNumber || "0")
    const amount = isNegative ? -result : result
    return { amount, decimals: decimalPart.length }
  }
  // EU format: 1.234,56 (dot thousands, comma decimal)
  const parts = cleaned.split(",")
  if (parts.length > 2) {
    throw new Error(`Invalid number format: "${amountStr}"`)
  }

  const integerPart = parts[0].replace(/\./g, "")
  const decimalPart = parts[1] || ""

  // Validate integer part has valid dot grouping
  if (parts[0].includes(".")) {
    validateEUDotGrouping(parts[0])
  }

  // Validate characters
  if (
    !/^\d+$/.test(integerPart) ||
    (decimalPart && !/^\d+$/.test(decimalPart))
  ) {
    throw new Error(`Invalid number format: "${amountStr}"`)
  }

  const fullNumber = integerPart + decimalPart
  const result = BigInt(fullNumber || "0")
  const amount = isNegative ? -result : result
  return { amount, decimals: decimalPart.length }
}

/**
 * Detect number format (US vs EU) based on currency and string patterns
 */
function detectNumberFormat(
  amountStr: string,
  currency: Currency,
): "US" | "EU" {
  // Clear indicators
  if (amountStr.includes(",") && amountStr.includes(".")) {
    // Has both separators - determine based on position
    const lastComma = amountStr.lastIndexOf(",")
    const lastDot = amountStr.lastIndexOf(".")

    if (lastDot > lastComma) {
      // "1,234.56" - US format
      return "US"
    }
    // "1.234,56" - EU format
    return "EU"
  }

  // Currency-based hints
  if (currency.code === "USD") {
    return "US" // USD typically uses US format
  }

  // EU currencies that commonly use EU format
  if (["EUR", "DKK", "NOK", "SEK"].includes(currency.code)) {
    // If only comma, assume EU decimal separator
    if (amountStr.includes(",") && !amountStr.includes(".")) {
      return "EU"
    }

    // If only dot and pattern suggests thousands separator (not decimal)
    if (amountStr.includes(".") && !amountStr.includes(",")) {
      // Pattern like "1.000" or "10.000" (dot followed by exactly 3 digits at end)
      // vs "1.23" or "1.2345" (likely decimal places)
      const dotPattern = /\.(\d+)$/
      const match = amountStr.match(dotPattern)
      if (match && match[1].length === 3) {
        // Check if it looks like thousands grouping (multiple groups of 3)
        const beforeLastDot = amountStr.slice(0, amountStr.lastIndexOf("."))
        if (!beforeLastDot.includes(".") || /\.\d{3}$/.test(beforeLastDot)) {
          return "EU" // Likely thousands separator
        }
      }
    }
  }

  // Default to US format for ambiguous cases
  return "US"
}

/**
 * Create FixedPointNumber with proper decimals for currency
 */
function createFixedPointFromParsed(
  parsed: { amount: bigint; decimals: number },
  currency: Currency,
): FixedPointNumber {
  // For financial precision, allow more decimal places than the currency's standard
  // The FixedPointNumber will preserve the exact precision specified

  // If the input has fewer decimals than the currency supports, scale up to currency decimals
  // e.g., "$100" (0 decimals) for USD (2 decimals) becomes 10000 (100.00)
  // If input has more decimals, preserve the higher precision
  const targetDecimals = Math.max(parsed.decimals, Number(currency.decimals))
  const decimalDiff = targetDecimals - parsed.decimals
  const scaledAmount = parsed.amount * 10n ** BigInt(decimalDiff)

  return new FixedPointNumber(scaledAmount, BigInt(targetDecimals))
}

/**
 * Try to parse cryptocurrency sub-units like "100 sat", "1000 wei"
 */
function tryParseCryptoSubUnit(input: string): MoneyParseResult | null {
  // Pattern: number + space + unit
  const match = input.match(/^([0-9,. -]+)\s+([a-zA-Z]+)s?$/i)
  if (!match) return null

  const [, amountStr, unit] = match
  const unitLower = unit.toLowerCase()

  // Bitcoin sub-units
  if (["sat", "sats", "satoshi", "satoshis"].includes(unitLower)) {
    const parsed = parseNumber(amountStr, "US") // Satoshis are always integers
    return {
      currency: currencies.BTC,
      amount: new FixedPointNumber(parsed.amount, 8n), // satoshis are at 8 decimal places
    }
  }

  if (["bit", "bits"].includes(unitLower)) {
    const parsed = parseNumber(amountStr, "US")
    const { amount } = parsed
    return {
      currency: currencies.BTC,
      amount: new FixedPointNumber(amount * 10n, 8n), // 1 bit = 10 satoshis
    }
  }

  if (
    [
      "msat",
      "msats",
      "millisat",
      "millisats",
      "millisatoshi",
      "millisatoshis",
    ].includes(unitLower)
  ) {
    const parsed = parseNumber(amountStr, "US")
    const { amount } = parsed
    return {
      currency: currencies.BTC,
      amount: new FixedPointNumber(amount, 12n), // millisatoshis are at 12 decimal places
    }
  }

  // Ethereum sub-units
  if (["wei"].includes(unitLower)) {
    const parsed = parseNumber(amountStr, "US")
    const { amount } = parsed
    return {
      currency: currencies.ETH,
      amount: new FixedPointNumber(amount, 18n), // wei are at 18 decimal places
    }
  }

  if (["gwei", "shannon"].includes(unitLower)) {
    const parsed = parseNumber(amountStr, "US")
    const { amount } = parsed
    return {
      currency: currencies.ETH,
      amount: new FixedPointNumber(amount * 10n ** 9n, 18n), // 1 gwei = 10^9 wei
    }
  }

  if (["kwei", "babbage"].includes(unitLower)) {
    const parsed = parseNumber(amountStr, "US")
    const { amount } = parsed
    return {
      currency: currencies.ETH,
      amount: new FixedPointNumber(amount * 10n ** 3n, 18n), // 1 kwei = 10^3 wei
    }
  }

  return null
}

/**
 * Parse currency code and amount
 */
function parseCurrencyCodeAmount(
  code: string,
  amountStr: string,
): MoneyParseResult {
  // Make currency code lookup case-insensitive
  const upperCode = code.toUpperCase()
  const currency = currencies[upperCode]
  if (!currency) {
    throw new Error(`Unknown currency code: ${code}`)
  }

  const format = detectNumberFormat(amountStr, currency)
  const parsed = parseNumber(amountStr, format)

  return {
    currency,
    amount: createFixedPointFromParsed(parsed, currency),
  }
}

/**
 * Try to parse currency code format: "USD 100", "100 EUR", "USDT 5", "5 USDC"
 */
function tryParseCurrencyCode(input: string): MoneyParseResult | null {
  // Pattern: code + space + number OR number + space + code
  // Support both 3-letter (ISO 4217) and 4-letter (crypto) currency codes
  const codeFirstMatch = input.match(/^([A-Z]{3,4})\s+([0-9,. -]+)$/i)
  const codeLastMatch = input.match(/^([0-9,. -]+)\s+([A-Z]{3,4})$/i)

  if (codeFirstMatch) {
    const [, code, amountStr] = codeFirstMatch
    return parseCurrencyCodeAmount(code.toUpperCase(), amountStr)
  }

  if (codeLastMatch) {
    const [, amountStr, code] = codeLastMatch
    return parseCurrencyCodeAmount(code.toUpperCase(), amountStr)
  }

  return null
}

/**
 * Try to parse currency symbol (prefix or suffix)
 */
function tryParseSymbol(input: string): MoneyParseResult | null {
  // Handle negative prefix: "-$100" -> negative=true, remaining="$100"
  let isNegative = false
  let cleanInput = input

  if (input.startsWith("-") || input.startsWith("−")) {
    isNegative = true
    cleanInput = input.slice(1).trim()
  }

  // Try all symbols from longest to shortest to avoid conflicts
  const symbols = Object.keys(PRIMARY_SYMBOL_MAP).sort(
    (a, b) => b.length - a.length,
  )

  // Use a traditional for loop instead of for...of to avoid linting issues
  for (let i = 0; i < symbols.length; i += 1) {
    const symbol = symbols[i]
    // Prefix symbol: "$100", "€1,234.56" (or after removing negative: "$100" from "-$100")
    if (cleanInput.startsWith(symbol)) {
      const amountStr = cleanInput.slice(symbol.length).trim()
      if (amountStr) {
        const currency = getPrimaryCurrency(symbol)!
        const format = detectNumberFormat(amountStr, currency)
        let parsed = parseNumber(amountStr, format)

        // Apply negative if we found one at the start
        if (isNegative) {
          parsed = { amount: -parsed.amount, decimals: parsed.decimals }
        }

        return {
          currency,
          amount: createFixedPointFromParsed(parsed, currency),
        }
      }
    }

    // Suffix symbol: "100$", "1234.56€"
    if (cleanInput.endsWith(symbol)) {
      const amountStr = cleanInput.slice(0, -symbol.length).trim()
      if (amountStr) {
        const currency = getPrimaryCurrency(symbol)!
        const format = detectNumberFormat(amountStr, currency)
        let parsed = parseNumber(amountStr, format)

        // Apply negative if we found one at the start
        if (isNegative) {
          parsed = { amount: -parsed.amount, decimals: parsed.decimals }
        }

        return {
          currency,
          amount: createFixedPointFromParsed(parsed, currency),
        }
      }
    }
  }

  return null
}

/**
 * Parse a money string like "$100", "€1,234.56", "100 USD", "1000 sat", etc.
 */
export function parseMoneyString(input: string): MoneyParseResult {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error("Empty money string")
  }

  // Try crypto sub-unit parsing first (most specific)
  const cryptoResult = tryParseCryptoSubUnit(trimmed)
  if (cryptoResult) {
    return cryptoResult
  }

  // Try currency code parsing (before symbol parsing to avoid conflicts)
  const codeResult = tryParseCurrencyCode(trimmed)
  if (codeResult) {
    return codeResult
  }

  // Try symbol parsing (prefix or suffix)
  const symbolResult = tryParseSymbol(trimmed)
  if (symbolResult) {
    return symbolResult
  }

  throw new Error(`Invalid money string format: "${input}"`)
}
