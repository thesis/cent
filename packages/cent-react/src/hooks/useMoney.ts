import { Money, MoneyClass } from '@thesis-co/cent'
import { useCallback, useMemo, useState } from 'react'

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

export interface UseMoneyOptions {
  /** Initial Money value */
  initialValue?: MoneyInstance | string | null

  /** Currency for parsing string inputs */
  currency?: string

  /** Minimum allowed value for validation */
  min?: MoneyInstance | string

  /** Maximum allowed value for validation */
  max?: MoneyInstance | string
}

export interface UseMoneyReturn {
  /** Current Money value */
  money: MoneyInstance | null

  /** Set Money value from various inputs */
  setMoney: (value: MoneyInstance | string | number | null) => void

  /** Format the current value */
  format: (options?: MoneyFormatOptions) => string

  /** Whether the current value is valid */
  isValid: boolean

  /** Current validation error, if any */
  error: Error | null

  /** Reset to initial value */
  reset: () => void

  /** Clear the value */
  clear: () => void

  /**
   * Props to spread on a native input element
   * @example
   * const { inputProps } = useMoney({ currency: 'USD' })
   * <input {...inputProps} />
   */
  inputProps: {
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onBlur: () => void
  }
}

/**
 * Parse a value to Money
 */
function parseMoney(value: MoneyInstance | string | number | null, currency?: string): MoneyInstance | null {
  if (value == null) return null

  if (typeof value === 'object' && 'currency' in value) {
    // Already a Money instance
    return value as MoneyInstance
  }

  if (typeof value === 'number') {
    if (!currency) {
      throw new Error('Currency is required when setting from a number')
    }
    // Convert number to string to preserve precision
    return Money(`${value} ${currency}`) as MoneyInstance
  }

  if (typeof value === 'string') {
    if (!value.trim()) return null

    // Try parsing with embedded currency
    const result = MoneyClass.parse(value)
    if (result.ok) {
      return result.value
    }

    // Try parsing as number with provided currency
    if (currency) {
      const cleaned = value.replace(/[,\s]/g, '')
      const numMatch = cleaned.match(/^-?[\d.]+$/)
      if (numMatch) {
        // Pass as string to preserve precision
        return Money(`${cleaned} ${currency}`) as MoneyInstance
      }
    }

    return null
  }

  return null
}

/**
 * Validate Money against constraints
 */
function validateMoney(
  money: MoneyInstance | null,
  min?: MoneyInstance | string,
  max?: MoneyInstance | string
): Error | null {
  if (!money) return null

  try {
    if (min) {
      const minMoney = typeof min === 'string' ? (Money(min) as MoneyInstance) : min
      if (money.lessThan(minMoney)) {
        return new Error(`Value must be at least ${minMoney.toString()}`)
      }
    }

    if (max) {
      const maxMoney = typeof max === 'string' ? (Money(max) as MoneyInstance) : max
      if (money.greaterThan(maxMoney)) {
        return new Error(`Value must be at most ${maxMoney.toString()}`)
      }
    }
  } catch (e) {
    // Currency mismatch or other error
    return e instanceof Error ? e : new Error('Validation error')
  }

  return null
}

/**
 * Hook for managing Money state with validation.
 *
 * @example
 * // Basic usage
 * const { money, setMoney, format } = useMoney({ currency: 'USD' })
 *
 * @example
 * // With validation
 * const { money, isValid, error } = useMoney({
 *   currency: 'USD',
 *   min: '$0.01',
 *   max: '$1000'
 * })
 *
 * @example
 * // With native input binding
 * const { inputProps } = useMoney({ currency: 'USD' })
 * <input {...inputProps} />
 */
export function useMoney(options: UseMoneyOptions = {}): UseMoneyReturn {
  const { initialValue, currency, min, max } = options

  const [money, setMoneyState] = useState<MoneyInstance | null>(() => {
    if (initialValue == null) return null
    try {
      return parseMoney(initialValue, currency)
    } catch {
      return null
    }
  })

  const [displayValue, setDisplayValue] = useState(() => {
    return money?.toString({ excludeCurrency: true }) ?? ''
  })

  // Validation
  const error = useMemo(() => validateMoney(money, min, max), [money, min, max])
  const isValid = error === null

  // Set money from various inputs
  const setMoney = useCallback(
    (value: MoneyInstance | string | number | null) => {
      try {
        const parsed = parseMoney(value, currency)
        setMoneyState(parsed)
        setDisplayValue(parsed?.toString({ excludeCurrency: true }) ?? '')
      } catch {
        setMoneyState(null)
        setDisplayValue('')
      }
    },
    [currency]
  )

  // Format the current value
  const format = useCallback(
    (formatOptions?: MoneyFormatOptions) => {
      if (!money) return ''
      return money.toString(formatOptions)
    },
    [money]
  )

  // Reset to initial value
  const reset = useCallback(() => {
    try {
      const initial = initialValue != null ? parseMoney(initialValue, currency) : null
      setMoneyState(initial)
      setDisplayValue(initial?.toString({ excludeCurrency: true }) ?? '')
    } catch {
      setMoneyState(null)
      setDisplayValue('')
    }
  }, [initialValue, currency])

  // Clear the value
  const clear = useCallback(() => {
    setMoneyState(null)
    setDisplayValue('')
  }, [])

  // Input props for native input binding
  const inputProps = useMemo(
    () => ({
      value: displayValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value
        setDisplayValue(raw)

        if (!raw.trim()) {
          setMoneyState(null)
          return
        }

        try {
          const parsed = parseMoney(raw, currency)
          setMoneyState(parsed)
        } catch {
          // Keep display value but don't update money
        }
      },
      onBlur: () => {
        // Format on blur
        if (money) {
          setDisplayValue(money.toString({ excludeCurrency: true }))
        }
      },
    }),
    [displayValue, currency, money]
  )

  return {
    money,
    setMoney,
    format,
    isValid,
    error,
    reset,
    clear,
    inputProps,
  }
}
