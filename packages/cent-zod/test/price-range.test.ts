import { describe, expect, it } from "@jest/globals"
import { PriceRangeClass } from "@thesis-co/cent"
import { zPriceRange, zPriceRangeObject, zPriceRangeString } from "../src"

describe("zPriceRangeString", () => {
  it("parses price range string with dash separator", () => {
    const result = zPriceRangeString.parse("$50 - $100")
    expect(result).toBeInstanceOf(PriceRangeClass)
    expect(result.min.toString()).toBe("$50.00")
    expect(result.max.toString()).toBe("$100.00")
  })

  it("parses price range string without spaces", () => {
    const result = zPriceRangeString.parse("$50-$100")
    expect(result).toBeInstanceOf(PriceRangeClass)
  })

  it("rejects invalid range strings", () => {
    expect(() => zPriceRangeString.parse("invalid")).toThrow()
  })
})

describe("zPriceRangeObject", () => {
  it("parses object with min and max strings", () => {
    const result = zPriceRangeObject.parse({
      min: "$50.00",
      max: "$100.00",
    })
    expect(result).toBeInstanceOf(PriceRangeClass)
    expect(result.min.toString()).toBe("$50.00")
    expect(result.max.toString()).toBe("$100.00")
  })
})

describe("zPriceRange", () => {
  it("accepts string format", () => {
    const schema = zPriceRange()
    const result = schema.parse("$50 - $100")
    expect(result).toBeInstanceOf(PriceRangeClass)
  })

  it("accepts object format", () => {
    const schema = zPriceRange()
    const result = schema.parse({
      min: "$50.00",
      max: "$100.00",
    })
    expect(result).toBeInstanceOf(PriceRangeClass)
  })

  describe("with currency constraint", () => {
    it("accepts matching currency", () => {
      const schema = zPriceRange("USD")
      const result = schema.parse("$50 - $100")
      expect(result.currency.code).toBe("USD")
    })

    it("rejects non-matching currency", () => {
      const schema = zPriceRange("USD")
      expect(() => schema.parse("€50 - €100")).toThrow(/Expected currency USD/)
    })
  })

  describe("with span constraints", () => {
    it("accepts range with sufficient span", () => {
      const schema = zPriceRange({ minSpan: "$10.00" })
      const result = schema.parse("$50 - $100")
      expect(result.span.toString()).toBe("$50.00")
    })

    it("rejects range with insufficient span", () => {
      const schema = zPriceRange({ minSpan: "$100.00" })
      expect(() => schema.parse("$50 - $60")).toThrow(/span must be at least/)
    })

    it("rejects range with excessive span", () => {
      const schema = zPriceRange({ maxSpan: "$20.00" })
      expect(() => schema.parse("$50 - $100")).toThrow(/span must be at most/)
    })
  })

  describe("with bounds constraints", () => {
    it("accepts range within bounds", () => {
      const schema = zPriceRange({
        bounds: { min: "$0.00", max: "$1000.00" },
      })
      const result = schema.parse("$50 - $100")
      expect(result).toBeInstanceOf(PriceRangeClass)
    })

    it("rejects range below bounds min", () => {
      const schema = zPriceRange({
        bounds: { min: "$100.00" },
      })
      expect(() => schema.parse("$50 - $200")).toThrow(
        /Range minimum must be at least/,
      )
    })

    it("rejects range above bounds max", () => {
      const schema = zPriceRange({
        bounds: { max: "$100.00" },
      })
      expect(() => schema.parse("$50 - $200")).toThrow(
        /Range maximum must be at most/,
      )
    })
  })
})
