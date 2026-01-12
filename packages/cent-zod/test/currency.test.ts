import { describe, expect, it } from "@jest/globals"
import { getValidCurrencyCodes, zCurrency, zCurrencyCode } from "../src"

describe("zCurrencyCode", () => {
  it("transforms valid currency code to Currency object", () => {
    const result = zCurrencyCode.parse("USD")
    expect(result.code).toBe("USD")
    expect(result.symbol).toBe("$")
  })

  it("handles lowercase input", () => {
    const result = zCurrencyCode.parse("usd")
    expect(result.code).toBe("USD")
  })

  it("rejects unknown currency codes", () => {
    expect(() => zCurrencyCode.parse("XXX")).toThrow(/Unknown currency/)
  })
})

describe("zCurrency", () => {
  it("accepts any valid currency by default", () => {
    const schema = zCurrency()
    expect(schema.parse("USD").code).toBe("USD")
    expect(schema.parse("EUR").code).toBe("EUR")
    expect(schema.parse("BTC").code).toBe("BTC")
  })

  describe("with allowed list", () => {
    it("accepts currencies in allowed list", () => {
      const schema = zCurrency({ allowed: ["USD", "EUR"] })
      expect(schema.parse("USD").code).toBe("USD")
      expect(schema.parse("EUR").code).toBe("EUR")
    })

    it("rejects currencies not in allowed list", () => {
      const schema = zCurrency({ allowed: ["USD", "EUR"] })
      expect(() => schema.parse("GBP")).toThrow(/not in allowed list/)
    })
  })

  describe("with denied list", () => {
    it("rejects currencies in denied list", () => {
      const schema = zCurrency({ denied: ["BTC"] })
      expect(() => schema.parse("BTC")).toThrow(/not allowed/)
    })

    it("accepts currencies not in denied list", () => {
      const schema = zCurrency({ denied: ["BTC"] })
      expect(schema.parse("USD").code).toBe("USD")
    })
  })

  describe("with type filter", () => {
    it("fiat filter accepts fiat currencies", () => {
      const schema = zCurrency({ type: "fiat" })
      expect(schema.parse("USD").code).toBe("USD")
      expect(schema.parse("EUR").code).toBe("EUR")
    })

    it("fiat filter rejects crypto currencies", () => {
      const schema = zCurrency({ type: "fiat" })
      expect(() => schema.parse("BTC")).toThrow(/not a fiat currency/)
    })

    it("crypto filter accepts crypto currencies", () => {
      const schema = zCurrency({ type: "crypto" })
      expect(schema.parse("BTC").code).toBe("BTC")
      expect(schema.parse("ETH").code).toBe("ETH")
    })

    it("crypto filter rejects fiat currencies", () => {
      const schema = zCurrency({ type: "crypto" })
      expect(() => schema.parse("USD")).toThrow(/not a cryptocurrency/)
    })
  })
})

describe("getValidCurrencyCodes", () => {
  it("returns array of currency codes", () => {
    const codes = getValidCurrencyCodes()
    expect(codes).toContain("USD")
    expect(codes).toContain("EUR")
    expect(codes).toContain("BTC")
    expect(codes.length).toBeGreaterThan(100)
  })
})
