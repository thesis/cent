import { FixedPoint, Rational } from "../src/index"

describe("README Examples", () => {
  describe("Quick Start", () => {
    it("should work as shown in Quick Start section", () => {
      // Create numbers from strings - auto-detects precision!
      const price = FixedPoint("125.50")
      const rate = FixedPoint("0.875")

      // Arithmetic operations with perfect precision
      const product = price.multiply(rate)
      expect(product.toString()).toBe("109.812")

      // Create rational numbers from fractions or decimals
      const oneThird = Rational("1/3")
      const decimal = Rational("0.25")

      expect(oneThird.toString()).toBe("1/3")
      expect(decimal.toString()).toBe("1/4") // simplified

      // Seamless conversion between types
      const fromRational = FixedPoint(oneThird.toDecimalString(6)) // 6 decimal places
      expect(fromRational.toString()).toBe("0.333333")
    })
  })

  describe("Examples Section", () => {
    it("should work as shown in FixedPoint examples", () => {
      // FixedPoint - Perfect for decimal numbers
      const price = FixedPoint("1255.50") // Auto-detects 2 decimals
      const rate = FixedPoint("0.875") // Auto-detects 3 decimals

      // Arithmetic operations with automatic precision handling
      const product = price.multiply(rate)
      expect(product.toString()).toBe("1098.562")

      // Precise division (only factors of 2 and 5)
      const half = price.divide(2n)
      const fifth = price.divide(5n)
      const tenth = price.divide(10n)

      expect(half.toString()).toBe("627.750")
      expect(fifth.toString()).toBe("251.100")
      expect(tenth.toString()).toBe("125.550")

      // Comparison operations
      expect(price.greaterThan(rate)).toBe(true)
      expect(price.lessThanOrEqual(rate)).toBe(false)

      // Also supports original constructor for explicit control
      const explicit = FixedPoint(125550n, 2n) // Same as FixedPoint('1255.50')
      expect(explicit.equals(price)).toBe(true)
    })

    it("should work as shown in Rational examples", () => {
      // Create from fraction strings
      const oneThird = Rational("1/3")
      const twoFifths = Rational("2/5")

      // Create from decimal strings (auto-converted to fractions)
      const quarter = Rational("0.25") // Becomes 1/4
      const decimal = Rational("0.125") // Becomes 1/8

      expect(quarter.toString()).toBe("1/4")
      expect(decimal.toString()).toBe("1/8")

      // Exact arithmetic
      const sum = oneThird.add(twoFifths) // (1/3) + (2/5) = 11/15
      expect(sum.toString()).toBe("11/15")

      const product = oneThird.multiply(twoFifths) // (1/3) * (2/5) = 2/15
      expect(product.toString()).toBe("2/15")

      // Automatic simplification
      const simplified = Rational("6/9")
      expect(simplified.toString()).toBe("2/3")

      // Also supports original constructor
      const explicit = Rational({ p: 1n, q: 10n }) // Same as Rational('1/10')
      const fromString = Rational("1/10")
      expect(explicit.toString()).toBe(fromString.toString())
    })

    it("should work as shown in conversion examples", () => {
      // Seamless conversion between types
      const rational = Rational("3/8")
      const decimalStr = rational.toDecimalString() // "0.375"
      const fixedPoint = FixedPoint(decimalStr) // Auto-detects 3 decimals
      expect(fixedPoint.toString()).toBe("0.375")
    })
  })
})
