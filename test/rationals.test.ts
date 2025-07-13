import { RationalNumber, Rational } from "../src/rationals"
import { Ratio, RoundingMode } from "../src/types"
import { getBitSize } from "../src/math-utils"

describe("RationalNumber", () => {
  const oneHalf: Ratio = { p: 1n, q: 2n } // 1/2
  const oneThird: Ratio = { p: 1n, q: 3n } // 1/3
  const twoFifths: Ratio = { p: 2n, q: 5n } // 2/5
  const threeFourths: Ratio = { p: 3n, q: 4n } // 3/4
  const negativeOneHalf: Ratio = { p: -1n, q: 2n } // -1/2
  const zero: Ratio = { p: 0n, q: 1n } // 0/1

  describe("constructor", () => {
    it("should create a RationalNumber with the provided ratio", () => {
      const rational = new RationalNumber(oneHalf)
      expect(rational.p).toBe(1n)
      expect(rational.q).toBe(2n)
    })

    it("should implement Ratio interface", () => {
      const rational = new RationalNumber(oneHalf)
      expect(rational).toHaveProperty("p")
      expect(rational).toHaveProperty("q")
      expect(typeof rational.p).toBe("bigint")
      expect(typeof rational.q).toBe("bigint")
    })
  })

  describe("multiply", () => {
    it("should multiply two positive rationals correctly", () => {
      // (1/2) * (1/3) = 1/6
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.multiply(oneThird)
      expect(result.p).toBe(1n)
      expect(result.q).toBe(6n)
    })

    it("should multiply with negative rationals correctly", () => {
      // (1/2) * (-1/2) = -1/4
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.multiply(negativeOneHalf)
      expect(result.p).toBe(-1n)
      expect(result.q).toBe(4n)
    })

    it("should multiply by zero to get zero", () => {
      // (1/2) * (0/1) = 0/2
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.multiply(zero)
      expect(result.p).toBe(0n)
      expect(result.q).toBe(2n)
    })

    it("should return a new RationalNumber instance", () => {
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.multiply(oneThird)
      expect(result).toBeInstanceOf(RationalNumber)
      expect(result).not.toBe(rational1)
    })
  })

  describe("divide", () => {
    it("should divide two positive rationals correctly", () => {
      // (1/2) / (1/3) = (1/2) * (3/1) = 3/2
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.divide(oneThird)
      expect(result.p).toBe(3n)
      expect(result.q).toBe(2n)
    })

    it("should divide with negative rationals correctly", () => {
      // (1/2) / (-1/2) = (1/2) * (2/-1) = 2/-2 = -1
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.divide(negativeOneHalf)
      expect(result.p).toBe(2n)
      expect(result.q).toBe(-2n)
    })

    it("should throw error when dividing by zero", () => {
      const rational1 = new RationalNumber(oneHalf)
      expect(() => rational1.divide(zero)).toThrow("Cannot divide by zero")
    })

    it("should return a new RationalNumber instance", () => {
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.divide(oneThird)
      expect(result).toBeInstanceOf(RationalNumber)
      expect(result).not.toBe(rational1)
    })
  })

  describe("add", () => {
    it("should add two positive rationals correctly", () => {
      // (1/2) + (1/3) = (3 + 2)/6 = 5/6
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.add(oneThird)
      expect(result.p).toBe(5n)
      expect(result.q).toBe(6n)
    })

    it("should add positive and negative rationals correctly", () => {
      // (1/2) + (-1/2) = (1 - 1)/2 = 0/2, simplified to 0/1
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.add(negativeOneHalf)
      expect(result.p).toBe(0n)
      expect(result.q).toBe(1n) // Automatically simplified from 0/2 to 0/1
    })

    it("should add with zero correctly", () => {
      // (1/2) + (0/1) = (1 + 0)/2 = 1/2
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.add(zero)
      expect(result.p).toBe(1n)
      expect(result.q).toBe(2n)
    })

    it("should add rationals with different denominators", () => {
      // (2/5) + (3/4) = (8 + 15)/20 = 23/20
      const rational1 = new RationalNumber(twoFifths)
      const result = rational1.add(threeFourths)
      expect(result.p).toBe(23n)
      expect(result.q).toBe(20n)
    })

    it("should return a new RationalNumber instance", () => {
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.add(oneThird)
      expect(result).toBeInstanceOf(RationalNumber)
      expect(result).not.toBe(rational1)
    })
  })

  describe("subtract", () => {
    it("should subtract two positive rationals correctly", () => {
      // (1/2) - (1/3) = (3 - 2)/6 = 1/6
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.subtract(oneThird)
      expect(result.p).toBe(1n)
      expect(result.q).toBe(6n)
    })

    it("should subtract to get negative result", () => {
      // (1/3) - (1/2) = (2 - 3)/6 = -1/6
      const rational1 = new RationalNumber(oneThird)
      const result = rational1.subtract(oneHalf)
      expect(result.p).toBe(-1n)
      expect(result.q).toBe(6n)
    })

    it("should subtract negative rationals correctly", () => {
      // (1/2) - (-1/2) = (1*2 - 2*(-1))/(2*2) = (2 + 2)/4 = 4/4, simplified to 1/1
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.subtract(negativeOneHalf)
      expect(result.p).toBe(1n) // Automatically simplified from 4/4 to 1/1
      expect(result.q).toBe(1n)
    })

    it("should subtract zero correctly", () => {
      // (1/2) - (0/1) = (1 - 0)/2 = 1/2
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.subtract(zero)
      expect(result.p).toBe(1n)
      expect(result.q).toBe(2n)
    })

    it("should subtract rationals with different denominators", () => {
      // (3/4) - (2/5) = (15 - 8)/20 = 7/20
      const rational1 = new RationalNumber(threeFourths)
      const result = rational1.subtract(twoFifths)
      expect(result.p).toBe(7n)
      expect(result.q).toBe(20n)
    })

    it("should return a new RationalNumber instance", () => {
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.subtract(oneThird)
      expect(result).toBeInstanceOf(RationalNumber)
      expect(result).not.toBe(rational1)
    })
  })

  describe("toString", () => {
    it("should return simplified ratio in p/q format", () => {
      const rational = new RationalNumber({ p: 6n, q: 9n })
      expect(rational.toString()).toBe("2/3") // Simplified from 6/9
    })

    it("should handle negative ratios correctly", () => {
      const rational = new RationalNumber({ p: -3n, q: 4n })
      expect(rational.toString()).toBe("-3/4")
    })

    it("should handle zero numerator", () => {
      const rational = new RationalNumber({ p: 0n, q: 5n })
      expect(rational.toString()).toBe("0/1") // Simplified
    })

    it("should handle whole numbers", () => {
      const rational = new RationalNumber({ p: 10n, q: 2n })
      expect(rational.toString()).toBe("5/1") // Simplified
    })

    it("should handle negative denominator by moving sign to numerator", () => {
      const rational = new RationalNumber({ p: 3n, q: -4n })
      expect(rational.toString()).toBe("-3/4") // Sign moved to numerator
    })
  })

  describe("toDecimalString", () => {
    it("should convert simple fractions to decimal strings", () => {
      const half = new RationalNumber({ p: 1n, q: 2n })
      expect(half.toDecimalString()).toBe("0.5")

      const quarter = new RationalNumber({ p: 1n, q: 4n })
      expect(quarter.toDecimalString()).toBe("0.25")
    })

    it("should handle whole numbers without decimals", () => {
      const whole = new RationalNumber({ p: 10n, q: 2n })
      expect(whole.toDecimalString()).toBe("5")
    })

    it("should handle negative ratios", () => {
      const negativeHalf = new RationalNumber({ p: -1n, q: 2n })
      expect(negativeHalf.toDecimalString()).toBe("-0.5")

      const negativeWhole = new RationalNumber({ p: -10n, q: 2n })
      expect(negativeWhole.toDecimalString()).toBe("-5")
    })

    it("should handle repeating decimals up to precision limit", () => {
      const oneThird = new RationalNumber({ p: 1n, q: 3n })
      const result = oneThird.toDecimalString(10n)
      expect(result).toBe("0.3333333333")
    })

    it("should remove trailing zeros", () => {
      const tenths = new RationalNumber({ p: 1n, q: 10n })
      expect(tenths.toDecimalString()).toBe("0.1")

      const hundredths = new RationalNumber({ p: 5n, q: 100n })
      expect(hundredths.toDecimalString()).toBe("0.05")
    })

    it("should use default precision of 50", () => {
      const oneThird = new RationalNumber({ p: 1n, q: 3n })
      const result = oneThird.toDecimalString()
      expect(result.length).toBe(52) // "0." + 50 3's
      expect(
        result.startsWith("0.333333333333333333333333333333333333333333333333"),
      ).toBe(true)
    })

    it("should throw error for zero denominator", () => {
      const invalid = new RationalNumber({ p: 1n, q: 0n })
      expect(() => invalid.toDecimalString()).toThrow("Division by zero")
    })

    it("should handle zero numerator", () => {
      const zero = new RationalNumber({ p: 0n, q: 5n })
      expect(zero.toDecimalString()).toBe("0")
    })

    it("should handle negative denominators by normalizing sign", () => {
      const ratio = new RationalNumber({ p: 1n, q: -2n })
      expect(ratio.toDecimalString()).toBe("-0.5")
    })

    it("should terminate when remainder becomes zero", () => {
      const eighth = new RationalNumber({ p: 1n, q: 8n })
      expect(eighth.toDecimalString()).toBe("0.125")
    })

    it("should handle large numbers correctly", () => {
      const large = new RationalNumber({ p: 123456789n, q: 100000000n })
      expect(large.toDecimalString()).toBe("1.23456789")
    })
  })

  describe("equivalence with FixedPointNumber", () => {
    it("should match FixedPointNumber.toString() for equivalent values", () => {
      // Import FixedPointNumber for comparison
      const { FixedPointNumber } = require("../src/fixed-point")

      // Test 1/2 = 0.5
      const half = new RationalNumber({ p: 1n, q: 2n })
      const halfFixed = new FixedPointNumber(5n, 1n) // 0.5
      expect(half.toDecimalString()).toBe(halfFixed.toString())

      // Test 1/4 = 0.25
      const quarter = new RationalNumber({ p: 1n, q: 4n })
      const quarterFixed = new FixedPointNumber(25n, 2n) // 0.25
      expect(quarter.toDecimalString()).toBe(quarterFixed.toString())

      // Test 3/4 = 0.75
      const threeQuarters = new RationalNumber({ p: 3n, q: 4n })
      const threeQuartersFixed = new FixedPointNumber(75n, 2n) // 0.75
      expect(threeQuarters.toDecimalString()).toBe(
        threeQuartersFixed.toString(),
      )

      // Test 1/10 = 0.1
      const tenth = new RationalNumber({ p: 1n, q: 10n })
      const tenthFixed = new FixedPointNumber(1n, 1n) // 0.1
      expect(tenth.toDecimalString()).toBe(tenthFixed.toString())
    })

    it("should handle negative values equivalently", () => {
      const { FixedPointNumber } = require("../src/fixed-point")

      const negativeHalf = new RationalNumber({ p: -1n, q: 2n })
      expect(negativeHalf.toDecimalString()).toBe("-0.5")

      // Now that FixedPointNumber.toString() is fixed, we can compare directly
      const negativeHalfFixed = new FixedPointNumber(-5n, 1n) // -0.5
      expect(negativeHalfFixed.toString()).toBe("-0.5")
      expect(negativeHalf.toDecimalString()).toBe(negativeHalfFixed.toString())
    })

    it("should handle whole numbers equivalently", () => {
      const { FixedPointNumber } = require("../src/fixed-point")

      const five = new RationalNumber({ p: 10n, q: 2n })
      const fiveFixed = new FixedPointNumber(5n, 0n) // 5
      expect(five.toDecimalString()).toBe(fiveFixed.toString())
    })
  })
})

describe("Rational factory function", () => {
  describe("fraction string parsing mode", () => {
    it("should parse simple fractions", () => {
      const r = Rational("1234/97328")
      expect(r).toBeInstanceOf(RationalNumber)
      expect(r.p).toBe(1234n)
      expect(r.q).toBe(97328n)
    })

    it("should parse negative fractions", () => {
      const r = Rational("-3/4")
      expect(r.p).toBe(-3n)
      expect(r.q).toBe(4n)
    })

    it("should parse fractions with spaces", () => {
      const r = Rational(" 123 / 456 ")
      expect(r.p).toBe(123n)
      expect(r.q).toBe(456n)
    })

    it("should parse whole numbers as fractions", () => {
      const r = Rational("5/1")
      expect(r.p).toBe(5n)
      expect(r.q).toBe(1n)
    })

    it("should throw for zero denominator", () => {
      expect(() => Rational("1/0")).toThrow("Denominator cannot be zero")
    })

    it("should throw for invalid fraction format", () => {
      expect(() => Rational("1/2/3")).toThrow("Invalid fraction format")
      expect(() => Rational("1/")).toThrow()
      expect(() => Rational("/2")).toThrow()
      expect(() => Rational("abc/def")).toThrow()
    })
  })

  describe("decimal string parsing mode", () => {
    it("should parse decimal numbers and convert to fractions", () => {
      const r = Rational("12234.352453")
      expect(r).toBeInstanceOf(RationalNumber)
      // Should be equivalent to 12234352453/1000000 (6 decimal places)
      expect(r.p).toBe(12234352453n)
      expect(r.q).toBe(1000000n)
    })

    it("should parse simple decimals", () => {
      const r = Rational("0.5")
      expect(r.p).toBe(5n)
      expect(r.q).toBe(10n)
    })

    it("should parse whole numbers as decimals", () => {
      const r = Rational("123")
      expect(r.p).toBe(123n)
      expect(r.q).toBe(1n)
    })

    it("should parse negative decimals", () => {
      const r = Rational("-1.25")
      expect(r.p).toBe(-125n)
      expect(r.q).toBe(100n)
    })

    it("should parse zero", () => {
      const r = Rational("0")
      expect(r.p).toBe(0n)
      expect(r.q).toBe(1n)
    })

    it("should parse zero with decimals", () => {
      const r = Rational("0.000")
      expect(r.p).toBe(0n)
      expect(r.q).toBe(1000n)
    })

    it("should work with DecimalString type", () => {
      const decimalStr = "0.75" as any // Simulating DecimalString
      const r = Rational(decimalStr)
      expect(r.p).toBe(75n)
      expect(r.q).toBe(100n)
    })
  })

  describe("original constructor mode", () => {
    it("should work with Ratio objects", () => {
      const ratio: Ratio = { p: 3n, q: 8n }
      const r = Rational(ratio)
      expect(r).toBeInstanceOf(RationalNumber)
      expect(r.p).toBe(3n)
      expect(r.q).toBe(8n)
    })

    it("should work with negative ratios", () => {
      const ratio: Ratio = { p: -7n, q: 12n }
      const r = Rational(ratio)
      expect(r.p).toBe(-7n)
      expect(r.q).toBe(12n)
    })

    it("should work with zero numerator", () => {
      const ratio: Ratio = { p: 0n, q: 5n }
      const r = Rational(ratio)
      expect(r.p).toBe(0n)
      expect(r.q).toBe(5n)
    })
  })

  describe("equivalence with constructor", () => {
    it("should produce same results as constructor for Ratio mode", () => {
      const ratio: Ratio = { p: 22n, q: 7n }
      const factory = Rational(ratio)
      const constructor = new RationalNumber(ratio)
      expect(factory.p).toBe(constructor.p)
      expect(factory.q).toBe(constructor.q)
    })

    it("should produce equivalent results for fraction strings", () => {
      const factory = Rational("22/7")
      const constructor = new RationalNumber({ p: 22n, q: 7n })
      expect(factory.p).toBe(constructor.p)
      expect(factory.q).toBe(constructor.q)
    })

    it("should round-trip with toString for fractions", () => {
      const original = new RationalNumber({ p: 355n, q: 113n })
      const str = original.toString() // "355/113"
      const parsed = Rational(str)
      expect(parsed.p).toBe(original.p)
      expect(parsed.q).toBe(original.q)
    })

    it("should round-trip with toDecimalString for simple decimals", () => {
      const original = new RationalNumber({ p: 1n, q: 4n })
      const str = original.toDecimalString() // "0.25"
      const parsed = Rational(str)
      // Should be equivalent but might not have exact same p/q due to decimal conversion
      expect(parsed.toDecimalString()).toBe(original.toDecimalString())
    })

    it("should support bigint p, q arguments", () => {
      const r = Rational(22n, 7n)
      expect(r.p).toBe(22n)
      expect(r.q).toBe(7n)
      expect(r.toString()).toBe("22/7")
    })

    it("should throw error when q is missing with bigint p", () => {
      expect(() => {
        // @ts-expect-error - Testing runtime error for missing q parameter
        Rational(22n)
      }).toThrow("q parameter is required when creating Rational with bigint p")
    })
  })

  describe("String argument support", () => {
    const oneThird = new RationalNumber({ p: 1n, q: 3n }) // 1/3
    const twoFifths = new RationalNumber({ p: 2n, q: 5n }) // 2/5
    const quarter = new RationalNumber({ p: 1n, q: 4n }) // 1/4

    describe("add", () => {
      it("should add fraction strings", () => {
        const result = oneThird.add("2/5")
        // 1/3 + 2/5 = 5/15 + 6/15 = 11/15
        expect(result.p).toBe(11n)
        expect(result.q).toBe(15n)
        expect(result.toString()).toBe("11/15")
      })

      it("should add decimal strings", () => {
        const result = quarter.add("0.25") // 1/4 + 1/4 = 1/2
        const simplified = result.simplify()
        expect(simplified.p).toBe(1n)
        expect(simplified.q).toBe(2n)
        expect(simplified.toString()).toBe("1/2")
      })

      it("should handle mixed fraction and decimal strings", () => {
        const result = oneThird.add("0.5") // 1/3 + 1/2 = 2/6 + 3/6 = 5/6
        const simplified = result.simplify()
        expect(simplified.p).toBe(5n)
        expect(simplified.q).toBe(6n)
      })

      it("should handle negative fraction strings", () => {
        const result = oneThird.add("-1/6") // 1/3 - 1/6 = 2/6 - 1/6 = 1/6
        const simplified = result.simplify()
        expect(simplified.p).toBe(1n)
        expect(simplified.q).toBe(6n)
      })

      it("should handle integer strings", () => {
        const result = oneThird.add("1") // 1/3 + 1 = 1/3 + 3/3 = 4/3
        expect(result.p).toBe(4n)
        expect(result.q).toBe(3n)
      })
    })

    describe("subtract", () => {
      it("should subtract fraction strings", () => {
        const result = twoFifths.subtract("1/5") // 2/5 - 1/5 = 1/5
        expect(result.p).toBe(1n)
        expect(result.q).toBe(5n)
        expect(result.toString()).toBe("1/5")
      })

      it("should subtract decimal strings", () => {
        const result = quarter.subtract("0.125") // 1/4 - 1/8 = 2/8 - 1/8 = 1/8
        const simplified = result.simplify()
        expect(simplified.p).toBe(1n)
        expect(simplified.q).toBe(8n)
      })

      it("should handle negative results", () => {
        const result = quarter.subtract("0.5") // 1/4 - 1/2 = 1/4 - 2/4 = -1/4
        const simplified = result.simplify()
        expect(simplified.p).toBe(-1n)
        expect(simplified.q).toBe(4n)
      })
    })

    describe("multiply", () => {
      it("should multiply by fraction strings", () => {
        const result = oneThird.multiply("3/4") // 1/3 * 3/4 = 3/12 = 1/4
        const simplified = result.simplify()
        expect(simplified.p).toBe(1n)
        expect(simplified.q).toBe(4n)
      })

      it("should multiply by decimal strings", () => {
        const result = twoFifths.multiply("2.5") // 2/5 * 5/2 = 10/10 = 1
        const simplified = result.simplify()
        expect(simplified.p).toBe(1n)
        expect(simplified.q).toBe(1n)
      })

      it("should multiply by integer strings", () => {
        const result = oneThird.multiply("6") // 1/3 * 6 = 6/3 = 2
        const simplified = result.simplify()
        expect(simplified.p).toBe(2n)
        expect(simplified.q).toBe(1n)
      })
    })

    describe("divide", () => {
      it("should divide by fraction strings", () => {
        const result = oneThird.divide("1/6") // 1/3 ÷ 1/6 = 1/3 * 6/1 = 6/3 = 2
        const simplified = result.simplify()
        expect(simplified.p).toBe(2n)
        expect(simplified.q).toBe(1n)
      })

      it("should divide by decimal strings", () => {
        const result = quarter.divide("0.5") // 1/4 ÷ 1/2 = 1/4 * 2/1 = 2/4 = 1/2
        const simplified = result.simplify()
        expect(simplified.p).toBe(1n)
        expect(simplified.q).toBe(2n)
      })

      it("should throw on division by zero string", () => {
        expect(() => oneThird.divide("0")).toThrow("Cannot divide by zero")
        expect(() => oneThird.divide("0/1")).toThrow("Cannot divide by zero")
      })
    })

    describe("equals", () => {
      it("should compare with fraction strings", () => {
        expect(oneThird.equals("1/3")).toBe(true)
        expect(oneThird.equals("2/6")).toBe(true) // Equivalent fraction
        expect(oneThird.equals("1/4")).toBe(false)
      })

      it("should compare with decimal strings", () => {
        expect(quarter.equals("0.25")).toBe(true)
        expect(quarter.equals("0.250")).toBe(true) // Trailing zeros
        expect(quarter.equals("0.26")).toBe(false)
      })

      it("should handle improper fractions", () => {
        const improper = new RationalNumber({ p: 7n, q: 3n }) // 7/3
        expect(improper.equals("7/3")).toBe(true)
        // Note: 2.333333333333333 is not exactly equal to 7/3 due to precision limits
        expect(improper.equals("2.333333333333333")).toBe(false)
        // 7/3 is a repeating decimal, so finite decimal approximations won't be exactly equal
        // But we can test that a simple fraction like 1/2 works correctly
        const half = new RationalNumber({ p: 1n, q: 2n })
        expect(half.equals(half.toDecimalString())).toBe(true)
      })

      it("should handle negative comparisons", () => {
        const negative = new RationalNumber({ p: -1n, q: 4n }) // -1/4
        expect(negative.equals("-1/4")).toBe(true)
        expect(negative.equals("-0.25")).toBe(true)
      })
    })

    describe("greaterThan", () => {
      it("should compare with fraction strings", () => {
        expect(twoFifths.greaterThan("1/3")).toBe(true) // 2/5 = 0.4 > 1/3 ≈ 0.333
        expect(oneThird.greaterThan("2/5")).toBe(false)
        expect(oneThird.greaterThan("1/3")).toBe(false) // Equal
      })

      it("should compare with decimal strings", () => {
        expect(twoFifths.greaterThan("0.3")).toBe(true) // 2/5 = 0.4 > 0.3
        expect(quarter.greaterThan("0.3")).toBe(false) // 1/4 = 0.25 < 0.3
      })
    })

    describe("greaterThanOrEqual", () => {
      it("should handle equal values", () => {
        expect(oneThird.greaterThanOrEqual("1/3")).toBe(true)
        expect(oneThird.greaterThanOrEqual("2/6")).toBe(true) // Equivalent
      })

      it("should handle greater values", () => {
        expect(twoFifths.greaterThanOrEqual("1/3")).toBe(true)
      })

      it("should handle lesser values", () => {
        expect(quarter.greaterThanOrEqual("1/2")).toBe(false)
      })
    })

    describe("lessThan", () => {
      it("should compare with fraction strings", () => {
        expect(oneThird.lessThan("2/5")).toBe(true)
        expect(twoFifths.lessThan("1/3")).toBe(false)
        expect(oneThird.lessThan("1/3")).toBe(false) // Equal
      })

      it("should compare with decimal strings", () => {
        expect(quarter.lessThan("0.3")).toBe(true) // 1/4 = 0.25 < 0.3
        expect(twoFifths.lessThan("0.3")).toBe(false) // 2/5 = 0.4 > 0.3
      })
    })

    describe("lessThanOrEqual", () => {
      it("should handle equal values", () => {
        expect(oneThird.lessThanOrEqual("1/3")).toBe(true)
        expect(quarter.lessThanOrEqual("0.25")).toBe(true)
      })

      it("should handle lesser values", () => {
        expect(quarter.lessThanOrEqual("1/2")).toBe(true)
      })

      it("should handle greater values", () => {
        expect(twoFifths.lessThanOrEqual("1/4")).toBe(false)
      })
    })

    describe("max", () => {
      it("should handle string arguments", () => {
        const result = quarter.max("1/2")
        expect(result.p).toBe(1n)
        expect(result.q).toBe(2n)
      })

      it("should handle array of strings", () => {
        const result = quarter.max(["1/8", "1/2", "1/3"])
        expect(result.p).toBe(1n)
        expect(result.q).toBe(2n)
      })

      it("should handle mixed string and Ratio arguments", () => {
        const half = { p: 1n, q: 2n }
        const result = quarter.max([half, "1/3"])
        expect(result.p).toBe(1n)
        expect(result.q).toBe(2n)
      })

      it("should handle decimal strings", () => {
        const result = quarter.max("0.3") // 0.3 = 3/10 > 1/4
        expect(result.p).toBe(3n)
        expect(result.q).toBe(10n)
      })
    })

    describe("min", () => {
      it("should handle string arguments", () => {
        const result = twoFifths.min("1/6")
        expect(result.p).toBe(1n)
        expect(result.q).toBe(6n)
      })

      it("should handle array of strings", () => {
        const result = twoFifths.min(["1/2", "1/6", "1/3"])
        expect(result.p).toBe(1n)
        expect(result.q).toBe(6n)
      })

      it("should handle mixed string and Ratio arguments", () => {
        const sixth = { p: 1n, q: 6n }
        const result = twoFifths.min([sixth, "1/3"])
        expect(result.p).toBe(1n)
        expect(result.q).toBe(6n)
      })

      it("should handle decimal strings", () => {
        const result = quarter.min("0.1") // 0.1 = 1/10 < 1/4
        expect(result.p).toBe(1n)
        expect(result.q).toBe(10n)
      })
    })

    describe("Edge cases and error handling", () => {
      it("should preserve Ratio instance when passed instead of string", () => {
        const result = oneThird.add(twoFifths)
        expect(result.p).toBe(11n)
        expect(result.q).toBe(15n)
      })

      it("should handle complex fraction strings", () => {
        const result = oneThird.add("22/7") // Adding pi approximation
        const simplified = result.simplify()
        expect(simplified.p).toBe(73n)
        expect(simplified.q).toBe(21n)
      })

      it("should handle very precise decimal strings", () => {
        const result = quarter.add("0.123456789")
        // Should convert decimal to fraction and add: 1/4 + 123456789/1000000000 = 373456789/1000000000
        expect(result.toString()).toBe("373456789/1000000000")
      })

      it("should handle negative fractions", () => {
        const negative = new RationalNumber({ p: -1n, q: 4n })
        const result = negative.add("-1/4")
        expect(result.p).toBe(-1n)
        expect(result.q).toBe(2n)
      })

      it("should throw on invalid fraction strings", () => {
        expect(() => oneThird.add("invalid")).toThrow()
        expect(() => oneThird.add("1/0")).toThrow()
        expect(() => oneThird.add("1/")).toThrow()
      })

      it("should handle zero strings", () => {
        expect(oneThird.add("0").equals("1/3")).toBe(true)
        expect(oneThird.add("0/1").equals("1/3")).toBe(true)
        expect(oneThird.multiply("0").equals("0/1")).toBe(true)
      })

      it("should handle integer strings as fractions", () => {
        const result = oneThird.add("2") // 1/3 + 2 = 1/3 + 6/3 = 7/3
        expect(result.p).toBe(7n)
        expect(result.q).toBe(3n)
      })

      it("should maintain precision with high precision decimals", () => {
        const result = oneThird.multiply("3.141592653589793")
        // Should maintain full precision in fraction form: (1/3) * (3141592653589793/1000000000000000)
        expect(result.toDecimalString(15)).toBe("1.047197551196597")
      })
    })
  })

  describe("getBitSize", () => {
    it("should return 1 for zero rational", () => {
      const rational = new RationalNumber({ p: 0n, q: 1n })
      expect(rational.getBitSize()).toBe(1) // getBitSize(0n) + getBitSize(1n) = 0 + 1 = 1
    })

    it("should calculate bit size for simple rationals", () => {
      const rational = new RationalNumber({ p: 1n, q: 2n }) // 1/2
      expect(rational.getBitSize()).toBe(3) // getBitSize(1n) = 1, getBitSize(2n) = 2, total = 3
    })

    it("should calculate bit size for various rationals", () => {
      const rational1 = new RationalNumber({ p: 3n, q: 4n }) // 3/4
      expect(rational1.getBitSize()).toBe(5) // getBitSize(3n) = 2, getBitSize(4n) = 3, total = 5

      const rational2 = new RationalNumber({ p: 7n, q: 8n }) // 7/8
      expect(rational2.getBitSize()).toBe(7) // getBitSize(7n) = 3, getBitSize(8n) = 4, total = 7

      const rational3 = new RationalNumber({ p: 15n, q: 16n }) // 15/16
      expect(rational3.getBitSize()).toBe(9) // getBitSize(15n) = 4, getBitSize(16n) = 5, total = 9
    })

    it("should handle negative numerators", () => {
      const rational = new RationalNumber({ p: -1n, q: 2n }) // -1/2
      expect(rational.getBitSize()).toBe(3) // getBitSize(-1n) = 1, getBitSize(2n) = 2, total = 3
    })

    it("should handle large numbers", () => {
      const largeP = BigInt("12345678901234567890")
      const largeQ = BigInt("98765432109876543210")
      const rational = new RationalNumber({ p: largeP, q: largeQ })
      
      const expectedSize = largeP.toString(2).length + largeQ.toString(2).length
      expect(rational.getBitSize()).toBe(expectedSize)
    })

    it("should work with simplified rationals", () => {
      const unsimplified = new RationalNumber({ p: 6n, q: 9n }) // 6/9 = 2/3
      const simplified = unsimplified.simplify()
      
      // Original: getBitSize(6n) = 3, getBitSize(9n) = 4, total = 7
      expect(unsimplified.getBitSize()).toBe(7)
      
      // Simplified: getBitSize(2n) = 2, getBitSize(3n) = 2, total = 4  
      expect(simplified.getBitSize()).toBe(4)
    })

    it("should be consistent with manual calculation", () => {
      const testCases = [
        { p: 1n, q: 1n },
        { p: 2n, q: 3n },
        { p: 5n, q: 7n },
        { p: 255n, q: 256n },
        { p: -1000n, q: 2000n },
      ]

      testCases.forEach(({ p, q }) => {
        const rational = new RationalNumber({ p, q })
        const pBits = p === 0n ? 0 : (p < 0n ? -p : p).toString(2).length
        const qBits = q === 0n ? 0 : (q < 0n ? -q : q).toString(2).length
        const expectedBits = pBits + qBits
        
        expect(rational.getBitSize()).toBe(expectedBits)
      })
    })
  })

  describe("toFixedPoint with lossy conversion", () => {
    describe("maxPrecision option", () => {
      it("should convert 22/7 to 2 significant digits", () => {
        const rational = new RationalNumber({ p: 22n, q: 7n }) // ≈ 3.142857...
        const result = rational.toFixedPoint({ maxPrecision: 2 })
        
        // 22/7 ≈ 3.142857, truncated to 2 significant digits = 3.1 = 31/10
        expect(result.amount).toBe(31n)
        expect(result.decimals).toBe(1n)
      })

      it("should convert 22/7 to 4 significant digits", () => {
        const rational = new RationalNumber({ p: 22n, q: 7n }) // ≈ 3.142857...
        const result = rational.toFixedPoint({ maxPrecision: 4 })
        
        // 22/7 ≈ 3.142857, truncated to 4 significant digits = 3.142 = 3142/1000
        expect(result.amount).toBe(3142n)
        expect(result.decimals).toBe(3n)
      })

      it("should handle large numbers with precision reduction", () => {
        const rational = new RationalNumber({ p: 300000n, q: 1n }) // 300000
        const result = rational.toFixedPoint({ maxPrecision: 1 })
        
        // 300000 truncated to 1 significant digit = 3 × 10^5 = 3/10^(-5)
        expect(result.amount).toBe(3n)
        expect(result.decimals).toBe(-5n)
      })

      it("should handle negative rationals", () => {
        const rational = new RationalNumber({ p: -22n, q: 7n }) // ≈ -3.142857...
        const result = rational.toFixedPoint({ maxPrecision: 2 })
        
        // -3.142857... truncated to 2 significant digits = -3.1 = -31/10
        expect(result.amount).toBe(-31n)
        expect(result.decimals).toBe(1n)
      })

      it("should handle fractions less than 1", () => {
        const rational = new RationalNumber({ p: 1n, q: 3n }) // ≈ 0.333333...
        const result = rational.toFixedPoint({ maxPrecision: 2 })
        
        // 1/3 ≈ 0.333333, truncated to 2 significant digits = 0.33 = 33/100
        expect(result.amount).toBe(33n)
        expect(result.decimals).toBe(2n)
      })

      it("should handle single significant digit", () => {
        const rational = new RationalNumber({ p: 22n, q: 7n }) // ≈ 3.142857...
        const result = rational.toFixedPoint({ maxPrecision: 1 })
        
        // 3.142857... truncated to 1 significant digit = 3 = 3/1
        expect(result.amount).toBe(3n)
        expect(result.decimals).toBe(0n)
      })

      it("should handle different rounding modes", () => {
        const rational = new RationalNumber({ p: 5n, q: 2n }) // 2.5
        
        const ceiling = rational.toFixedPoint({ maxPrecision: 1, roundingMode: RoundingMode.CEIL })
        expect(ceiling.amount).toBe(3n)
        expect(ceiling.decimals).toBe(0n)
        
        const floor = rational.toFixedPoint({ maxPrecision: 1, roundingMode: RoundingMode.FLOOR })
        expect(floor.amount).toBe(2n)
        expect(floor.decimals).toBe(0n)
        
        const halfEven = rational.toFixedPoint({ maxPrecision: 1, roundingMode: RoundingMode.HALF_EVEN })
        expect(halfEven.amount).toBe(2n) // 2.5 rounds to 2 (nearest even)
        expect(halfEven.decimals).toBe(0n)
      })

      it("should handle very small numbers", () => {
        const rational = new RationalNumber({ p: 1n, q: 1000000n }) // 0.000001
        const result = rational.toFixedPoint({ maxPrecision: 1 })
        
        // 0.000001 to 1 significant digit = 0.000001 = 1/1000000 (magnitude is -5, so 1 sig digit means 6 decimals)
        expect(result.amount).toBe(1n)
        expect(result.decimals).toBe(6n)
      })

      it("should handle exact decimal representations", () => {
        const rational = new RationalNumber({ p: 1n, q: 4n }) // 0.25 (exact)
        const result = rational.toFixedPoint({ maxPrecision: 2 })
        
        // 0.25 to 2 significant digits = 0.25 = 25/100
        expect(result.amount).toBe(25n)
        expect(result.decimals).toBe(2n)
      })

      it("should work with default rounding mode", () => {
        const rational = new RationalNumber({ p: 22n, q: 7n })
        const result = rational.toFixedPoint({ maxPrecision: 2 })
        
        // Should default to TRUNC and produce a valid result
        expect(typeof result.amount).toBe("bigint")
        expect(typeof result.decimals).toBe("bigint")
        expect(result.decimals).toBe(1n) // 2 significant digits of 3.14... = 3.1
      })
    })

    describe("maxBits option", () => {
      it("should convert using bit-based precision", () => {
        const rational = new RationalNumber({ p: 22n, q: 7n })
        const result = rational.toFixedPoint({ maxBits: 16 })
        
        // maxBits = 16 means we can use at most 16 bits total
        // This should determine the appropriate decimal precision automatically
        const totalBits = getBitSize(result.amount) + getBitSize(result.decimals)
        expect(totalBits).toBeLessThanOrEqual(16)
        expect(typeof result.amount).toBe("bigint")
        expect(typeof result.decimals).toBe("bigint")
      })

      it("should produce smaller numbers with smaller bit budgets", () => {
        const rational = new RationalNumber({ p: 22n, q: 7n })
        
        const result8 = rational.toFixedPoint({ maxBits: 8 })
        const result16 = rational.toFixedPoint({ maxBits: 16 })
        
        // 16-bit budget should allow for more precision than 8-bit
        const bits8 = getBitSize(result8.amount) + getBitSize(result8.decimals)
        const bits16 = getBitSize(result16.amount) + getBitSize(result16.decimals)
        
        expect(bits8).toBeLessThanOrEqual(8)
        expect(bits16).toBeLessThanOrEqual(16)
        expect(bits16).toBeGreaterThanOrEqual(bits8)
      })

      it("should handle very small bit budgets", () => {
        const rational = new RationalNumber({ p: 22n, q: 7n })
        const result = rational.toFixedPoint({ maxBits: 4 })
        
        // With only 4 bits, should still produce a valid result
        const totalBits = getBitSize(result.amount) + getBitSize(result.decimals)
        expect(totalBits).toBeLessThanOrEqual(4)
        expect(typeof result.amount).toBe("bigint")
        expect(typeof result.decimals).toBe("bigint")
      })

      it("should handle large bit budgets", () => {
        const rational = new RationalNumber({ p: 22n, q: 7n })
        const result = rational.toFixedPoint({ maxBits: 64 })
        
        // Large bit budget should allow high precision
        expect(typeof result.amount).toBe("bigint")
        expect(typeof result.decimals).toBe("bigint")
        expect(result.decimals).toBeGreaterThan(0n) // Should have some decimal precision
      })
    })

    describe("edge cases and error handling", () => {
      it("should handle zero rational", () => {
        const rational = new RationalNumber({ p: 0n, q: 1n })
        const result = rational.toFixedPoint({ maxPrecision: 2 })
        
        expect(result.amount).toBe(0n)
        expect(result.decimals).toBe(2n)
      })

      it("should handle very large rationals", () => {
        const rational = new RationalNumber({ p: 999999999999n, q: 1n })
        const result = rational.toFixedPoint({ maxPrecision: 1 })
        
        // Should successfully convert even very large numbers
        expect(typeof result.amount).toBe("bigint")
        expect(result.decimals).toBe(-11n) // 12-digit number truncated to 1 digit needs -11 decimal places
      })

      it("should throw error for invalid maxPrecision", () => {
        const rational = new RationalNumber({ p: 22n, q: 7n })
        
        expect(() => {
          rational.toFixedPoint({ maxPrecision: 0 })
        }).toThrow()
        
        expect(() => {
          rational.toFixedPoint({ maxPrecision: -1 })
        }).toThrow()
        
        expect(() => {
          rational.toFixedPoint({ maxPrecision: 51 })
        }).toThrow()
      })

      it("should throw error for invalid maxBits", () => {
        const rational = new RationalNumber({ p: 22n, q: 7n })
        
        expect(() => {
          rational.toFixedPoint({ maxBits: 0 })
        }).toThrow()
        
        expect(() => {
          rational.toFixedPoint({ maxBits: -1 })
        }).toThrow()
      })

      it("should throw error when both maxPrecision and maxBits are specified", () => {
        const rational = new RationalNumber({ p: 22n, q: 7n })
        
        expect(() => {
          rational.toFixedPoint({ 
            maxPrecision: 2, 
            maxBits: 16
          })
        }).toThrow()
      })

      it("should throw error when neither maxPrecision nor maxBits are specified", () => {
        const rational = new RationalNumber({ p: 22n, q: 7n })
        
        expect(() => {
          rational.toFixedPoint({})
        }).toThrow()
      })
    })

    describe("precision loss and rounding accuracy", () => {
      it("should be consistent with known mathematical results", () => {
        // Test π approximation (22/7) to various precisions
        const pi = new RationalNumber({ p: 22n, q: 7n })
        
        const result1 = pi.toFixedPoint({ maxPrecision: 1 })
        expect(result1.amount).toBe(3n) // 1 significant digit = 3
        expect(result1.decimals).toBe(0n)
        
        const result2 = pi.toFixedPoint({ maxPrecision: 2 })
        expect(result2.amount).toBe(31n) // 2 significant digits = 3.1 (truncated)
        expect(result2.decimals).toBe(1n)
      })

      it("should handle different rounding modes consistently", () => {
        // Test 2.5 (exact tie case) with different rounding modes
        const tie = new RationalNumber({ p: 5n, q: 2n })
        
        const trunc = tie.toFixedPoint({ maxPrecision: 1, roundingMode: RoundingMode.TRUNC })
        expect(trunc.amount).toBe(2n) // Truncate toward zero
        
        const halfEven = tie.toFixedPoint({ maxPrecision: 1, roundingMode: RoundingMode.HALF_EVEN })
        expect(halfEven.amount).toBe(2n) // Round to even
        
        const halfExpand = tie.toFixedPoint({ maxPrecision: 1, roundingMode: RoundingMode.HALF_EXPAND })
        expect(halfExpand.amount).toBe(3n) // Round away from zero
      })

      it("should preserve sign through truncation", () => {
        const negative = new RationalNumber({ p: -5n, q: 2n }) // -2.5
        
        const result = negative.toFixedPoint({ maxPrecision: 1 })
        expect(result.amount).toBe(-2n) // Truncate toward zero
        expect(result.decimals).toBe(0n)
      })
    })
  })
})
