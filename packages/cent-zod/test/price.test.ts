import { describe, expect, it } from "@jest/globals"
import { Price } from "@thesis-co/cent"
import { zPrice, zPriceFromObject, zPriceFromTuple } from "../src"

describe("zPriceFromTuple", () => {
  it("parses tuple of money strings", () => {
    const result = zPriceFromTuple.parse(["$50000", "1 BTC"])
    expect(result).toBeInstanceOf(Price)
    expect(result.amounts[0].asset.code).toBe("USD")
    expect(result.amounts[1].asset.code).toBe("BTC")
  })
})

describe("zPriceFromObject", () => {
  it("parses object with numerator and denominator strings", () => {
    const result = zPriceFromObject.parse({
      numerator: "$50000",
      denominator: "1 BTC",
    })
    expect(result).toBeInstanceOf(Price)
  })

  it("parses object with optional time", () => {
    const result = zPriceFromObject.parse({
      numerator: "$50000",
      denominator: "1 BTC",
      time: "1704067200",
    })
    expect(result).toBeInstanceOf(Price)
  })
})

describe("zPrice", () => {
  it("accepts tuple format", () => {
    const schema = zPrice()
    const result = schema.parse(["$50000", "1 BTC"])
    expect(result).toBeInstanceOf(Price)
  })

  it("accepts object format", () => {
    const schema = zPrice()
    const result = schema.parse({
      numerator: "$50000",
      denominator: "1 BTC",
    })
    expect(result).toBeInstanceOf(Price)
  })

  describe("with currency constraints", () => {
    it("accepts matching currencies", () => {
      const schema = zPrice("USD", "BTC")
      const result = schema.parse(["$50000", "1 BTC"])
      expect(result.amounts[0].asset.code).toBe("USD")
      expect(result.amounts[1].asset.code).toBe("BTC")
    })

    it("rejects non-matching numerator currency", () => {
      const schema = zPrice("USD", "BTC")
      expect(() => schema.parse(["€50000", "1 BTC"])).toThrow(
        /Expected numerator currency USD/,
      )
    })

    it("rejects non-matching denominator currency", () => {
      const schema = zPrice("USD", "BTC")
      expect(() => schema.parse(["$50000", "1 ETH"])).toThrow(
        /Expected denominator currency BTC/,
      )
    })
  })
})
