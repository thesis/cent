import { ExchangeRate } from "../src/exchange-rates"
import { Currency, AssetAmount } from "../src/types"
import { Money } from "../src/money"

import { ExchangeRateSource, ExchangeRateProvider } from "../src/exchange-rate-sources"

describe("Exchange Rate Source System", () => {
  const usdCurrency: Currency = {
    name: "US Dollar",
    code: "USD",
    decimals: 2n,
    symbol: "$",
  }

  const eurCurrency: Currency = {
    name: "Euro",
    code: "EUR",
    decimals: 2n,
    symbol: "€",
  }

  const btcCurrency: Currency = {
    name: "Bitcoin",
    code: "BTC",
    decimals: 8n,
    symbol: "₿",
  }

  describe("ExchangeRateSource interface", () => {
    it("should define required properties for rate sources", () => {
      const mockSource: ExchangeRateSource = {
        name: "Coinbase",
        priority: 1,
        reliability: 0.95,
      }

      expect(mockSource.name).toBe("Coinbase")
      expect(mockSource.priority).toBe(1)
      expect(mockSource.reliability).toBe(0.95)
    })

    it("should support different source types", () => {
      const exchangeSources: ExchangeRateSource[] = [
        { name: "Coinbase", priority: 1, reliability: 0.95 },
        { name: "Kraken", priority: 2, reliability: 0.90 },
        { name: "Manual", priority: 3, reliability: 1.0 },
        { name: "Cached", priority: 4, reliability: 0.85 },
      ]

      expect(exchangeSources).toHaveLength(4)
      expect(exchangeSources[0].name).toBe("Coinbase")
      expect(exchangeSources[2].name).toBe("Manual")
    })
  })

  describe("ExchangeRate with source metadata", () => {
    it("should support source metadata", () => {
      const usdAmount: AssetAmount = {
        asset: usdCurrency,
        amount: { amount: 100n, decimals: 2n },
      }
      const eurAmount: AssetAmount = {
        asset: eurCurrency,
        amount: { amount: 85n, decimals: 2n },
      }

      const source: ExchangeRateSource = {
        name: "Coinbase",
        priority: 1,
        reliability: 0.95,
      }

      const rate = new ExchangeRate(usdAmount, eurAmount, "1609459200", source)

      expect(rate.source?.name).toBe("Coinbase")
      expect(rate.source?.priority).toBe(1)
      expect(rate.source?.reliability).toBe(0.95)
      expect(rate.time).toBe("1609459200")
      expect(rate.amounts).toEqual([usdAmount, eurAmount])
    })

    it("should handle stale rate detection", () => {
      const currentTime = Date.now()
      const staleTime = currentTime - 300000 // 5 minutes ago

      const source: ExchangeRateSource = {
        name: "Kraken",
        priority: 2,
        reliability: 0.90,
      }

      const usdAmount: AssetAmount = {
        asset: usdCurrency,
        amount: { amount: 100n, decimals: 2n },
      }
      const btcAmount: AssetAmount = {
        asset: btcCurrency,
        amount: { amount: 200000n, decimals: 8n }, // 0.002 BTC
      }

      const rate = new ExchangeRate(usdAmount, btcAmount, staleTime.toString(), source)

      expect(rate.isStale(60000)).toBe(true) // 1 minute threshold
      expect(rate.source?.name).toBe("Kraken")
    })
  })

  describe("ExchangeRateProvider interface", () => {
    class MockExchangeRateProvider implements ExchangeRateProvider {
      private name: string
      private priority: number
      private reliability: number

      constructor(name: string, priority: number, reliability: number) {
        this.name = name
        this.priority = priority
        this.reliability = reliability
      }

      async getRate(from: Currency, to: Currency): Promise<ExchangeRate> {
        // Mock implementation
        const fromAmount: AssetAmount = {
          asset: from,
          amount: { amount: 100n, decimals: from.decimals },
        }
        const toAmount: AssetAmount = {
          asset: to,
          amount: { amount: 85n, decimals: to.decimals },
        }

        const source: ExchangeRateSource = {
          name: this.name,
          priority: this.priority,
          reliability: this.reliability,
        }

        return new ExchangeRate(fromAmount, toAmount, Date.now().toString(), source)
      }

      getName(): string {
        return this.name
      }

      getPriority(): number {
        return this.priority
      }

      getReliability(): number {
        return this.reliability
      }
    }

    it("should implement provider interface correctly", async () => {
      const provider = new MockExchangeRateProvider("TestExchange", 1, 0.95)

      expect(provider.getName()).toBe("TestExchange")
      expect(provider.getPriority()).toBe(1)
      expect(provider.getReliability()).toBe(0.95)

      const rate = await provider.getRate(usdCurrency, eurCurrency)
      expect(rate.source?.name).toBe("TestExchange")
      expect(rate.isStale(60000)).toBe(false)
    })

    it("should handle different provider priorities", async () => {
      const providers = [
        new MockExchangeRateProvider("Primary", 1, 0.95),
        new MockExchangeRateProvider("Secondary", 2, 0.90),
        new MockExchangeRateProvider("Fallback", 3, 0.85),
      ]

      const rates = await Promise.all(
        providers.map(p => p.getRate(usdCurrency, eurCurrency))
      )

      expect(rates[0].source?.priority).toBe(1)
      expect(rates[1].source?.priority).toBe(2)
      expect(rates[2].source?.priority).toBe(3)
    })

    it("should support multiple currency pairs", async () => {
      const provider = new MockExchangeRateProvider("MultiCurrency", 1, 0.95)

      const usdEurRate = await provider.getRate(usdCurrency, eurCurrency)
      const btcUsdRate = await provider.getRate(btcCurrency, usdCurrency)

      expect(usdEurRate.amounts[0].asset.code).toBe("USD")
      expect(usdEurRate.amounts[1].asset.code).toBe("EUR")
      expect(btcUsdRate.amounts[0].asset.code).toBe("BTC")
      expect(btcUsdRate.amounts[1].asset.code).toBe("USD")
    })
  })

  describe("Rate source comparison", () => {
    class MockExchangeRateProvider implements ExchangeRateProvider {
      private name: string
      private priority: number
      private reliability: number

      constructor(name: string, priority: number, reliability: number) {
        this.name = name
        this.priority = priority
        this.reliability = reliability
      }

      async getRate(from: Currency, to: Currency): Promise<ExchangeRate> {
        const fromAmount: AssetAmount = {
          asset: from,
          amount: { amount: 100n, decimals: from.decimals },
        }
        const toAmount: AssetAmount = {
          asset: to,
          amount: { amount: 85n, decimals: to.decimals },
        }

        const source: ExchangeRateSource = {
          name: this.name,
          priority: this.priority,
          reliability: this.reliability,
        }

        return new ExchangeRate(fromAmount, toAmount, Date.now().toString(), source)
      }

      getName(): string {
        return this.name
      }

      getPriority(): number {
        return this.priority
      }

      getReliability(): number {
        return this.reliability
      }
    }

    it("should compare rates from different sources", async () => {
      const coinbaseProvider = new MockExchangeRateProvider("Coinbase", 1, 0.95)
      const krakenProvider = new MockExchangeRateProvider("Kraken", 2, 0.90)

      const coinbaseRate = await coinbaseProvider.getRate(usdCurrency, eurCurrency)
      const krakenRate = await krakenProvider.getRate(usdCurrency, eurCurrency)

      expect(coinbaseRate.source?.name).toBe("Coinbase")
      expect(krakenRate.source?.name).toBe("Kraken")
      expect(coinbaseRate.source?.priority).toBeLessThan(krakenRate.source?.priority || 0)
      expect(coinbaseRate.source?.reliability).toBeGreaterThan(krakenRate.source?.reliability || 0)
    })

    it("should handle manual rate sources", () => {
      const manualSource: ExchangeRateSource = {
        name: "Manual",
        priority: 0, // Highest priority
        reliability: 1.0, // Perfect reliability
      }

      const usdAmount: AssetAmount = {
        asset: usdCurrency,
        amount: { amount: 100n, decimals: 2n },
      }
      const eurAmount: AssetAmount = {
        asset: eurCurrency,
        amount: { amount: 85n, decimals: 2n },
      }

      const manualRate = new ExchangeRate(usdAmount, eurAmount, Date.now().toString(), manualSource)

      expect(manualRate.source?.name).toBe("Manual")
      expect(manualRate.source?.priority).toBe(0)
      expect(manualRate.source?.reliability).toBe(1.0)
    })
  })

  describe("Rate metadata validation", () => {
    it("should validate source metadata", () => {
      const validSources: ExchangeRateSource[] = [
        { name: "Coinbase", priority: 1, reliability: 0.95 },
        { name: "Kraken", priority: 2, reliability: 0.90 },
      ]

      validSources.forEach(source => {
        expect(source.name).toBeTruthy()
        expect(source.priority).toBeGreaterThan(0)
        expect(source.reliability).toBeGreaterThan(0)
        expect(source.reliability).toBeLessThanOrEqual(1)
      })
    })

    it("should handle timestamp validation", () => {
      const currentTime = Date.now()
      const pastTime = currentTime - 60000 // 1 minute ago
      const futureTime = currentTime + 60000 // 1 minute from now

      const timestamps = [
        currentTime.toString(),
        pastTime.toString(),
        futureTime.toString(),
      ]

      timestamps.forEach(timestamp => {
        expect(timestamp).toMatch(/^\d+$/)
        expect(parseInt(timestamp)).toBeGreaterThan(0)
      })
    })
  })
})