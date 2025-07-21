import { describe, expect, it } from "@jest/globals"
import { Money } from "../src/index"
import { PriceRange, PriceRangeFactory } from "../src/price-range"
import { USD, EUR, BTC } from "../src/currencies"
import { ExchangeRate } from "../src/exchange-rates"

describe("PriceRange", () => {
  describe("Factory Function", () => {
    it("creates range from string format", () => {
      const range = PriceRangeFactory("$50 - $100")
      expect(range.min.equals(Money("$50"))).toBe(true)
      expect(range.max.equals(Money("$100"))).toBe(true)
    })

    it("creates range from compact string format", () => {
      const range = PriceRangeFactory("$50-100")
      expect(range.min.equals(Money("$50"))).toBe(true)
      expect(range.max.equals(Money("$100"))).toBe(true)
    })

    it("creates range from two Money instances", () => {
      const range = PriceRangeFactory(Money("$50"), Money("$100"))
      expect(range.min.equals(Money("$50"))).toBe(true)
      expect(range.max.equals(Money("$100"))).toBe(true)
    })

    it("creates range from mixed string and Money", () => {
      const range = PriceRangeFactory("$50", Money("$100"))
      expect(range.min.equals(Money("$50"))).toBe(true)
      expect(range.max.equals(Money("$100"))).toBe(true)
    })

    it("handles different currency formats", () => {
      const eurRange = PriceRangeFactory("€50 - €100")
      expect(eurRange.min.currency.code).toBe("EUR")
      expect(eurRange.max.currency.code).toBe("EUR")

      const btcRange = PriceRangeFactory("₿0.001 - ₿0.01")
      expect(btcRange.min.currency.code).toBe("BTC")
      expect(btcRange.max.currency.code).toBe("BTC")
    })

    it("throws error for mismatched currencies", () => {
      expect(() => {
        PriceRangeFactory(Money("$50"), Money("€100"))
      }).toThrow("Currency mismatch")
    })

    it("throws error for invalid range (max < min)", () => {
      expect(() => {
        PriceRangeFactory(Money("$100"), Money("$50"))
      }).toThrow("Invalid range: maximum must be greater than or equal to minimum")
    })

    it("allows equal min and max values", () => {
      const range = PriceRangeFactory(Money("$50"), Money("$50"))
      expect(range.min.equals(Money("$50"))).toBe(true)
      expect(range.max.equals(Money("$50"))).toBe(true)
    })
  })

  describe("Class Constructor", () => {
    it("creates range from Money instances", () => {
      const range = new PriceRange(Money("$50"), Money("$100"))
      expect(range.min.equals(Money("$50"))).toBe(true)
      expect(range.max.equals(Money("$100"))).toBe(true)
    })

    it("validates currency matching", () => {
      expect(() => {
        new PriceRange(Money("$50"), Money("€100"))
      }).toThrow("Currency mismatch")
    })

    it("validates logical range", () => {
      expect(() => {
        new PriceRange(Money("$100"), Money("$50"))
      }).toThrow("Invalid range")
    })
  })

  describe("Properties", () => {
    const range = new PriceRange(Money("$50"), Money("$100"))

    it("provides min and max properties", () => {
      expect(range.min.equals(Money("$50"))).toBe(true)
      expect(range.max.equals(Money("$100"))).toBe(true)
    })

    it("calculates span correctly", () => {
      expect(range.span.equals(Money("$50"))).toBe(true)
    })

    it("calculates midpoint correctly", () => {
      expect(range.midpoint.equals(Money("$75"))).toBe(true)
    })

    it("calculates midpoint for odd spans", () => {
      const oddRange = new PriceRange(Money("$50"), Money("$101"))
      expect(oddRange.midpoint.equals(Money("$75.50"))).toBe(true)
    })

    it("identifies empty ranges", () => {
      const equalRange = new PriceRange(Money("$50"), Money("$50"))
      expect(equalRange.isEmpty).toBe(true)
      expect(range.isEmpty).toBe(false)
    })

    it("provides currency property", () => {
      expect(range.currency.code).toBe("USD")
    })
  })

  describe("Contains", () => {
    const range = new PriceRange(Money("$50"), Money("$100"))

    it("returns true for values within range", () => {
      expect(range.contains(Money("$75"))).toBe(true)
      expect(range.contains("$60")).toBe(true)
    })

    it("returns true for boundary values", () => {
      expect(range.contains(Money("$50"))).toBe(true)
      expect(range.contains(Money("$100"))).toBe(true)
    })

    it("returns false for values outside range", () => {
      expect(range.contains(Money("$25"))).toBe(false)
      expect(range.contains(Money("$150"))).toBe(false)
      expect(range.contains("$40")).toBe(false)
    })

    it("throws error for different currencies", () => {
      expect(() => {
        range.contains(Money("€75"))
      }).toThrow("Currency mismatch")
    })
  })

  describe("Range Comparisons", () => {
    const range = new PriceRange(Money("$50"), Money("$100"))

    it("identifies ranges entirely above a value", () => {
      expect(range.isAbove(Money("$30"))).toBe(true)
      expect(range.isAbove(Money("$50"))).toBe(false)
      expect(range.isAbove(Money("$75"))).toBe(false)
    })

    it("identifies ranges entirely below a value", () => {
      expect(range.isBelow(Money("$150"))).toBe(true)
      expect(range.isBelow(Money("$100"))).toBe(false)
      expect(range.isBelow(Money("$75"))).toBe(false)
    })
  })

  describe("Range Operations", () => {
    const range1 = new PriceRange(Money("$50"), Money("$100"))
    const range2 = new PriceRange(Money("$80"), Money("$150"))
    const range3 = new PriceRange(Money("$200"), Money("$300"))

    it("detects overlapping ranges", () => {
      expect(range1.overlaps(range2)).toBe(true)
      expect(range2.overlaps(range1)).toBe(true)
      expect(range1.overlaps(range3)).toBe(false)
    })

    it("calculates intersection of overlapping ranges", () => {
      const intersection = range1.intersect(range2)
      expect(intersection).not.toBeNull()
      expect(intersection!.min.equals(Money("$80"))).toBe(true)
      expect(intersection!.max.equals(Money("$100"))).toBe(true)
    })

    it("returns null for non-overlapping intersections", () => {
      const intersection = range1.intersect(range3)
      expect(intersection).toBeNull()
    })

    it("calculates union of ranges", () => {
      const union = range1.union(range2)
      expect(union.min.equals(Money("$50"))).toBe(true)
      expect(union.max.equals(Money("$150"))).toBe(true)
    })

    it("calculates union of non-overlapping ranges", () => {
      const union = range1.union(range3)
      expect(union.min.equals(Money("$50"))).toBe(true)
      expect(union.max.equals(Money("$300"))).toBe(true)
    })

    it("throws error for operations with different currencies", () => {
      const eurRange = new PriceRange(Money("€50"), Money("€100"))
      expect(() => range1.overlaps(eurRange)).toThrow("Currency mismatch")
      expect(() => range1.intersect(eurRange)).toThrow("Currency mismatch")
      expect(() => range1.union(eurRange)).toThrow("Currency mismatch")
    })
  })

  describe("Split Operations", () => {
    const range = new PriceRange(Money("$60"), Money("$120"))

    it("splits range into equal parts", () => {
      const parts = range.split(3)
      expect(parts.length).toBe(3)
      expect(parts[0].min.equals(Money("$60"))).toBe(true)
      expect(parts[0].max.equals(Money("$80"))).toBe(true)
      expect(parts[1].min.equals(Money("$80"))).toBe(true)
      expect(parts[1].max.equals(Money("$100"))).toBe(true)
      expect(parts[2].min.equals(Money("$100"))).toBe(true)
      expect(parts[2].max.equals(Money("$120"))).toBe(true)
    })

    it("handles single part split", () => {
      const parts = range.split(1)
      expect(parts.length).toBe(1)
      expect(parts[0].equals(range)).toBe(true)
    })

    it("throws error for invalid split count", () => {
      expect(() => range.split(0)).toThrow("Parts must be a positive integer")
      expect(() => range.split(-1)).toThrow("Parts must be a positive integer")
    })
  })

  describe("Static Factory Methods", () => {
    it("creates under range", () => {
      const range = PriceRange.under(Money("$100"))
      expect(range.min.equals(Money("$0"))).toBe(true)
      expect(range.max.equals(Money("$100"))).toBe(true)
    })

    it("creates over range with specified upper limit", () => {
      const range = PriceRange.over(Money("$50"), Money("$1000"))
      expect(range.min.equals(Money("$50"))).toBe(true)
      expect(range.max.equals(Money("$1000"))).toBe(true)
    })

    it("creates between range", () => {
      const range = PriceRange.between(Money("$50"), Money("$100"))
      expect(range.min.equals(Money("$50"))).toBe(true)
      expect(range.max.equals(Money("$100"))).toBe(true)
    })

    it("creates around range with percentage", () => {
      const range = PriceRange.around(Money("$100"), "10%")
      expect(range.min.equals(Money("$90"))).toBe(true)
      expect(range.max.equals(Money("$110"))).toBe(true)
    })

    it("creates price buckets", () => {
      const buckets = PriceRange.createBuckets(Money("$0"), Money("$500"), 5)
      expect(buckets.length).toBe(5)
      expect(buckets[0].min.equals(Money("$0"))).toBe(true)
      expect(buckets[0].max.equals(Money("$100"))).toBe(true)
      expect(buckets[4].min.equals(Money("$400"))).toBe(true)
      expect(buckets[4].max.equals(Money("$500"))).toBe(true)
    })
  })

  describe("String Formatting", () => {
    const range = new PriceRange(Money("$50"), Money("$100"))

    it("formats with default style", () => {
      expect(range.toString()).toBe("$50.00 - $100.00")
    })

    it("formats with compact style", () => {
      expect(range.toString({ format: "compact" })).toBe("$50-100")
    })

    it("formats with from style", () => {
      expect(range.toString({ format: "from" })).toBe("From $50.00")
    })

    it("formats with upTo style", () => {
      expect(range.toString({ format: "upTo" })).toBe("Up to $100.00")
    })

    it("formats with range style", () => {
      expect(range.toString({ format: "range" })).toBe("$50.00 to $100.00")
    })

    it("formats with between style", () => {
      expect(range.toString({ format: "between" })).toBe("Between $50.00 and $100.00")
    })

    it("formats large ranges with compact notation", () => {
      const largeRange = new PriceRange(Money("$1000000"), Money("$5000000"))
      expect(largeRange.toString({ compact: true })).toBe("$1M - $5M")
    })

    it("formats with different locales", () => {
      const eurRange = new PriceRange(Money("€50"), Money("€100"))
      // The actual output will be formatted according to the locale
      const result = eurRange.toString({ locale: "de-DE" })
      // Just verify it contains the expected values in some format
      expect(result).toContain("50")
      expect(result).toContain("100")
      expect(result).toContain("€")
    })

    it("handles equal min/max formatting", () => {
      const equalRange = new PriceRange(Money("$50"), Money("$50"))
      expect(equalRange.toString()).toBe("$50.00")
      expect(equalRange.toString({ format: "from" })).toBe("$50.00")
      expect(equalRange.toString({ format: "upTo" })).toBe("$50.00")
    })
  })

  describe("Currency Conversion", () => {
    const usdRange = new PriceRange(Money("$50"), Money("$100"))
    const exchangeRate = new ExchangeRate(USD, EUR, "0.85")

    it("converts range to different currency", () => {
      const eurRange = usdRange.convert(exchangeRate)
      expect(eurRange.currency.code).toBe("EUR")
      // Verify conversion produced reasonable results
      expect(eurRange.min.isPositive()).toBe(true)
      expect(eurRange.max.isPositive()).toBe(true)
      expect(eurRange.max.greaterThan(eurRange.min)).toBe(true)
    })

    it("throws error for incompatible exchange rate", () => {
      const btcRate = new ExchangeRate(BTC, EUR, "50000")
      expect(() => {
        usdRange.convert(btcRate)
      }).toThrow("Cannot convert")
    })
  })

  describe("JSON Serialization", () => {
    const range = new PriceRange(Money("$50"), Money("$100"))

    it("serializes to JSON", () => {
      const json = range.toJSON()
      expect(json).toHaveProperty("min")
      expect(json).toHaveProperty("max")
      expect(typeof json.min).toBe("object")
      expect(typeof json.max).toBe("object")
    })

    it("deserializes from JSON", () => {
      const json = range.toJSON()
      const restored = PriceRange.fromJSON(json)
      expect(restored.equals(range)).toBe(true)
    })

    it("handles compact JSON format", () => {
      const json = range.toJSON({ compact: true })
      const restored = PriceRange.fromJSON(json)
      expect(restored.equals(range)).toBe(true)
    })
  })

  describe("Equality", () => {
    const range1 = new PriceRange(Money("$50"), Money("$100"))
    const range2 = new PriceRange(Money("$50"), Money("$100"))
    const range3 = new PriceRange(Money("$60"), Money("$100"))

    it("identifies equal ranges", () => {
      expect(range1.equals(range2)).toBe(true)
    })

    it("identifies unequal ranges", () => {
      expect(range1.equals(range3)).toBe(false)
    })

    it("handles different currencies", () => {
      const eurRange = new PriceRange(Money("€50"), Money("€100"))
      expect(range1.equals(eurRange)).toBe(false)
    })
  })

  describe("Edge Cases", () => {
    it("handles very small amounts", () => {
      const range = new PriceRange(Money("$0.01"), Money("$0.02"))
      expect(range.span.equals(Money("$0.01"))).toBe(true)
      // Check that midpoint is between min and max
      expect(range.contains(range.midpoint)).toBe(true)
      expect(range.midpoint.greaterThanOrEqual(range.min)).toBe(true)
      expect(range.midpoint.lessThanOrEqual(range.max)).toBe(true)
    })

    it("handles cryptocurrency precision", () => {
      const range = new PriceRange(Money("₿0.00000001"), Money("₿0.00000002"))
      // The span should show BTC formatting
      expect(range.span.toString()).toContain("0.00000001")
      expect(range.contains(Money("₿0.000000015"))).toBe(true)
    })

    it("handles zero values", () => {
      const range = new PriceRange(Money("$0"), Money("$100"))
      expect(range.contains(Money("$0"))).toBe(true)
      expect(range.min.isZero()).toBe(true)
    })
  })

  describe("Integration with Money filtering", () => {
    const range = new PriceRange(Money("$50"), Money("$100"))
    const products = [
      { name: "Item A", price: Money("$45") },
      { name: "Item B", price: Money("$75") },
      { name: "Item C", price: Money("$110") },
      { name: "Item D", price: Money("$50") },
      { name: "Item E", price: Money("$100") }
    ]

    it("filters products within range", () => {
      const inRange = products.filter(p => range.contains(p.price))
      expect(inRange.length).toBe(3)
      expect(inRange.map(p => p.name)).toEqual(["Item B", "Item D", "Item E"])
    })

    it("works with Money array methods", () => {
      const prices = products.map(p => p.price)
      const inRangePrices = prices.filter(price => range.contains(price))
      expect(inRangePrices.length).toBe(3)
    })
  })
})