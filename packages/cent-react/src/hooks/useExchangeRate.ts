import { type ExchangeRate, MoneyClass } from '@thesis-co/cent'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMoneyContext } from '../context/MoneyProvider'

/** Type alias for Money instance */
type MoneyInstance = InstanceType<typeof MoneyClass>

export interface UseExchangeRateOptions {
  /** Base currency code */
  from: string

  /** Quote currency code */
  to: string

  /** Auto-refresh interval in milliseconds (0 = disabled) */
  pollInterval?: number

  /** Time in ms after which rate is considered stale */
  staleThreshold?: number

  /** Whether to enable fetching (default: true) */
  enabled?: boolean
}

export interface UseExchangeRateReturn {
  /** Current exchange rate */
  rate: ExchangeRate | null

  /** Whether a fetch is in progress */
  isLoading: boolean

  /** Whether the rate is stale */
  isStale: boolean

  /** Error from the last fetch attempt */
  error: Error | null

  /** Time since last successful fetch in ms */
  age: number

  /** Convert a Money value using the current rate */
  convert: (money: MoneyInstance) => MoneyInstance | null

  /** Manually trigger a refetch */
  refetch: () => Promise<void>
}

/**
 * Hook for fetching and managing exchange rates.
 *
 * Uses the exchangeRateResolver from MoneyProvider context.
 *
 * @example
 * // Basic usage
 * const { rate, convert, isLoading } = useExchangeRate({
 *   from: 'USD',
 *   to: 'EUR'
 * })
 *
 * const eurAmount = convert(usdAmount)
 *
 * @example
 * // With polling
 * const { rate, isStale, refetch } = useExchangeRate({
 *   from: 'BTC',
 *   to: 'USD',
 *   pollInterval: 30000, // 30 seconds
 *   staleThreshold: 60000 // 1 minute
 * })
 */
export function useExchangeRate(options: UseExchangeRateOptions): UseExchangeRateReturn {
  const { from, to, pollInterval = 0, staleThreshold = 300000, enabled = true } = options

  const { exchangeRateResolver } = useMoneyContext()

  const [rate, setRate] = useState<ExchangeRate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null)
  const [age, setAge] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch the exchange rate
  const fetchRate = useCallback(async () => {
    if (!exchangeRateResolver) {
      setError(new Error('No exchange rate resolver configured in MoneyProvider'))
      return
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const result = await exchangeRateResolver(from, to)
      setRate(result)
      setLastFetchTime(Date.now())
      setError(null)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        // Ignore abort errors
        return
      }
      setError(e instanceof Error ? e : new Error('Failed to fetch exchange rate'))
    } finally {
      setIsLoading(false)
    }
  }, [exchangeRateResolver, from, to])

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      if (exchangeRateResolver) {
        fetchRate()
      } else {
        // Set error when no resolver is configured
        setError(new Error('No exchange rate resolver configured in MoneyProvider'))
      }
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [enabled, exchangeRateResolver, from, to, fetchRate])

  // Polling
  useEffect(() => {
    if (!enabled || pollInterval <= 0) {
      return
    }

    const intervalId = setInterval(fetchRate, pollInterval)
    return () => clearInterval(intervalId)
  }, [enabled, pollInterval, fetchRate])

  // Update age
  useEffect(() => {
    if (!lastFetchTime) {
      setAge(0)
      return
    }

    const updateAge = () => {
      setAge(Date.now() - lastFetchTime)
    }

    updateAge()
    const intervalId = setInterval(updateAge, 1000)
    return () => clearInterval(intervalId)
  }, [lastFetchTime])

  // Calculate staleness
  const isStale = lastFetchTime ? age > staleThreshold : false

  // Convert function
  const convert = useCallback(
    (money: MoneyInstance): MoneyInstance | null => {
      if (!rate) return null

      try {
        // Use the ExchangeRate's convert method if available
        if ('convert' in rate && typeof rate.convert === 'function') {
          return rate.convert(money) as MoneyInstance
        }

        // Fallback: manual conversion
        // This assumes the rate is a simple numeric multiplier
        if ('rate' in rate) {
          const rateValue = rate.rate
          return money.multiply(rateValue.toString()) as MoneyInstance
        }

        return null
      } catch {
        return null
      }
    },
    [rate]
  )

  return {
    rate,
    isLoading,
    isStale,
    error,
    age,
    convert,
    refetch: fetchRate,
  }
}
