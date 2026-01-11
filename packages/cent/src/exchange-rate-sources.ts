import type { ExchangeRate } from "./exchange-rates"
import type { Currency, UNIXTime } from "./types"

/**
 * Metadata about an exchange rate source
 */
export interface ExchangeRateSource {
  /** Human-readable name of the source */
  readonly name: string

  /** Priority level (lower numbers = higher priority) */
  readonly priority: number

  /** Reliability score between 0 and 1 */
  readonly reliability: number
}

/**
 * Interface for exchange rate providers
 */
export interface ExchangeRateProvider {
  /**
   * Get exchange rate between two currencies
   * @param from - Source currency
   * @param to - Target currency
   * @returns Promise resolving to an exchange rate
   */
  getRate(from: Currency, to: Currency): Promise<ExchangeRate>

  /**
   * Get the name of this provider
   * @returns Provider name
   */
  getName(): string

  /**
   * Get the priority of this provider
   * @returns Priority level (lower = higher priority)
   */
  getPriority(): number

  /**
   * Get the reliability score of this provider
   * @returns Reliability between 0 and 1
   */
  getReliability(): number
}

/**
 * Configuration for exchange rate staleness detection
 */
export interface RateStalenessConfig {
  /** Maximum age in milliseconds before a rate is considered stale */
  maxAge: number

  /** Grace period in milliseconds for rate updates */
  gracePeriod?: number
}

/**
 * Check if a rate is stale based on its timestamp
 * @param timestamp - Rate timestamp
 * @param config - Staleness configuration
 * @returns Whether the rate is stale
 */
export function isRateStale(
  timestamp: string | UNIXTime,
  config: RateStalenessConfig,
): boolean {
  const now = Date.now()
  const rateTime =
    typeof timestamp === "string"
      ? parseInt(timestamp, 10)
      : parseInt(timestamp, 10)
  const age = now - rateTime

  return age > config.maxAge
}

/**
 * Compare two exchange rate sources by priority and reliability
 * @param a - First source
 * @param b - Second source
 * @returns Comparison result (negative if a is better, positive if b is better)
 */
export function compareSources(
  a: ExchangeRateSource,
  b: ExchangeRateSource,
): number {
  // First compare by priority (lower is better)
  if (a.priority !== b.priority) {
    return a.priority - b.priority
  }

  // If priorities are equal, compare by reliability (higher is better)
  return b.reliability - a.reliability
}

/**
 * Filter sources by minimum reliability threshold
 * @param sources - Array of sources to filter
 * @param minReliability - Minimum reliability threshold
 * @returns Filtered sources
 */
export function filterByReliability(
  sources: ExchangeRateSource[],
  minReliability: number,
): ExchangeRateSource[] {
  return sources.filter((source) => source.reliability >= minReliability)
}

/**
 * Sort sources by priority and reliability
 * @param sources - Array of sources to sort
 * @returns Sorted sources (best first)
 */
export function sortSources(
  sources: ExchangeRateSource[],
): ExchangeRateSource[] {
  return [...sources].sort(compareSources)
}
