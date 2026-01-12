import { Money, MoneyClass } from '@thesis-co/cent'
import {
  type InputHTMLAttributes,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

/** Type alias for Money instance */
type MoneyInstance = InstanceType<typeof MoneyClass>

/**
 * Change event for MoneyInput, compatible with react-hook-form and formik
 */
export interface MoneyInputChangeEvent {
  target: {
    name: string
    value: MoneyInstance | null
  }
}

/**
 * Blur event for MoneyInput
 */
export interface MoneyInputBlurEvent {
  target: {
    name: string
    value: MoneyInstance | null
  }
}

export interface MoneyInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'onBlur' | 'type' | 'defaultValue' | 'min' | 'max'
  > {
  /** Current Money value (controlled) */
  value?: MoneyInstance | null

  /** Field name - required for form integration */
  name: string

  /** Currency for parsing input (required) */
  currency: string

  /**
   * onChange handler - designed for form library compatibility
   *
   * For react-hook-form:
   *   <Controller render={({ field }) => <MoneyInput {...field} />} />
   *
   * For formik:
   *   <Field name="amount" as={MoneyInput} />
   */
  onChange?: (event: MoneyInputChangeEvent) => void

  /** Alternative: direct value handler */
  onValueChange?: (value: MoneyInstance | null) => void

  /** Blur handler */
  onBlur?: (event: MoneyInputBlurEvent) => void

  /** Minimum allowed value */
  min?: MoneyInstance | string

  /** Maximum allowed value */
  max?: MoneyInstance | string

  /** Format the display on blur (default: true) */
  formatOnBlur?: boolean

  /** Display locale for formatting */
  locale?: string

  /** Allow negative values (default: true) */
  allowNegative?: boolean

  /** Select all text on focus (default: true) */
  selectOnFocus?: boolean
}

/**
 * Parse a string input to Money, with fallback to currency
 */
function parseInput(input: string, currency: string, allowNegative: boolean): MoneyInstance | null {
  if (!input.trim()) {
    return null
  }

  try {
    // Try parsing with currency prefix/suffix
    const result = MoneyClass.parse(input)
    if (result.ok) {
      const money = result.value
      if (!allowNegative && money.isNegative()) {
        return money.absolute()
      }
      return money
    }

    // Try parsing as a plain number with the specified currency
    const cleaned = input.replace(/[,\s]/g, '')
    const numMatch = cleaned.match(/^-?[\d.]+$/)
    if (numMatch) {
      // Pass as string to preserve precision
      const money = Money(`${cleaned} ${currency}`) as MoneyInstance
      if (!allowNegative && money.isNegative()) {
        return money.absolute()
      }
      return money
    }

    return null
  } catch {
    return null
  }
}

/**
 * Format Money for display in the input
 */
function formatForDisplay(money: MoneyInstance | null, locale?: string): string {
  if (!money) return ''
  return money.toString({
    locale,
    excludeCurrency: true,
  })
}

/**
 * A controlled money input component compatible with react-hook-form and formik.
 *
 * @example
 * // Basic usage
 * const [amount, setAmount] = useState<Money | null>(null);
 * <MoneyInput
 *   name="amount"
 *   value={amount}
 *   onChange={(e) => setAmount(e.target.value)}
 *   currency="USD"
 * />
 *
 * @example
 * // With react-hook-form
 * <Controller
 *   name="amount"
 *   control={control}
 *   render={({ field }) => (
 *     <MoneyInput {...field} currency="USD" />
 *   )}
 * />
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  {
    value,
    name,
    currency,
    onChange,
    onValueChange,
    onBlur,
    min,
    max,
    formatOnBlur = true,
    locale,
    allowNegative = true,
    selectOnFocus = true,
    placeholder,
    disabled,
    className,
    style,
    ...rest
  },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => inputRef.current!)

  // Track whether we're currently editing
  const [isEditing, setIsEditing] = useState(false)
  const [displayValue, setDisplayValue] = useState(() => formatForDisplay(value ?? null, locale))

  // Sync display value with controlled value when not editing
  // Only sync if value is explicitly controlled (not undefined)
  useEffect(() => {
    if (!isEditing && value !== undefined) {
      setDisplayValue(formatForDisplay(value, locale))
    }
  }, [value, isEditing, locale])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      setDisplayValue(raw)

      const parsed = parseInput(raw, currency, allowNegative)

      // Validate min/max
      let validatedValue = parsed
      if (validatedValue) {
        try {
          if (min) {
            const minMoney = typeof min === 'string' ? (Money(min) as MoneyInstance) : min
            if (validatedValue.lessThan(minMoney)) {
              // Allow the input but mark as invalid (validation is external)
            }
          }
          if (max) {
            const maxMoney = typeof max === 'string' ? (Money(max) as MoneyInstance) : max
            if (validatedValue.greaterThan(maxMoney)) {
              // Allow the input but mark as invalid (validation is external)
            }
          }
        } catch {
          // Ignore validation errors for mismatched currencies
        }
      }

      if (onChange) {
        onChange({ target: { name, value: validatedValue } })
      }
      if (onValueChange) {
        onValueChange(validatedValue)
      }
    },
    [currency, allowNegative, min, max, name, onChange, onValueChange]
  )

  const handleFocus = useCallback(
    (_e: React.FocusEvent<HTMLInputElement>) => {
      setIsEditing(true)

      // Show raw value for editing (without formatting)
      if (value) {
        const rawValue = value.toString({ excludeCurrency: true })
        // Remove thousand separators for easier editing
        setDisplayValue(rawValue.replace(/,/g, ''))
      }

      if (selectOnFocus) {
        // Use setTimeout to ensure the value is set before selecting
        setTimeout(() => {
          inputRef.current?.select()
        }, 0)
      }
    },
    [value, selectOnFocus]
  )

  const handleBlur = useCallback(
    (_e: React.FocusEvent<HTMLInputElement>) => {
      setIsEditing(false)

      // Format on blur if enabled
      if (formatOnBlur && value) {
        setDisplayValue(formatForDisplay(value, locale))
      }

      if (onBlur) {
        onBlur({ target: { name, value: value ?? null } })
      }
    },
    [formatOnBlur, value, locale, name, onBlur]
  )

  return (
    <input
      {...rest}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      name={name}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      style={style}
      aria-invalid={undefined} // Let parent handle validation state
    />
  )
})
