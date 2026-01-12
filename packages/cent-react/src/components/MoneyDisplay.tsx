import { Money, MoneyClass } from '@thesis-co/cent'
import { type ReactNode, useMemo } from 'react'

/** Type alias for Money instance */
type MoneyInstance = InstanceType<typeof MoneyClass>

/** Options for formatting Money to string */
interface MoneyFormatOptions {
  locale?: string
  compact?: boolean
  maxDecimals?: number | bigint
  minDecimals?: number | bigint
  preferredUnit?: string
  preferSymbol?: boolean
  preferFractionalSymbol?: boolean
  excludeCurrency?: boolean
}

/**
 * Parts of a formatted money value for custom rendering
 */
export interface MoneyParts {
  /** The fully formatted string */
  formatted: string
  /** Individual parts parsed from the formatted string (precision-safe) */
  parts: Array<{ type: string; value: string }>
  /** Whether the value is negative */
  isNegative: boolean
  /** Whether the value is zero */
  isZero: boolean
  /** The original Money instance */
  money: MoneyInstance
}

export interface MoneyDisplayProps {
  /** The Money instance to display */
  value: MoneyInstance | string | null | undefined

  /** Display locale (default: "en-US") */
  locale?: string

  /** Use compact notation (e.g., $1M instead of $1,000,000) */
  compact?: boolean

  /** Maximum number of decimal places */
  maxDecimals?: number | bigint

  /** Minimum number of decimal places */
  minDecimals?: number | bigint

  /** Preferred fractional unit for crypto (e.g., "sat" for BTC) */
  preferredUnit?: string

  /** Use fractional unit symbol (e.g., "§10K" instead of "10K sats") */
  preferFractionalSymbol?: boolean

  /** Exclude currency symbol/code from output */
  excludeCurrency?: boolean

  /** Sign display mode */
  showSign?: 'always' | 'negative' | 'never'

  /** CSS class name */
  className?: string

  /** Inline styles */
  style?: React.CSSProperties

  /** Element type to render (default: "span") */
  as?: React.ElementType

  /** Content to show when value is null/undefined */
  placeholder?: ReactNode

  /** Custom render function for full control over rendering */
  children?: (parts: MoneyParts) => ReactNode
}

/**
 * Coerce a value to a Money instance
 */
function toMoney(value: MoneyInstance | string | null | undefined): MoneyInstance | null {
  if (value == null) return null
  if (typeof value === 'string') {
    try {
      return Money(value) as MoneyInstance
    } catch {
      return null
    }
  }
  return value
}

/**
 * Parse a formatted money string into parts.
 * This preserves full precision by parsing the string output from Money.toString()
 * rather than converting to JavaScript Number.
 */
function parseFormattedParts(formatted: string): Array<{ type: string; value: string }> {
  const parts: Array<{ type: string; value: string }> = []
  let remaining = formatted
  let i = 0

  while (i < remaining.length) {
    const char = remaining[i]

    // Minus sign
    if (char === '-') {
      parts.push({ type: 'minusSign', value: '-' })
      i++
      continue
    }

    // Plus sign
    if (char === '+') {
      parts.push({ type: 'plusSign', value: '+' })
      i++
      continue
    }

    // Digits (collect consecutive digits as integer or fraction based on context)
    if (/\d/.test(char)) {
      let digits = ''
      while (i < remaining.length && /\d/.test(remaining[i])) {
        digits += remaining[i]
        i++
      }
      // Determine if this is integer or fraction based on whether we've seen a decimal
      const hasDecimalBefore = parts.some(p => p.type === 'decimal')
      parts.push({ type: hasDecimalBefore ? 'fraction' : 'integer', value: digits })
      continue
    }

    // Decimal separator (period or comma depending on locale)
    if (char === '.' || char === ',') {
      // Check if this is a decimal or group separator
      // If followed by exactly 3 digits and more content, likely group separator
      // If followed by digits at end or non-digit, likely decimal
      const afterChar = remaining.slice(i + 1)
      const nextDigits = afterChar.match(/^(\d+)/)

      if (nextDigits && nextDigits[1].length === 3 && afterChar.length > 3 && /[\d,.]/.test(afterChar[3])) {
        // Likely a group separator (thousands)
        parts.push({ type: 'group', value: char })
      } else {
        // Likely a decimal separator
        parts.push({ type: 'decimal', value: char })
      }
      i++
      continue
    }

    // Whitespace
    if (/\s/.test(char)) {
      let ws = ''
      while (i < remaining.length && /\s/.test(remaining[i])) {
        ws += remaining[i]
        i++
      }
      parts.push({ type: 'literal', value: ws })
      continue
    }

    // Currency symbols and other characters
    // Collect consecutive non-digit, non-separator characters as currency
    let other = ''
    while (i < remaining.length && !/[\d.,\s+-]/.test(remaining[i])) {
      other += remaining[i]
      i++
    }
    if (other) {
      parts.push({ type: 'currency', value: other })
    }
  }

  return parts
}

/**
 * Get formatted parts from a Money value.
 * Uses Money.toString() for precision-safe formatting, then parses into parts.
 */
function getMoneyParts(
  money: MoneyInstance,
  options: MoneyFormatOptions,
  showSign: 'always' | 'negative' | 'never'
): MoneyParts {
  const formatted = money.toString(options)
  const isNegative = money.isNegative()
  const isZero = money.isZero()

  // Handle sign display
  let finalFormatted = formatted
  if (showSign === 'always' && !isNegative && !isZero) {
    finalFormatted = `+${formatted}`
  } else if (showSign === 'never' && isNegative) {
    finalFormatted = formatted.replace(/^-/, '')
  }

  // Parse the formatted string into parts (preserves full precision)
  const parts = parseFormattedParts(finalFormatted)

  return {
    formatted: finalFormatted,
    parts,
    isNegative,
    isZero,
    money,
  }
}

/**
 * Display a Money value with formatting options.
 *
 * @example
 * // Basic usage
 * <MoneyDisplay value={Money("$1234.56")} />
 * // → "$1,234.56"
 *
 * @example
 * // Compact notation
 * <MoneyDisplay value={Money("$1500000")} compact />
 * // → "$1.5M"
 *
 * @example
 * // Custom parts rendering
 * <MoneyDisplay value={Money("$99.99")}>
 *   {({ parts }) => (
 *     <span>
 *       {parts.map((p, i) => (
 *         <span key={i} className={p.type}>{p.value}</span>
 *       ))}
 *     </span>
 *   )}
 * </MoneyDisplay>
 */
export function MoneyDisplay({
  value,
  locale,
  compact,
  maxDecimals,
  minDecimals,
  preferredUnit,
  preferFractionalSymbol,
  excludeCurrency,
  showSign = 'negative',
  className,
  style,
  as: Component = 'span',
  placeholder,
  children,
  ...rest
}: MoneyDisplayProps & React.HTMLAttributes<HTMLElement>): ReactNode {
  const money = useMemo(() => toMoney(value), [value])

  const formatOptions: MoneyFormatOptions = useMemo(
    () => ({
      locale,
      compact,
      maxDecimals,
      minDecimals,
      preferredUnit,
      preferFractionalSymbol,
      excludeCurrency,
    }),
    [locale, compact, maxDecimals, minDecimals, preferredUnit, preferFractionalSymbol, excludeCurrency]
  )

  const parts = useMemo(() => {
    if (!money) return null
    return getMoneyParts(money, formatOptions, showSign)
  }, [money, formatOptions, showSign])

  // Handle null/undefined value
  if (!money || !parts) {
    if (placeholder != null) {
      return <Component className={className} style={style} {...rest}>{placeholder}</Component>
    }
    return null
  }

  // Custom render via children function
  if (children) {
    return <Component className={className} style={style} {...rest}>{children(parts)}</Component>
  }

  // Default render
  return (
    <Component className={className} style={style} {...rest}>
      {parts.formatted}
    </Component>
  )
}
