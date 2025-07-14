/* eslint-disable max-classes-per-file */
import { Currency } from "../src/types"
import { FixedPointNumber } from "../src/fixed-point"
import {
  ExchangeRateSource,
  ExchangeRateProvider,
} from "../src/exchange-rate-sources"
import { nowUNIXTime } from "../src/time"
import { ExchangeRate, ExchangeRateData } from "../src/exchange-rates"

describe("ExchangeRate", () => {
  // Test currencies
  const USD: Currency = {
    name: "US Dollar",
    code: "USD",
    decimals: 2n,
    symbol: "$",
  }

  const EUR: Currency = {
    name: "Euro",
    code: "EUR",
    decimals: 2n,
    symbol: "€",
  }

  const BTC: Currency = {
    name: "Bitcoin",
    code: "BTC",
    decimals: 8n,
    symbol: "₿",
  }

  // Ethereum currency (not used in tests but kept for completeness)
  // const ETH: Currency = {
  //   name: "Ethereum",
  //   code: "ETH",
  //   decimals: 18n,
  //   symbol: "Ξ",
  // }

  const JPY: Currency = {
    name: "Japanese Yen",
    code: "JPY",
    decimals: 0n,
    symbol: "¥",
  }

  describe("ExchangeRateData type structure", () => {
    it("should have correct type structure", () => {
      const rate: ExchangeRateData = {
        baseCurrency: USD,
        quoteCurrency: EUR,
        rate: new FixedPointNumber(108n, 2n), // 1.08 EUR per USD
        timestamp: nowUNIXTime(),
        source: {
          name: "ECB",
          priority: 1,
          reliability: 0.99,
        },
      }

      expect(rate.baseCurrency).toBe(USD)
      expect(rate.quoteCurrency).toBe(EUR)
      expect(rate.rate).toBeInstanceOf(FixedPointNumber)
      expect(rate.rate.toString()).toBe("1.08")
      expect(typeof rate.timestamp).toBe("string")
      expect(rate.source?.name).toBe("ECB")
    })

    it("should support optional source metadata", () => {
      const rate: ExchangeRateData = {
        baseCurrency: USD,
        quoteCurrency: EUR,
        rate: new FixedPointNumber(108n, 2n),
        timestamp: nowUNIXTime(),
      }

      expect(rate.source).toBeUndefined()
    })

    it("should support optional timestamp", () => {
      const rate: ExchangeRateData = {
        baseCurrency: USD,
        quoteCurrency: EUR,
        rate: new FixedPointNumber(108n, 2n),
      }

      expect(rate.timestamp).toBeUndefined()
    })
  })

  describe("ExchangeRate constructor", () => {
    it("should create a basic exchange rate with individual arguments", () => {
      const rate = new ExchangeRate(
        USD,
        EUR,
        new FixedPointNumber(108n, 2n), // 1.08 EUR per USD
      )

      expect(rate.baseCurrency).toBe(USD)
      expect(rate.quoteCurrency).toBe(EUR)
      expect(rate.rate.toString()).toBe("1.08")
      expect(rate.timestamp).toBeDefined()
    })

    it("should create rate with string input", () => {
      const rate = new ExchangeRate(USD, EUR, "1.08")

      expect(rate.rate.toString()).toBe("1.08")
    })

    it("should auto-fill timestamp when not provided", () => {
      const rate = new ExchangeRate(USD, EUR, "1.08")

      expect(rate.timestamp).toBeDefined()
      expect(typeof rate.timestamp).toBe("string")
    })

    it("should create rate with custom timestamp", () => {
      const customTime = "1609459200" // 2021-01-01
      const rate = new ExchangeRate(USD, EUR, "1.08", customTime)

      expect(rate.timestamp).toBe(customTime)
    })

    it("should create from ExchangeRateData object", () => {
      const data: ExchangeRateData = {
        baseCurrency: USD,
        quoteCurrency: EUR,
        rate: new FixedPointNumber(108n, 2n),
        timestamp: "1609459200",
        source: {
          name: "ECB",
          priority: 1,
          reliability: 0.99,
        },
      }

      const rate = new ExchangeRate(data)

      expect(rate.baseCurrency).toBe(USD)
      expect(rate.quoteCurrency).toBe(EUR)
      expect(rate.rate.toString()).toBe("1.08")
      expect(rate.timestamp).toBe("1609459200")
      expect(rate.source?.name).toBe("ECB")
    })
  })

  describe("ExchangeRate.invert()", () => {
    it("should invert a basic exchange rate", () => {
      const original = new ExchangeRate(
        USD,
        EUR,
        new FixedPointNumber(108n, 2n), // 1.08 EUR per USD
      )

      const inverted = original.invert()

      expect(inverted.baseCurrency).toBe(EUR)
      expect(inverted.quoteCurrency).toBe(USD)
      // 1/1.08 ≈ 0.925925...
      expect(inverted.rate.toString()).toMatch(/0\.92\d+/)
      expect(inverted.timestamp).toBe(original.timestamp)
    })

    it("should throw error for zero rate", () => {
      const zeroRate = new ExchangeRate(USD, EUR, new FixedPointNumber(0n, 2n))

      expect(() => {
        zeroRate.invert()
      }).toThrow("Cannot invert zero rate")
    })
  })

  describe("ExchangeRate.multiply()", () => {
    it("should multiply rate by bigint scalar", () => {
      const original = new ExchangeRate(
        USD,
        EUR,
        new FixedPointNumber(108n, 2n), // 1.08 EUR per USD
      )

      const doubled = original.multiply(2n)

      expect(doubled.baseCurrency).toBe(USD)
      expect(doubled.quoteCurrency).toBe(EUR)
      expect(doubled.rate.toString()).toBe("2.16")
      expect(doubled.timestamp).toBe(original.timestamp)
    })

    it("should multiply two exchange rates with shared currency", () => {
      // EUR/USD = 1.0842, USD/JPY = 149.85
      // EUR/JPY = EUR/USD * USD/JPY = 1.0842 * 149.85 = 162.457
      const eurUsd = new ExchangeRate(EUR, USD, "1.0842")
      const usdJpy = new ExchangeRate(USD, JPY, "149.85")

      const eurJpy = eurUsd.multiply(usdJpy)

      expect(eurJpy.baseCurrency).toBe(EUR)
      expect(eurJpy.quoteCurrency).toBe(JPY)
      // 1.0842 * 149.85 = 162.4673
      expect(eurJpy.rate.toString()).toMatch(/162\.46\d*/)
    })
  })

  describe("ExchangeRate.convert()", () => {
    it("should convert amounts using exchange rate", () => {
      const rate = new ExchangeRate(
        USD,
        EUR,
        new FixedPointNumber(108n, 2n), // 1.08 EUR per USD
      )

      const usdAmount = new FixedPointNumber(10000n, 2n) // $100.00
      const eurAmount = rate.convert(usdAmount, USD, EUR)

      expect(eurAmount.toString()).toBe("108.00") // $100 * 1.08 = €108
    })

    it("should convert in reverse direction", () => {
      const rate = new ExchangeRate(
        USD,
        EUR,
        new FixedPointNumber(108n, 2n), // 1.08 EUR per USD
      )

      const eurAmount = new FixedPointNumber(10800n, 2n) // €108.00
      const usdAmount = rate.convert(eurAmount, EUR, USD)

      expect(usdAmount.toString()).toBe("100.00") // €108 / 1.08 = $100
    })
  })

  describe("ExchangeRate.average()", () => {
    it("should average two compatible rates", () => {
      const rate1 = new ExchangeRate(
        USD,
        EUR,
        new FixedPointNumber(100n, 2n), // 1.00 EUR per USD
      )

      const rate2 = new ExchangeRate(
        USD,
        EUR,
        new FixedPointNumber(120n, 2n), // 1.20 EUR per USD
      )

      const averaged = new ExchangeRate(
        ExchangeRate.average([rate1.toData(), rate2.toData()]),
      )

      expect(averaged.baseCurrency).toBe(USD)
      expect(averaged.quoteCurrency).toBe(EUR)
      expect(averaged.rate.toString()).toBe("1.1000000000000000000000000000000000000000000000000") // (1.00 + 1.20) / 2
    })

    it("should average three compatible rates", () => {
      const rate1 = new ExchangeRate(
        USD,
        EUR,
        new FixedPointNumber(100n, 2n), // 1.00 EUR per USD
      )

      const rate2 = new ExchangeRate(
        USD,
        EUR,
        new FixedPointNumber(120n, 2n), // 1.20 EUR per USD
      )

      const rate3 = new ExchangeRate(
        USD,
        EUR,
        new FixedPointNumber(150n, 2n), // 1.50 EUR per USD
      )

      const averaged = new ExchangeRate(
        ExchangeRate.average([rate1.toData(), rate2.toData(), rate3.toData()]),
      )

      expect(averaged.baseCurrency).toBe(USD)
      expect(averaged.quoteCurrency).toBe(EUR)
      expect(averaged.rate.toString()).toBe("1.2333333333333333333333333333333333333333333333333") // (1.00 + 1.20 + 1.50) / 3
    })

    it("should average seven compatible rates", () => {
      const rates = [
        new ExchangeRate(USD, EUR, new FixedPointNumber(100n, 2n)), // 1.00
        new ExchangeRate(USD, EUR, new FixedPointNumber(110n, 2n)), // 1.10
        new ExchangeRate(USD, EUR, new FixedPointNumber(120n, 2n)), // 1.20
        new ExchangeRate(USD, EUR, new FixedPointNumber(130n, 2n)), // 1.30
        new ExchangeRate(USD, EUR, new FixedPointNumber(140n, 2n)), // 1.40
        new ExchangeRate(USD, EUR, new FixedPointNumber(150n, 2n)), // 1.50
        new ExchangeRate(USD, EUR, new FixedPointNumber(160n, 2n)), // 1.60
      ]

      const averaged = new ExchangeRate(
        ExchangeRate.average(rates.map(r => r.toData())),
      )

      expect(averaged.baseCurrency).toBe(USD)
      expect(averaged.quoteCurrency).toBe(EUR)
      expect(averaged.rate.toString()).toBe("1.3000000000000000000000000000000000000000000000000") // (1.00 + 1.10 + 1.20 + 1.30 + 1.40 + 1.50 + 1.60) / 7
    })

    it("should not error when averaging rates where length is not divisible by 2 or 5", () => {
      // This test specifically addresses the bug where averaging 3 or 7 rates would error
      // because the old implementation used FixedPointNumber.divide(BigInt) which only supports
      // divisors that are factors of 2 and 5. The fix uses RationalNumber for division.
      
      const rates = [
        new ExchangeRate(USD, EUR, new FixedPointNumber(100n, 2n)),
        new ExchangeRate(USD, EUR, new FixedPointNumber(110n, 2n)),
        new ExchangeRate(USD, EUR, new FixedPointNumber(120n, 2n)),
        new ExchangeRate(USD, EUR, new FixedPointNumber(130n, 2n)),
        new ExchangeRate(USD, EUR, new FixedPointNumber(140n, 2n)),
        new ExchangeRate(USD, EUR, new FixedPointNumber(150n, 2n)),
        new ExchangeRate(USD, EUR, new FixedPointNumber(160n, 2n)),
        new ExchangeRate(USD, EUR, new FixedPointNumber(170n, 2n)),
        new ExchangeRate(USD, EUR, new FixedPointNumber(180n, 2n)),
        new ExchangeRate(USD, EUR, new FixedPointNumber(190n, 2n)),
        new ExchangeRate(USD, EUR, new FixedPointNumber(200n, 2n)),
      ]

      // Test various problematic lengths (not divisible by 2 or 5)
      const problematicLengths = [3, 7, 9, 11]
      
      problematicLengths.forEach(length => {
        const subset = rates.slice(0, length)
        expect(() => {
          const averaged = new ExchangeRate(
            ExchangeRate.average(subset.map(r => r.toData())),
          )
          expect(averaged.baseCurrency).toBe(USD)
          expect(averaged.quoteCurrency).toBe(EUR)
          expect(typeof averaged.rate.toString()).toBe("string")
        }).not.toThrow()
      })
    })
  })

  describe("ExchangeRate.toString()", () => {
    const rate = new ExchangeRate(
      USD,
      EUR,
      new FixedPointNumber(108n, 2n), // 1.08 EUR per USD
    )

    it("should format with symbol by default", () => {
      const result = rate.toString()

      expect(result).toBe("1.08 €/$") // 1.08 EUR per USD
    })

    it("should format with code when requested", () => {
      const result = rate.toString({ format: "code" })

      expect(result).toBe("1.08 EUR/USD")
    })

    it("should format as ratio when requested", () => {
      const result = rate.toString({ format: "ratio" })

      expect(result).toBe("1 USD = 1.08 EUR")
    })
  })

  describe("Cross-currency calculations", () => {
    it("should handle cross-currency calculations", () => {
      // EUR/USD = 1.0842, USD/JPY = 149.85
      // Calculate EUR/JPY = EUR/USD * USD/JPY
      const eurUsd = new ExchangeRate(EUR, USD, "1.0842")
      const usdJpy = new ExchangeRate(USD, JPY, "149.85")

      // Multiply the rates to get cross-currency rate
      const eurJpy = eurUsd.multiply(usdJpy)

      expect(eurJpy.baseCurrency).toBe(EUR)
      expect(eurJpy.quoteCurrency).toBe(JPY)
      // 1.0842 * 149.85 = 162.4673
      expect(eurJpy.rate.toString()).toMatch(/162\.46\d*/)
    })
  })

  describe("JSON serialization", () => {
    it("should serialize and deserialize correctly", () => {
      const original = new ExchangeRate(
        USD,
        EUR,
        new FixedPointNumber(108n, 2n),
        nowUNIXTime(),
        {
          name: "ECB",
          priority: 1,
          reliability: 0.99,
        },
      )

      const json = original.toJSON()
      const restored = ExchangeRate.fromJSON(json)

      expect(restored.baseCurrency.code).toBe(original.baseCurrency.code)
      expect(restored.quoteCurrency.code).toBe(original.quoteCurrency.code)
      expect(restored.rate.toString()).toBe(original.rate.toString())
      expect(restored.timestamp).toBe(original.timestamp)
      expect(restored.source).toEqual(original.source)
    })
  })

  describe("Exchange Rate Source System", () => {
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
          { name: "Kraken", priority: 2, reliability: 0.9 },
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
        const source: ExchangeRateSource = {
          name: "Coinbase",
          priority: 1,
          reliability: 0.95,
        }

        const rate = new ExchangeRate(
          USD,
          EUR,
          new FixedPointNumber(108n, 2n), // 1.08 EUR per USD
          "1609459200",
          source,
        )

        expect(rate.source?.name).toBe("Coinbase")
        expect(rate.source?.priority).toBe(1)
        expect(rate.source?.reliability).toBe(0.95)
        expect(rate.timestamp).toBe("1609459200")
        expect(rate.baseCurrency).toBe(USD)
        expect(rate.quoteCurrency).toBe(EUR)
      })

      it("should handle stale rate detection", () => {
        const currentTime = Date.now()
        const staleTime = currentTime - 300000 // 5 minutes ago

        const source: ExchangeRateSource = {
          name: "Kraken",
          priority: 2,
          reliability: 0.9,
        }

        const rate = new ExchangeRate(
          USD,
          BTC,
          new FixedPointNumber(5000000n, 8n), // 0.05 BTC per USD
          staleTime.toString(),
          source,
        )

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
          const source: ExchangeRateSource = {
            name: this.name,
            priority: this.priority,
            reliability: this.reliability,
          }

          return new ExchangeRate(
            from,
            to,
            new FixedPointNumber(108n, 2n), // Mock rate 1.08
            Date.now().toString(),
            source,
          )
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

        const rate = await provider.getRate(USD, EUR)
        expect(rate.source?.name).toBe("TestExchange")
        expect(rate.isStale(60000)).toBe(false)
      })

      it("should handle different provider priorities", async () => {
        const providers = [
          new MockExchangeRateProvider("Primary", 1, 0.95),
          new MockExchangeRateProvider("Secondary", 2, 0.9),
          new MockExchangeRateProvider("Fallback", 3, 0.85),
        ]

        const rates = await Promise.all(
          providers.map((p) => p.getRate(USD, EUR)),
        )

        expect(rates[0].source?.priority).toBe(1)
        expect(rates[1].source?.priority).toBe(2)
        expect(rates[2].source?.priority).toBe(3)
      })

      it("should support multiple currency pairs", async () => {
        const provider = new MockExchangeRateProvider("MultiCurrency", 1, 0.95)

        const usdEurRate = await provider.getRate(USD, EUR)
        const btcUsdRate = await provider.getRate(BTC, USD)

        expect(usdEurRate.baseCurrency.code).toBe("USD")
        expect(usdEurRate.quoteCurrency.code).toBe("EUR")
        expect(btcUsdRate.baseCurrency.code).toBe("BTC")
        expect(btcUsdRate.quoteCurrency.code).toBe("USD")
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
          const source: ExchangeRateSource = {
            name: this.name,
            priority: this.priority,
            reliability: this.reliability,
          }

          return new ExchangeRate(
            from,
            to,
            new FixedPointNumber(108n, 2n), // Mock rate 1.08
            Date.now().toString(),
            source,
          )
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
        const coinbaseProvider = new MockExchangeRateProvider(
          "Coinbase",
          1,
          0.95,
        )
        const krakenProvider = new MockExchangeRateProvider("Kraken", 2, 0.9)

        const coinbaseRate = await coinbaseProvider.getRate(USD, EUR)
        const krakenRate = await krakenProvider.getRate(USD, EUR)

        expect(coinbaseRate.source?.name).toBe("Coinbase")
        expect(krakenRate.source?.name).toBe("Kraken")
        expect(coinbaseRate.source?.priority).toBeLessThan(
          krakenRate.source?.priority || 0,
        )
        expect(coinbaseRate.source?.reliability).toBeGreaterThan(
          krakenRate.source?.reliability || 0,
        )
      })

      it("should handle manual rate sources", () => {
        const manualSource: ExchangeRateSource = {
          name: "Manual",
          priority: 0, // Highest priority
          reliability: 1.0, // Perfect reliability
        }

        const manualRate = new ExchangeRate(
          USD,
          EUR,
          new FixedPointNumber(108n, 2n), // 1.08 EUR per USD
          Date.now().toString(),
          manualSource,
        )

        expect(manualRate.source?.name).toBe("Manual")
        expect(manualRate.source?.priority).toBe(0)
        expect(manualRate.source?.reliability).toBe(1.0)
      })
    })

    describe("Rate metadata validation", () => {
      it("should validate source metadata", () => {
        const validSources: ExchangeRateSource[] = [
          { name: "Coinbase", priority: 1, reliability: 0.95 },
          { name: "Kraken", priority: 2, reliability: 0.9 },
        ]

        validSources.forEach((source) => {
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

        timestamps.forEach((timestamp) => {
          expect(timestamp).toBeTruthy()
          expect(parseInt(timestamp, 10)).toBeGreaterThan(0)
        })
      })
    })

    describe("spread()", () => {
      it("should create bid/ask rates with decimal string spread", () => {
        const rate = new ExchangeRate(USD, EUR, "1.2000")
        const result = rate.spread("0.02") // 2% spread

        expect(result.mid.rate.toString()).toBe("1.2000")
        expect(result.bid.rate.toString()).toBe("1.1880") // 1.2 - (1.2 * 0.01)
        expect(result.ask.rate.toString()).toBe("1.2120") // 1.2 + (1.2 * 0.01)
      })

      it("should create bid/ask rates with percentage string spread", () => {
        const rate = new ExchangeRate(USD, EUR, "1.0000")
        const result = rate.spread("2%") // 2% spread

        expect(result.mid.rate.toString()).toBe("1.0000")
        expect(result.bid.rate.toString()).toBe("0.9900") // 1.0 - (1.0 * 0.01)
        expect(result.ask.rate.toString()).toBe("1.0100") // 1.0 + (1.0 * 0.01)
      })

      it("should create bid/ask rates with FixedPointNumber spread", () => {
        const rate = new ExchangeRate(USD, EUR, "2.0000")
        const spread = new FixedPointNumber(4n, 2n) // 0.04 (4% spread)
        const result = rate.spread(spread)

        expect(result.mid.rate.toString()).toBe("2.0000")
        expect(result.bid.rate.toString()).toBe("1.9600") // 2.0 - (2.0 * 0.02)
        expect(result.ask.rate.toString()).toBe("2.0400") // 2.0 + (2.0 * 0.02)
      })

      it("should maintain currency information in spread results", () => {
        const rate = new ExchangeRate(USD, EUR, "1.2000")
        const result = rate.spread("0.02")

        expect(result.bid.baseCurrency).toBe(USD)
        expect(result.bid.quoteCurrency).toBe(EUR)
        expect(result.ask.baseCurrency).toBe(USD)
        expect(result.ask.quoteCurrency).toBe(EUR)
        expect(result.mid.baseCurrency).toBe(USD)
        expect(result.mid.quoteCurrency).toBe(EUR)
      })

      it("should maintain timestamp and source information", () => {
        const timestamp = nowUNIXTime()
        const source: ExchangeRateSource = {
          name: "Test Source",
          priority: 1,
          reliability: 0.95,
        }
        const rate = new ExchangeRate({
          baseCurrency: USD,
          quoteCurrency: EUR,
          rate: new FixedPointNumber(12000n, 4n),
          timestamp,
          source,
        })
        const result = rate.spread("0.02")

        expect(result.bid.timestamp).toBe(timestamp)
        expect(result.ask.timestamp).toBe(timestamp)
        expect(result.mid.timestamp).toBe(timestamp)
        expect(result.bid.source).toBe(source)
        expect(result.ask.source).toBe(source)
        expect(result.mid.source).toBe(source)
      })

      it("should handle different currency decimal places", () => {
        const rate = new ExchangeRate(USD, JPY, "150.00")
        const result = rate.spread("1%")

        expect(result.mid.rate.toString()).toBe("150.00")
        expect(result.bid.rate.toString()).toBe("149.250") // 150 - (150 * 0.005)
        expect(result.ask.rate.toString()).toBe("150.750") // 150 + (150 * 0.005)
      })

      it("should handle very small spreads", () => {
        const rate = new ExchangeRate(USD, EUR, "1.0000")
        const result = rate.spread("0.0001") // 0.01% spread

        expect(result.mid.rate.toString()).toBe("1.0000")
        expect(result.bid.rate.toString()).toBe("0.99995") // 1.0 - (1.0 * 0.00005)
        expect(result.ask.rate.toString()).toBe("1.00005") // 1.0 + (1.0 * 0.00005)
      })

      it("should handle large spreads", () => {
        const rate = new ExchangeRate(USD, EUR, "1.0000")
        const result = rate.spread("50%") // 50% spread

        expect(result.mid.rate.toString()).toBe("1.0000")
        expect(result.bid.rate.toString()).toBe("0.7500") // 1.0 - (1.0 * 0.25)
        expect(result.ask.rate.toString()).toBe("1.2500") // 1.0 + (1.0 * 0.25)
      })

      it("should create immutable results", () => {
        const rate = new ExchangeRate(USD, EUR, "1.2000")
        const result = rate.spread("0.02")

        // Original rate should be unchanged
        expect(rate.rate.toString()).toBe("1.2000")

        // Each result should be a new instance
        expect(result.bid).not.toBe(rate)
        expect(result.ask).not.toBe(rate)
        expect(result.mid).not.toBe(rate)
        expect(result.bid).not.toBe(result.ask)
        expect(result.bid).not.toBe(result.mid)
        expect(result.ask).not.toBe(result.mid)
      })

      it("should handle BTC rates with high precision", () => {
        const rate = new ExchangeRate(BTC, USD, "50000.00000000")
        const result = rate.spread("0.1%") // 0.1% spread

        expect(result.mid.rate.toString()).toBe("50000.00000000")
        expect(result.bid.rate.toString()).toBe("49975.00000000") // 50000 - (50000 * 0.0005)
        expect(result.ask.rate.toString()).toBe("50025.00000000") // 50000 + (50000 * 0.0005)
      })
    })
  })
})
