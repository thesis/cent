import { describe, expect, it } from "@jest/globals"
import { ExchangeRate } from "@thesis-co/cent"
import { zExchangeRate, zExchangeRateCompact, zExchangeRateJSON } from "../src"

describe("zExchangeRateCompact", () => {
  it("parses compact exchange rate format", () => {
    const result = zExchangeRateCompact.parse({
      base: "USD",
      quote: "EUR",
      rate: "0.92",
    })
    expect(result).toBeInstanceOf(ExchangeRate)
    expect(result.baseCurrency.code).toBe("USD")
    expect(result.quoteCurrency.code).toBe("EUR")
  })

  it("accepts optional timestamp", () => {
    const result = zExchangeRateCompact.parse({
      base: "USD",
      quote: "EUR",
      rate: "0.92",
      timestamp: "1704067200",
    })
    expect(result).toBeInstanceOf(ExchangeRate)
  })
})

describe("zExchangeRateJSON", () => {
  it("parses full JSON format with currency codes", () => {
    const result = zExchangeRateJSON.parse({
      baseCurrency: "USD",
      quoteCurrency: "EUR",
      rate: "0.92",
    })
    expect(result).toBeInstanceOf(ExchangeRate)
  })

  it("parses JSON format with fixed point rate", () => {
    const result = zExchangeRateJSON.parse({
      baseCurrency: "USD",
      quoteCurrency: "EUR",
      rate: { amount: "92", decimals: "2" },
    })
    expect(result).toBeInstanceOf(ExchangeRate)
  })
})

describe("zExchangeRate", () => {
  it("accepts compact format", () => {
    const schema = zExchangeRate()
    const result = schema.parse({
      base: "USD",
      quote: "EUR",
      rate: "0.92",
    })
    expect(result).toBeInstanceOf(ExchangeRate)
  })

  it("accepts JSON format", () => {
    const schema = zExchangeRate()
    const result = schema.parse({
      baseCurrency: "USD",
      quoteCurrency: "EUR",
      rate: "0.92",
    })
    expect(result).toBeInstanceOf(ExchangeRate)
  })

  describe("with currency constraints", () => {
    it("accepts matching currency pair", () => {
      const schema = zExchangeRate("USD", "EUR")
      const result = schema.parse({
        base: "USD",
        quote: "EUR",
        rate: "0.92",
      })
      expect(result.baseCurrency.code).toBe("USD")
      expect(result.quoteCurrency.code).toBe("EUR")
    })

    it("rejects non-matching base currency", () => {
      const schema = zExchangeRate("USD", "EUR")
      expect(() =>
        schema.parse({
          base: "GBP",
          quote: "EUR",
          rate: "0.92",
        }),
      ).toThrow(/Expected base currency USD/)
    })

    it("rejects non-matching quote currency", () => {
      const schema = zExchangeRate("USD", "EUR")
      expect(() =>
        schema.parse({
          base: "USD",
          quote: "GBP",
          rate: "0.92",
        }),
      ).toThrow(/Expected quote currency EUR/)
    })
  })

  describe("with options object", () => {
    it("accepts options with base and quote", () => {
      const schema = zExchangeRate({ base: "BTC", quote: "USD" })
      const result = schema.parse({
        base: "BTC",
        quote: "USD",
        rate: "50000",
      })
      expect(result.baseCurrency.code).toBe("BTC")
    })
  })
})
