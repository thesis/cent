/**
 * Global configuration for the cent library.
 *
 * @example
 * import { configure, Round } from '@thesis-co/cent';
 *
 * // Configure based on environment
 * configure({
 *   numberInputMode: process.env.NODE_ENV === 'production' ? 'error' : 'warn',
 *   strictPrecision: process.env.NODE_ENV === 'production',
 *   defaultRoundingMode: Round.HALF_UP,
 * });
 */

import type { RoundingMode } from "./types"

/**
 * Configuration options for the cent library.
 */
export interface CentConfig {
  /**
   * How to handle JavaScript number inputs.
   * - `'warn'`: Log a console warning for potentially imprecise numbers (default)
   * - `'error'`: Throw an error for potentially imprecise numbers
   * - `'silent'`: Allow all numbers without warning
   * - `'never'`: Throw an error for ANY number input (use strings or bigints instead)
   */
  numberInputMode: "warn" | "error" | "silent" | "never"

  /**
   * Number of decimal places beyond which to warn about precision loss.
   * Default is 15 (approximate limit of JS number precision).
   */
  precisionWarningThreshold: number

  /**
   * Default rounding mode for operations that require rounding.
   * Set to `'none'` to disable default rounding (operations that would
   * lose precision will throw instead).
   */
  defaultRoundingMode: RoundingMode | "none"

  /**
   * Default currency code when none is specified.
   * Default is `'USD'`.
   */
  defaultCurrency: string

  /**
   * Default locale for formatting.
   * Default is `'en-US'`.
   */
  defaultLocale: string

  /**
   * When true, throw on any operation that would lose precision.
   * This is stricter than `defaultRoundingMode: 'none'` as it applies
   * to all operations, not just those that would normally round.
   */
  strictPrecision: boolean
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: CentConfig = {
  numberInputMode: "warn",
  precisionWarningThreshold: 15,
  defaultRoundingMode: "none",
  defaultCurrency: "USD",
  defaultLocale: "en-US",
  strictPrecision: false,
}

/**
 * Current global configuration.
 */
let currentConfig: CentConfig = { ...DEFAULT_CONFIG }

// Conditionally load AsyncLocalStorage for async-safe withConfig in Node.js
// In browsers, falls back to synchronous save/restore
type AsyncLocalStorageType = import("node:async_hooks").AsyncLocalStorage<CentConfig>
let asyncLocalStorage: AsyncLocalStorageType | undefined
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AsyncLocalStorage } = require("node:async_hooks") as typeof import("node:async_hooks")
  asyncLocalStorage = new AsyncLocalStorage()
} catch {
  // Browser or environment without async_hooks — fall back to save/restore
}

/**
 * Configure global defaults for the cent library.
 *
 * Call this once at application startup to set library-wide behavior.
 * Partial configuration is supported - only specified options are changed.
 *
 * @param options - Configuration options to set
 *
 * @example
 * // Production configuration
 * configure({
 *   numberInputMode: 'error',
 *   strictPrecision: true,
 * });
 *
 * @example
 * // Development configuration
 * configure({
 *   numberInputMode: 'warn',
 *   strictPrecision: false,
 * });
 *
 * @example
 * // Environment-based configuration
 * configure({
 *   numberInputMode: process.env.NODE_ENV === 'production' ? 'error' : 'warn',
 *   strictPrecision: process.env.NODE_ENV === 'production',
 * });
 */
export function configure(options: Partial<CentConfig>): void {
  currentConfig = { ...currentConfig, ...options }
}

/**
 * Get the current configuration.
 *
 * @returns A copy of the current configuration
 *
 * @example
 * const config = getConfig();
 * console.log(config.defaultCurrency); // 'USD'
 */
export function getConfig(): CentConfig {
  const store = asyncLocalStorage?.getStore()
  return { ...(store ?? currentConfig) }
}

/**
 * Reset configuration to default values.
 *
 * Useful for testing or when you need to restore original behavior.
 *
 * @example
 * resetConfig();
 */
export function resetConfig(): void {
  currentConfig = { ...DEFAULT_CONFIG }
}

/**
 * Execute a function with temporary configuration overrides.
 *
 * The configuration is restored after the function completes,
 * even if an error is thrown. When AsyncLocalStorage is available (Node.js),
 * concurrent async scopes are isolated from each other.
 *
 * @param options - Temporary configuration options
 * @param fn - Function to execute with the temporary configuration
 * @returns The return value of the function
 *
 * @example
 * // Temporarily use strict mode
 * const result = withConfig({ strictPrecision: true }, () => {
 *   return Money("$100").divide(2);
 * });
 *
 * @example
 * // Useful for testing
 * withConfig({ numberInputMode: 'error' }, () => {
 *   expect(() => Money(0.1, 'USD')).toThrow();
 * });
 */
export function withConfig<T>(options: Partial<CentConfig>, fn: () => T): T {
  const merged = { ...getConfig(), ...options }
  if (asyncLocalStorage) {
    return asyncLocalStorage.run(merged, fn)
  }
  // Browser fallback: sync-safe save/restore
  const prev = { ...currentConfig }
  try {
    currentConfig = merged
    return fn()
  } finally {
    currentConfig = prev
  }
}

/**
 * Get the default configuration values.
 *
 * @returns A copy of the default configuration
 */
export function getDefaultConfig(): CentConfig {
  return { ...DEFAULT_CONFIG }
}
