import { type CentConfig, type ExchangeRate, getConfig } from '@thesis-co/cent'
import { type ReactNode, createContext, useContext, useMemo } from 'react'

/**
 * Function to resolve exchange rates
 */
export type ExchangeRateResolver = (
  from: string,
  to: string
) => Promise<ExchangeRate | null> | ExchangeRate | null

/**
 * Context value for MoneyProvider
 */
export interface MoneyContextValue {
  /** Default locale for formatting */
  locale: string

  /** Default currency for inputs */
  defaultCurrency: string | null

  /** Exchange rate resolver */
  exchangeRateResolver: ExchangeRateResolver | null

  /** Cent library config */
  config: CentConfig
}

/**
 * Props for MoneyProvider
 */
export interface MoneyProviderProps {
  children: ReactNode

  /** Default locale for all money formatting (default: "en-US") */
  locale?: string

  /** Default currency for inputs */
  defaultCurrency?: string

  /** Exchange rate resolver for conversions */
  exchangeRateResolver?: ExchangeRateResolver

  /** Cent library config overrides */
  config?: Partial<CentConfig>
}

const MoneyContext = createContext<MoneyContextValue | null>(null)

/**
 * Provider for default Money configuration.
 *
 * @example
 * // Set defaults for all descendant components
 * <MoneyProvider locale="de-DE" defaultCurrency="EUR">
 *   <App />
 * </MoneyProvider>
 *
 * @example
 * // With exchange rate resolver
 * <MoneyProvider
 *   exchangeRateResolver={async (from, to) => {
 *     const rate = await fetchExchangeRate(from, to)
 *     return new ExchangeRate(from, to, rate)
 *   }}
 * >
 *   <App />
 * </MoneyProvider>
 */
export function MoneyProvider({
  children,
  locale = 'en-US',
  defaultCurrency,
  exchangeRateResolver,
  config: configOverrides,
}: MoneyProviderProps): ReactNode {
  const parentContext = useContext(MoneyContext)

  const contextValue = useMemo<MoneyContextValue>(() => {
    // Get base config from Cent library
    const baseConfig = getConfig()

    // Merge with overrides
    const mergedConfig: CentConfig = configOverrides
      ? { ...baseConfig, ...configOverrides }
      : baseConfig

    return {
      locale: locale ?? parentContext?.locale ?? 'en-US',
      defaultCurrency: defaultCurrency ?? parentContext?.defaultCurrency ?? null,
      exchangeRateResolver: exchangeRateResolver ?? parentContext?.exchangeRateResolver ?? null,
      config: mergedConfig,
    }
  }, [locale, defaultCurrency, exchangeRateResolver, configOverrides, parentContext])

  return <MoneyContext.Provider value={contextValue}>{children}</MoneyContext.Provider>
}

/**
 * Default context value when no provider is present
 */
function getDefaultContextValue(): MoneyContextValue {
  return {
    locale: 'en-US',
    defaultCurrency: null,
    exchangeRateResolver: null,
    config: getConfig(),
  }
}

/**
 * Hook to access the Money context.
 *
 * @example
 * const { locale, defaultCurrency } = useMoneyConfig()
 */
export function useMoneyContext(): MoneyContextValue {
  const context = useContext(MoneyContext)
  return context ?? getDefaultContextValue()
}
