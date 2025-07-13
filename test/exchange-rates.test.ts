import { ExchangeRate, ExchangeRateJSON } from "../src/exchange-rates"
import { Currency, AssetAmount } from "../src/types"
import { Money } from "../src/money"
import { ExchangeRateSource } from "../src/exchange-rate-sources"

describe("ExchangeRate", () => {
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

  const usdAmount: AssetAmount = {
    asset: usdCurrency,
    amount: { amount: 10000n, decimals: 2n }, // $100.00
  }

  const eurAmount: AssetAmount = {
    asset: eurCurrency,
    amount: { amount: 8500n, decimals: 2n }, // €85.00
  }

  const __btcAmount: AssetAmount = {
    asset: btcCurrency,
    amount: { amount: 100000000n, decimals: 8n }, // 1.00000000 BTC
  }

  describe("constructor", () => {
    it("should create an ExchangeRate instance with the provided amounts", () => {
      const rate = new ExchangeRate(usdAmount, eurAmount)
      expect(rate.amounts).toEqual([usdAmount, eurAmount])
      expect(rate.time).toBeDefined()
    })

    it("should accept Money instances and convert to AssetAmount", () => {
      const usdMoney = new Money(usdAmount)
      const eurMoney = new Money(eurAmount)
      const rate = new ExchangeRate(usdMoney, eurMoney)

      expect(rate.amounts[0]).toEqual(usdAmount)
      expect(rate.amounts[1]).toEqual(eurAmount)
    })

    it("should accept a custom time parameter", () => {
      const customTime = "1609459200" // 2021-01-01 00:00:00 UTC
      const rate = new ExchangeRate(usdAmount, eurAmount, customTime)
      expect(rate.time).toBe(customTime)
    })

    it("should accept optional source metadata", () => {
      const source: ExchangeRateSource = {
        name: "Coinbase",
        priority: 1,
        reliability: 0.95,
      }
      const rate = new ExchangeRate(usdAmount, eurAmount, undefined, source)
      expect(rate.source).toEqual(source)
    })
  })

  describe("invert", () => {
    it("should swap the order of amounts while preserving time", () => {
      const customTime = "1609459200"
      const rate = new ExchangeRate(usdAmount, eurAmount, customTime)
      const inverted = rate.invert()

      expect(inverted.amounts[0]).toEqual(eurAmount)
      expect(inverted.amounts[1]).toEqual(usdAmount)
      expect(inverted.time).toBe(customTime)
      expect(inverted).toBeInstanceOf(ExchangeRate)
    })

    it("should preserve source metadata when inverting", () => {
      const source: ExchangeRateSource = {
        name: "Coinbase",
        priority: 1,
        reliability: 0.95,
      }
      const customTime = "1609459200"
      const rate = new ExchangeRate(usdAmount, eurAmount, customTime, source)
      const inverted = rate.invert()

      expect(inverted.source).toEqual(source)
      expect(inverted.amounts[0]).toEqual(eurAmount)
      expect(inverted.amounts[1]).toEqual(usdAmount)
    })
  })

  describe("inherited functionality from Price", () => {
    it("should inherit asRatio method", () => {
      const rate = new ExchangeRate(usdAmount, eurAmount)
      const ratio = rate.asRatio()

      // Should return decimal-normalized ratio like Price
      // $100.00 / €85.00 = (10000 * 10^2) / (8500 * 10^2) = 1000000 / 850000
      expect(ratio.p).toBe(1000000n)
      expect(ratio.q).toBe(850000n)
    })

    it("should inherit multiply method", () => {
      const rate = new ExchangeRate(usdAmount, eurAmount)
      const multiplied = rate.multiply(2n)

      expect(multiplied.amounts[0].amount.amount).toBe(20000n) // 200.00 USD
      expect(multiplied.amounts[1].amount.amount).toBe(8500n) // 85.00 EUR (unchanged)
      expect(multiplied.time).toBe(rate.time)
    })

    it("should inherit divide method", () => {
      const rate = new ExchangeRate(usdAmount, eurAmount)
      const divided = rate.divide(2n)

      expect(divided.amounts[0].amount.amount).toBe(5000n) // 50.00 USD
      expect(divided.amounts[1].amount.amount).toBe(8500n) // 85.00 EUR (unchanged)
      expect(divided.time).toBe(rate.time)
    })

    it("should inherit equals method with time comparison", () => {
      const time1 = "1609459200"
      const time2 = "1609545600"

      const rate1 = new ExchangeRate(usdAmount, eurAmount, time1)
      const rate2 = new ExchangeRate(usdAmount, eurAmount, time1)
      const rate3 = new ExchangeRate(usdAmount, eurAmount, time2)

      expect(rate1.equals(rate2)).toBe(true)
      expect(rate1.equals(rate3)).toBe(false) // Different times
    })
  })

  describe("real-world exchange rate scenarios", () => {
    it("should handle USD/EUR exchange rate", () => {
      // 1 USD = 0.85 EUR
      const usdBase: AssetAmount = {
        asset: usdCurrency,
        amount: { amount: 100n, decimals: 2n },
      } // $1.00
      const eurQuote: AssetAmount = {
        asset: eurCurrency,
        amount: { amount: 85n, decimals: 2n },
      } // €0.85

      const rate = new ExchangeRate(usdBase, eurQuote)
      const ratio = rate.asRatio()

      // $1.00 / €0.85 = (100 * 10^2) / (85 * 10^2) = 10000 / 8500
      expect(ratio.p).toBe(10000n)
      expect(ratio.q).toBe(8500n)
    })

    it("should handle BTC/USD exchange rate", () => {
      // 1 BTC = $50,000 USD
      const btcBase: AssetAmount = {
        asset: btcCurrency,
        amount: { amount: 100000000n, decimals: 8n },
      } // 1.00000000 BTC
      const usdQuote: AssetAmount = {
        asset: usdCurrency,
        amount: { amount: 5000000n, decimals: 2n },
      } // $50,000.00

      const rate = new ExchangeRate(btcBase, usdQuote)

      // Test inversion to get USD/BTC rate
      const inverted = rate.invert()
      expect(inverted.amounts[0]).toEqual(usdQuote)
      expect(inverted.amounts[1]).toEqual(btcBase)
    })

    it("should handle scaling exchange rates", () => {
      const rate = new ExchangeRate(usdAmount, eurAmount)

      // Double the exchange rate
      const doubled = rate.multiply(2n)
      expect(doubled.amounts[0].amount.amount).toBe(20000n)
      expect(doubled.amounts[1].amount.amount).toBe(8500n) // unchanged

      // Half the exchange rate
      const halved = rate.divide(2n)
      expect(halved.amounts[0].amount.amount).toBe(5000n)
      expect(halved.amounts[1].amount.amount).toBe(8500n) // unchanged
    })
  })

  describe("staleness detection", () => {
    it("should detect fresh rates", () => {
      const rate = new ExchangeRate(usdAmount, eurAmount)
      expect(rate.isStale(60000)).toBe(false) // 1 minute threshold
    })

    it("should detect stale rates", () => {
      const pastTime = (Date.now() - 120000).toString() // 2 minutes ago
      const rate = new ExchangeRate(usdAmount, eurAmount, pastTime)
      expect(rate.isStale(60000)).toBe(true) // 1 minute threshold
    })

    it("should calculate rate age", () => {
      const pastTime = (Date.now() - 30000).toString() // 30 seconds ago
      const rate = new ExchangeRate(usdAmount, eurAmount, pastTime)
      const age = rate.getAge()
      expect(age).toBeGreaterThan(29000) // Allow for small timing differences
      expect(age).toBeLessThan(35000)
    })
  })

  describe("JSON serialization", () => {
    it("should serialize to JSON with all required fields", () => {
      const source: ExchangeRateSource = {
        name: "Coinbase",
        priority: 1,
        reliability: 0.95,
      }
      const customTime = "1609459200"
      const rate = new ExchangeRate(usdAmount, eurAmount, customTime, source)

      const json = rate.toJSON()

      expect(json).toEqual({
        amounts: [
          {
            asset: usdCurrency,
            amount: {
              amount: "10000",
              decimals: "2",
            },
          },
          {
            asset: eurCurrency,
            amount: {
              amount: "8500",
              decimals: "2",
            },
          },
        ],
        time: customTime,
        source,
      })
    })

    it("should serialize to JSON without source metadata", () => {
      const customTime = "1609459200"
      const rate = new ExchangeRate(usdAmount, eurAmount, customTime)

      const json = rate.toJSON()

      expect(json.source).toBeUndefined()
      expect(json.time).toBe(customTime)
      expect(json.amounts).toHaveLength(2)
    })

    it("should convert BigInt amounts to strings", () => {
      const rate = new ExchangeRate(usdAmount, eurAmount)
      const json = rate.toJSON()

      expect(typeof json.amounts[0].amount.amount).toBe("string")
      expect(typeof json.amounts[0].amount.decimals).toBe("string")
      expect(typeof json.amounts[1].amount.amount).toBe("string")
      expect(typeof json.amounts[1].amount.decimals).toBe("string")
    })
  })

  describe("JSON deserialization", () => {
    const sampleJSON: ExchangeRateJSON = {
      amounts: [
        {
          asset: {
            name: "US Dollar",
            code: "USD",
            decimals: "2",
            symbol: "$",
          },
          amount: {
            amount: "10000",
            decimals: "2",
          },
        },
        {
          asset: {
            name: "Euro",
            code: "EUR",
            decimals: "2",
            symbol: "€",
          },
          amount: {
            amount: "8500",
            decimals: "2",
          },
        },
      ],
      time: "1609459200" as any,
      source: {
        name: "Coinbase",
        priority: 1,
        reliability: 0.95,
      },
    }

    it("should deserialize from JSON with all fields", () => {
      const rate = ExchangeRate.fromJSON(sampleJSON)

      expect(rate.amounts[0].asset).toEqual(sampleJSON.amounts[0].asset)
      expect(rate.amounts[0].amount.amount).toBe(10000n)
      expect(rate.amounts[0].amount.decimals).toBe(2n)
      expect(rate.amounts[1].asset).toEqual(sampleJSON.amounts[1].asset)
      expect(rate.amounts[1].amount.amount).toBe(8500n)
      expect(rate.amounts[1].amount.decimals).toBe(2n)
      expect(rate.time).toBe("1609459200")
      expect(rate.source).toEqual(sampleJSON.source)
    })

    it("should deserialize from JSON without source", () => {
      const jsonWithoutSource = { ...sampleJSON }
      delete jsonWithoutSource.source

      const rate = ExchangeRate.fromJSON(jsonWithoutSource)

      expect(rate.source).toBeUndefined()
      expect(rate.amounts).toHaveLength(2)
    })

    it("should roundtrip serialize -> deserialize correctly", () => {
      const source: ExchangeRateSource = {
        name: "Binance",
        priority: 2,
        reliability: 0.9,
      }
      const originalRate = new ExchangeRate(
        usdAmount,
        eurAmount,
        "1609459200",
        source,
      )

      const json = originalRate.toJSON()
      const reconstructedRate = ExchangeRate.fromJSON(json)

      // Check amounts match (values should be identical)
      expect(reconstructedRate.amounts[0].amount).toEqual(originalRate.amounts[0].amount)
      expect(reconstructedRate.amounts[1].amount).toEqual(originalRate.amounts[1].amount)
      
      // Check asset properties match (allowing for some structural differences in validation)
      expect(reconstructedRate.amounts[0].asset.name).toBe(originalRate.amounts[0].asset.name)
      expect(reconstructedRate.amounts[1].asset.name).toBe(originalRate.amounts[1].asset.name)
      
      expect(reconstructedRate.time).toBe(originalRate.time)
      expect(reconstructedRate.source).toEqual(originalRate.source)
    })

    it("should throw error for null/undefined JSON", () => {
      expect(() => ExchangeRate.fromJSON(null)).toThrow(
        "Invalid ExchangeRate JSON",
      )
      expect(() => ExchangeRate.fromJSON(undefined)).toThrow(
        "Invalid ExchangeRate JSON",
      )
    })

    it("should throw error for invalid amounts array", () => {
      const invalidJSON = { ...sampleJSON, amounts: [] }
      expect(() => ExchangeRate.fromJSON(invalidJSON)).toThrow(
        "Invalid ExchangeRate JSON",
      )

      const invalidJSON2 = { ...sampleJSON, amounts: [sampleJSON.amounts[0]] }
      expect(() => ExchangeRate.fromJSON(invalidJSON2)).toThrow(
        "Invalid ExchangeRate JSON",
      )
    })

    it("should throw error for missing time", () => {
      const invalidJSON = { ...sampleJSON }
      delete invalidJSON.time
      expect(() => ExchangeRate.fromJSON(invalidJSON)).toThrow(
        "Invalid ExchangeRate JSON",
      )
    })

    it("should throw error for invalid BigInt conversion", () => {
      const invalidJSON = {
        ...sampleJSON,
        amounts: [
          {
            ...sampleJSON.amounts[0],
            amount: { amount: "invalid", decimals: "2" },
          },
          sampleJSON.amounts[1],
        ],
      }
      expect(() => ExchangeRate.fromJSON(invalidJSON)).toThrow(
        "Invalid ExchangeRate JSON",
      )
    })

    it("should handle large BigInt values", () => {
      const largeValueJSON: ExchangeRateJSON = {
        amounts: [
          {
            asset: {
              name: "Bitcoin",
              code: "BTC",
              decimals: "8",
              symbol: "₿",
            },
            amount: {
              amount: "100000000000000000", // Very large number
              decimals: "8",
            },
          },
          {
            asset: {
              name: "US Dollar",
              code: "USD",
              decimals: "2",
              symbol: "$",
            },
            amount: {
              amount: "5000000000000",
              decimals: "2",
            },
          },
        ],
        time: "1609459200" as any,
      }

      const rate = ExchangeRate.fromJSON(largeValueJSON)
      expect(rate.amounts[0].amount.amount).toBe(100000000000000000n)
      expect(rate.amounts[1].amount.amount).toBe(5000000000000n)
    })

    it("should provide detailed validation error messages", () => {
      const invalidJSON = {
        amounts: [
          {
            asset: { name: "USD" }, // Missing required fields
            amount: { amount: "-123", decimals: "2" }, // Negative amount (invalid)
          },
        ],
        time: "not-a-timestamp",
        source: { name: "test", priority: "invalid", reliability: 2 }, // Invalid types
      }

      expect(() => ExchangeRate.fromJSON(invalidJSON)).toThrow(
        "Invalid ExchangeRate JSON",
      )

      // Test specific validation error details
      try {
        ExchangeRate.fromJSON(invalidJSON)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const errorMessage = (error as Error).message
        expect(errorMessage).toContain("Invalid ExchangeRate JSON")
      }
    })
  })

  describe("toString() formatting", () => {
    const usdBtcRate = new ExchangeRate(
      {
        asset: usdCurrency,
        amount: { amount: 11700000n, decimals: 2n }, // $117,000.00
      },
      {
        asset: btcCurrency,
        amount: { amount: 100000000n, decimals: 8n }, // 1.00000000 BTC
      }
    )

    describe("symbol format (default)", () => {
      it("should format with symbol and denominator code by default", () => {
        const result = usdBtcRate.toString()
        expect(result).toBe("$117,000.00 / BTC")
      })

      it("should show symbol for numerator when requested", () => {
        const result = usdBtcRate.toString({ 
          showSymbolFor: 'numerator' 
        })
        expect(result).toBe("$117,000.00 / BTC")
      })

      it("should show no symbols when requested", () => {
        const result = usdBtcRate.toString({ 
          showSymbolFor: 'none' 
        })
        expect(result).toBe("117,000.00 / BTC")
      })

      it("should show symbols for both when requested", () => {
        const result = usdBtcRate.toString({ 
          showSymbolFor: 'both' 
        })
        expect(result).toBe("$117,000.00 / ₿")
      })
    })

    describe("code format", () => {
      it("should format with symbol and currency pair code", () => {
        const result = usdBtcRate.toString({ format: 'code' })
        expect(result).toBe("$117,000.00 BTCUSD")
      })

      it("should format without symbol when showSymbolFor is none", () => {
        const result = usdBtcRate.toString({ 
          format: 'code',
          showSymbolFor: 'none'
        })
        expect(result).toBe("117,000.00 BTCUSD")
      })
    })

    describe("ratio format", () => {
      it("should format as currency code ratio", () => {
        const result = usdBtcRate.toString({ format: 'ratio' })
        expect(result).toBe("117,000.00 USD/BTC")
      })

      it("should ignore showSymbolFor in ratio format", () => {
        const result = usdBtcRate.toString({ 
          format: 'ratio',
          showSymbolFor: 'both'
        })
        expect(result).toBe("117,000.00 USD/BTC")
      })
    })

    describe("precision handling", () => {
      it("should use quote currency decimals by default", () => {
        // BTC has 8 decimals, but rate value should use USD decimals (2)
        const result = usdBtcRate.toString()
        expect(result).toBe("$117,000.00 / BTC")
      })

      it("should use custom precision when provided", () => {
        const result = usdBtcRate.toString({ precision: 4 })
        expect(result).toBe("$117,000.0000 / BTC")
      })

      it("should use zero precision when specified", () => {
        const result = usdBtcRate.toString({ precision: 0 })
        expect(result).toBe("$117,000 / BTC")
      })
    })

    describe("locale formatting", () => {
      it("should format numbers according to US locale by default", () => {
        const result = usdBtcRate.toString()
        expect(result).toBe("$117,000.00 / BTC")
      })

      it("should format numbers according to German locale", () => {
        const result = usdBtcRate.toString({ locale: 'de-DE' })
        expect(result).toBe("$117.000,00 / BTC")
      })

      it("should format numbers according to French locale", () => {
        const result = usdBtcRate.toString({ locale: 'fr-FR' })
        // French locale uses non-breaking space and comma decimal separator
        expect(result).toMatch(/\$117[\s]000,00 \/ BTC/)
      })
    })

    describe("edge cases", () => {
      it("should handle rates with no symbols", () => {
        const customCurrency = {
          name: "Custom Currency",
          code: "CUS",
          decimals: 2n,
        }
        const rate = new ExchangeRate(
          {
            asset: customCurrency,
            amount: { amount: 100n, decimals: 2n }, // 1.00 CUS
          },
          {
            asset: usdCurrency,
            amount: { amount: 100n, decimals: 2n }, // 1.00 USD
          }
        )
        
        const result = rate.toString()
        expect(result).toBe("1.00 / USD")
      })

      it("should handle very small rates with high precision", () => {
        const satoshiRate = new ExchangeRate(
          {
            asset: usdCurrency, 
            amount: { amount: 117n, decimals: 2n }, // $1.17 
          },
          {
            asset: btcCurrency,
            amount: { amount: 100000000n, decimals: 8n }, // 1.00000000 BTC
          }
        )
        
        const result = satoshiRate.toString({ precision: 8 })
        expect(result).toBe("$1.17000000 / BTC")
      })

      it("should handle very large rates", () => {
        const largeBtcRate = new ExchangeRate(
          {
            asset: usdCurrency,
            amount: { amount: 500000000n, decimals: 2n }, // $5,000,000.00
          },
          {
            asset: btcCurrency,
            amount: { amount: 100000000n, decimals: 8n }, // 1.00000000 BTC
          }
        )
        
        const result = largeBtcRate.toString()
        expect(result).toBe("$5,000,000.00 / BTC")
      })
    })

    describe("inverted rates", () => {
      it("should format inverted rates correctly", () => {
        const btcUsdRate = usdBtcRate.invert()
        const result = btcUsdRate.toString({ precision: 8 })
        // 1 BTC = $117,000, so 1 BTC should be ~0.00000855 USD per satoshi
        expect(result).toMatch(/₿0\.0000\d+ \/ USD/)
      })
    })
  })
})
