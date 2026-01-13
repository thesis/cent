import { Money, MoneyClass, FixedPointNumber } from '@thesis-co/cent'
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
 * Render props for MoneyDiff custom rendering
 */
export interface MoneyDiffRenderProps {
  /** The current value */
  current: MoneyInstance
  /** The comparison value */
  compareTo: MoneyInstance
  /** The difference (current - compareTo) */
  difference: MoneyInstance
  /** Percentage change as string for precision (null if compareTo is zero) */
  percentageChange: string | null
  /** Direction of change */
  direction: 'increase' | 'decrease' | 'unchanged'
  /** Formatted strings */
  formatted: {
    current: string
    compareTo: string
    difference: string
    percentage: string
  }
}

export interface MoneyDiffProps {
  /** Current/new value */
  value: MoneyInstance | string

  /** Value to compare against (previous/baseline) */
  compareTo: MoneyInstance | string

  /** Formatting options */
  formatOptions?: MoneyFormatOptions

  /** Show percentage change */
  showPercentage?: boolean

  /** Number of decimal places for percentage */
  percentageDecimals?: number

  /** CSS class name */
  className?: string

  /** Inline styles */
  style?: React.CSSProperties

  /** Element type to render (default: "span") */
  as?: React.ElementType

  /** Custom render function */
  children?: (props: MoneyDiffRenderProps) => ReactNode
}

/**
 * Coerce a value to Money
 */
function toMoney(value: MoneyInstance | string): MoneyInstance {
  if (typeof value === 'string') {
    return Money(value) as MoneyInstance
  }
  return value
}

/**
 * Calculate percentage change using FixedPointNumber for precision.
 * Returns the percentage as a string to preserve precision.
 */
function calculatePercentageChange(current: MoneyInstance, compareTo: MoneyInstance, decimals: number): string | null {
  if (compareTo.isZero()) {
    return null
  }

  try {
    // (current - compareTo) / |compareTo| * 100
    const diff = current.subtract(compareTo)
    const diffStr = diff.toString({ excludeCurrency: true }).replace(/,/g, '')
    const compareStr = compareTo.absolute().toString({ excludeCurrency: true }).replace(/,/g, '')

    const diffFP = FixedPointNumber.fromDecimalString(diffStr)
    const compareFP = FixedPointNumber.fromDecimalString(compareStr)

    if (compareFP.amount === 0n) return null

    // Align to same decimal scale
    const maxDecimals = diffFP.decimals > compareFP.decimals ? diffFP.decimals : compareFP.decimals
    const diffScaled = diffFP.amount * 10n ** (maxDecimals - diffFP.decimals)
    const compareScaled = compareFP.amount * 10n ** (maxDecimals - compareFP.decimals)

    // For percentage with N decimal places, we need extra precision
    // percentage = (diff / compare) * 100
    // We compute: (diff * 100 * 10^(decimals+1)) / compare, then round
    const extraPrecision = BigInt(decimals + 1)
    const multiplier = 100n * 10n ** extraPrecision

    const rawResult = (diffScaled * multiplier) / compareScaled

    // Create a FixedPointNumber with the result and use its toString for formatting
    const resultFP = new FixedPointNumber(rawResult, extraPrecision)

    // Normalize to desired decimals (truncating extra precision)
    const targetFP = new FixedPointNumber(0n, BigInt(decimals))
    const normalizedFP = resultFP.normalize(targetFP, true) // unsafe=true to allow truncation

    return normalizedFP.toString()
  } catch {
    return null
  }
}

/**
 * Format percentage string with sign
 */
function formatPercentage(value: string | null): string {
  if (value === null) return ''

  const isNegative = value.startsWith('-')
  const isZero = value.replace(/[^1-9]/g, '') === ''
  const absValue = isNegative ? value.slice(1) : value

  if (isZero) {
    return `${absValue}%`
  } else if (isNegative) {
    return `-${absValue}%`
  } else {
    return `+${absValue}%`
  }
}

/**
 * Display the difference between two Money values.
 *
 * @example
 * // Basic usage
 * <MoneyDiff value={Money("$120")} compareTo={Money("$100")} />
 * // → "+$20.00"
 *
 * @example
 * // With percentage
 * <MoneyDiff
 *   value={Money("$120")}
 *   compareTo={Money("$100")}
 *   showPercentage
 * />
 * // → "+$20.00 (+20.00%)"
 *
 * @example
 * // Custom rendering
 * <MoneyDiff value={newPrice} compareTo={oldPrice}>
 *   {({ direction, formatted }) => (
 *     <span className={direction}>
 *       {formatted.difference}
 *     </span>
 *   )}
 * </MoneyDiff>
 */
export function MoneyDiff({
  value,
  compareTo,
  formatOptions,
  showPercentage = false,
  percentageDecimals = 2,
  className,
  style,
  as: Component = 'span',
  children,
  ...rest
}: MoneyDiffProps & React.HTMLAttributes<HTMLElement>): ReactNode {
  const renderProps = useMemo<MoneyDiffRenderProps>(() => {
    const current = toMoney(value)
    const compare = toMoney(compareTo)
    const difference = current.subtract(compare)

    const percentageChange = calculatePercentageChange(current, compare, percentageDecimals)

    let direction: 'increase' | 'decrease' | 'unchanged'
    if (difference.isPositive()) {
      direction = 'increase'
    } else if (difference.isNegative()) {
      direction = 'decrease'
    } else {
      direction = 'unchanged'
    }

    // Format the difference with sign
    const absDiff = difference.absolute()
    const diffFormatted = absDiff.toString(formatOptions)
    const signedDiff =
      direction === 'increase'
        ? `+${diffFormatted}`
        : direction === 'decrease'
          ? `-${diffFormatted}`
          : diffFormatted

    return {
      current,
      compareTo: compare,
      difference,
      percentageChange,
      direction,
      formatted: {
        current: current.toString(formatOptions),
        compareTo: compare.toString(formatOptions),
        difference: signedDiff,
        percentage: formatPercentage(percentageChange),
      },
    }
  }, [value, compareTo, formatOptions, percentageDecimals])

  // Custom render
  if (children) {
    return (
      <Component className={className} style={style} {...rest}>
        {children(renderProps)}
      </Component>
    )
  }

  // Default render
  const { formatted, direction } = renderProps
  const displayText = showPercentage
    ? `${formatted.difference} (${formatted.percentage})`
    : formatted.difference

  return (
    <Component className={className} style={style} data-direction={direction} {...rest}>
      {displayText}
    </Component>
  )
}
