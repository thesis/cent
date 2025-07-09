import {
  FixedPointNumber,
  FixedPointJSONSchema,
  FixedPoint,
} from "../src/fixed-point"

describe("FixedPointNumber", () => {
  describe("constructor", () => {
    it("should create a FixedPointNumber with the provided values", () => {
      const fp = new FixedPointNumber(123n, 2n)
      expect(fp.amount).toBe(123n)
      expect(fp.decimals).toBe(2n)
    })

    it("should create a FixedPointNumber with default values when none are provided", () => {
      const fp = new FixedPointNumber()
      expect(fp.amount).toBe(0n)
      expect(fp.decimals).toBe(0n)
    })
  })

  describe("add", () => {
    it("should add two FixedPointNumbers with the same decimals", () => {
      const fp1 = new FixedPointNumber(123n, 2n)
      const fp2 = new FixedPointNumber(456n, 2n)
      const result = fp1.add(fp2)

      expect(result.amount).toBe(579n)
      expect(result.decimals).toBe(2n)
    })

    it("should add numbers with different decimals by normalizing to higher precision", () => {
      const fp1 = new FixedPointNumber(123n, 2n) // 1.23
      const fp2 = new FixedPointNumber(456n, 3n) // 0.456
      const result = fp1.add(fp2)

      expect(result.amount).toBe(1686n) // 1230 + 456 = 1686 (in 3 decimal places)
      expect(result.decimals).toBe(3n)
    })

    it("should handle adding zero", () => {
      const fp = new FixedPointNumber(123n, 2n)
      const zero = new FixedPointNumber(0n, 2n)
      const result = fp.add(zero)

      expect(result.amount).toBe(123n)
      expect(result.decimals).toBe(2n)
    })

    it("should add any FixedPoint-compatible object", () => {
      const fp = new FixedPointNumber()
      const result = fp.add({ amount: 2n, decimals: 0n })

      expect(result.amount).toBe(2n)
      expect(result.decimals).toBe(0n)
      expect(result.equals({ amount: 2n, decimals: 0n })).toBe(true)
    })
  })

  describe("subtract", () => {
    it("should subtract two FixedPointNumbers with the same decimals", () => {
      const fp1 = new FixedPointNumber(456n, 2n)
      const fp2 = new FixedPointNumber(123n, 2n)
      const result = fp1.subtract(fp2)

      expect(result.amount).toBe(333n)
      expect(result.decimals).toBe(2n)
    })

    it("should subtract numbers with different decimals by normalizing to higher precision", () => {
      const fp1 = new FixedPointNumber(456n, 2n) // 4.56
      const fp2 = new FixedPointNumber(123n, 3n) // 0.123
      const result = fp1.subtract(fp2)

      expect(result.amount).toBe(4437n) // 4560 - 123 = 4437 (in 3 decimal places)
      expect(result.decimals).toBe(3n)
    })
  })

  describe("multiply", () => {
    it("should multiply by a bigint", () => {
      const fp = new FixedPointNumber(123n, 2n)
      const result = fp.multiply(2n)

      expect(result.amount).toBe(246n)
      expect(result.decimals).toBe(2n)
    })

    it("should multiply two FixedPointNumbers with the same decimals", () => {
      const fp1 = new FixedPointNumber(123n, 2n) // 1.23
      const fp2 = new FixedPointNumber(234n, 2n) // 2.34
      const result = fp1.multiply(fp2)

      // 1.23 * 2.34 = 2.8782, which would be 287n with 2 decimals (rounded down)
      expect(result.amount).toBe(287n)
      expect(result.decimals).toBe(2n)
    })

    it("should multiply FixedPoints with different decimals by normalizing to higher precision", () => {
      const fp1 = new FixedPointNumber(123n, 2n) // 1.23
      const fp2 = new FixedPointNumber(234n, 3n) // 0.234
      const result = fp1.multiply(fp2)

      // 1.23 * 0.234 = 0.28782, normalized to 3 decimals = 287n (truncated)
      expect(result.amount).toBe(287n)
      expect(result.decimals).toBe(3n)
    })
  })

  describe("divide", () => {
    describe("division by bigint", () => {
      it("should divide by powers of 2", () => {
        const fp = new FixedPointNumber(100n, 0n) // 100
        const result = fp.divide(4n) // 100 / 4 = 25.00 (needs 2 decimals for 4=2^2)

        expect(result.amount).toBe(2500n) // 25.00 as 2500 with 2 decimals
        expect(result.decimals).toBe(2n) // 4 = 2^2, needs 2 decimal places
      })

      it("should divide by powers of 5", () => {
        const fp = new FixedPointNumber(100n, 0n) // 100
        const result = fp.divide(25n) // 100 / 25 = 4.00 (needs 2 decimals for 25=5^2)

        expect(result.amount).toBe(400n) // 4.00 as 400 with 2 decimals
        expect(result.decimals).toBe(2n) // 25 = 5^2, needs 2 decimal places
      })

      it("should divide by powers of 10", () => {
        const fp = new FixedPointNumber(100n, 0n) // 100
        const result = fp.divide(10n) // 100 / 10 = 10.0 (needs 1 decimal for 10=2*5)

        expect(result.amount).toBe(100n) // 10.0 as 100 with 1 decimal
        expect(result.decimals).toBe(1n) // 10 = 2*5, needs 1 decimal place
      })

      it("should divide by combinations of 2 and 5", () => {
        const fp = new FixedPointNumber(200n, 1n) // 20.0
        const result = fp.divide(8n) // 20.0 / 8 = 2.500 (original 1 + 3 for 8=2^3)

        expect(result.amount).toBe(25000n) // 2.500 as 25000 with 4 decimals
        expect(result.decimals).toBe(4n) // original 1 + 3 for 8=2^3
      })

      it("should handle negative divisors", () => {
        const fp = new FixedPointNumber(100n, 0n) // 100
        const result = fp.divide(-4n) // 100 / -4 = -25.00

        expect(result.amount).toBe(-2500n) // -25.00 as -2500 with 2 decimals
        expect(result.decimals).toBe(2n)
      })

      it("should handle negative dividends", () => {
        const fp = new FixedPointNumber(-100n, 0n) // -100
        const result = fp.divide(4n) // -100 / 4 = -25.00

        expect(result.amount).toBe(-2500n) // -25.00 as -2500 with 2 decimals
        expect(result.decimals).toBe(2n)
      })

      it("should throw when dividing by zero", () => {
        const fp = new FixedPointNumber(100n, 0n)

        expect(() => fp.divide(0n)).toThrow("Cannot divide by zero")
      })

      it("should throw when dividing by numbers with factors other than 2 and 5", () => {
        const fp = new FixedPointNumber(100n, 0n)

        expect(() => fp.divide(3n)).toThrow(
          "divisor must be composed only of factors of 2 and 5",
        )
        expect(() => fp.divide(6n)).toThrow(
          "divisor must be composed only of factors of 2 and 5",
        )
        expect(() => fp.divide(7n)).toThrow(
          "divisor must be composed only of factors of 2 and 5",
        )
        expect(() => fp.divide(12n)).toThrow(
          "divisor must be composed only of factors of 2 and 5",
        )
      })
    })

    describe("division by FixedPoint", () => {
      it("should divide by FixedPoint with factors of 2 and 5 only", () => {
        const fp1 = new FixedPointNumber(100n, 1n) // 10.0
        const fp2 = new FixedPointNumber(25n, 1n) // 2.5
        const result = fp1.divide(fp2) // 10.0 / 2.5 = 4.000

        // 10.0 / 2.5: (100*10) / 25 * 10^2 = 1000 / 25 * 100 = 40 * 100 = 4000
        // Decimals: 1 + 1 + 2 = 4 (for 25 = 5^2)
        expect(result.amount).toBe(4000n) // 4.0000 as 4000 with 4 decimals
        expect(result.decimals).toBe(4n) // 1 + 1 + 2 for 25=5^2
      })

      it("should handle division resulting in decimal expansion", () => {
        const fp1 = new FixedPointNumber(1n, 0n) // 1
        const fp2 = new FixedPointNumber(8n, 0n) // 8
        const result = fp1.divide(fp2) // 1 / 8 = 0.125

        // 1 / 8: (1*1) / 8 * 10^3 = 1 / 8 * 1000 = 1000 / 8 = 125
        // Decimals: 0 + 0 + 3 = 3 (for 8 = 2^3)
        expect(result.amount).toBe(125n) // 0.125 as 125 with 3 decimals
        expect(result.decimals).toBe(3n) // 0 + 0 + 3 for 8=2^3
      })

      it("should throw when dividing by zero FixedPoint", () => {
        const fp1 = new FixedPointNumber(100n, 0n)
        const fp2 = new FixedPointNumber(0n, 1n)

        expect(() => fp1.divide(fp2)).toThrow("Cannot divide by zero")
      })

      it("should throw when FixedPoint divisor has factors other than 2 and 5", () => {
        const fp1 = new FixedPointNumber(100n, 0n)
        const fp2 = new FixedPointNumber(3n, 0n) // 3

        expect(() => fp1.divide(fp2)).toThrow(
          "divisor numerator must be composed only of factors of 2 and 5",
        )
      })

      it("should handle negative FixedPoint divisors", () => {
        const fp1 = new FixedPointNumber(100n, 0n) // 100
        const fp2 = new FixedPointNumber(-4n, 0n) // -4
        const result = fp1.divide(fp2) // 100 / -4 = -25.00

        // 100 / -4: (100*1) / 4 * 10^2 = 100 / 4 * 100 = 25 * 100 = 2500, then negate
        // Decimals: 0 + 0 + 2 = 2 (for 4 = 2^2)
        expect(result.amount).toBe(-2500n) // -25.00 as -2500 with 2 decimals
        expect(result.decimals).toBe(2n)
      })
    })
  })

  describe("toString", () => {
    it("should convert a whole number to string", () => {
      const fp = new FixedPointNumber(123n, 0n)
      expect(fp.toString()).toBe("123")
    })

    it("should convert a decimal number to string", () => {
      const fp = new FixedPointNumber(12345n, 2n)
      expect(fp.toString()).toBe("123.45")
    })

    it("should handle zero", () => {
      const fp = new FixedPointNumber(0n, 2n)
      expect(fp.toString()).toBe("0.00")
    })

    it("should handle leading zeros in fractional part", () => {
      const fp = new FixedPointNumber(1005n, 3n)
      expect(fp.toString()).toBe("1.005")
    })

    describe("negative numbers", () => {
      it("should handle negative decimal numbers", () => {
        const fp = new FixedPointNumber(-12345n, 2n)
        expect(fp.toString()).toBe("-123.45")
      })

      it("should handle negative whole numbers", () => {
        const fp = new FixedPointNumber(-123n, 0n)
        expect(fp.toString()).toBe("-123")
      })

      it("should handle negative numbers with leading zeros in fractional part", () => {
        const fp = new FixedPointNumber(-1005n, 3n)
        expect(fp.toString()).toBe("-1.005")
      })

      it("should handle small negative fractional numbers", () => {
        const fp = new FixedPointNumber(-5n, 1n) // -0.5
        expect(fp.toString()).toBe("-0.5")
      })

      it("should handle negative zero", () => {
        const fp = new FixedPointNumber(-0n, 2n)
        expect(fp.toString()).toBe("0.00")
      })

      it("should handle very large negative numbers", () => {
        const fp = new FixedPointNumber(-12345678901234567890n, 5n)
        expect(fp.toString()).toBe("-123456789012345.67890")
      })
    })

    describe("trailing zeros preservation", () => {
      it("should preserve trailing zeros in fractional part", () => {
        const fp = new FixedPointNumber(12300n, 2n)
        expect(fp.toString()).toBe("123.00")
      })

      it("should handle amounts with all fractional digits as zeros", () => {
        const fp = new FixedPointNumber(12000n, 3n)
        expect(fp.toString()).toBe("12.000")
      })

      it("should preserve single trailing zero", () => {
        const fp = new FixedPointNumber(1230n, 2n)
        expect(fp.toString()).toBe("12.30")
      })

      it("should preserve multiple trailing zeros", () => {
        const fp = new FixedPointNumber(100000n, 4n)
        expect(fp.toString()).toBe("10.0000")
      })
    })

    describe("high precision scenarios", () => {
      it("should handle very high decimal precision", () => {
        const fp = new FixedPointNumber(123456789012345n, 15n)
        expect(fp.toString()).toBe("0.123456789012345")
      })

      it("should handle extensive padding requirements", () => {
        const fp = new FixedPointNumber(1n, 10n)
        expect(fp.toString()).toBe("0.0000000001")
      })

      it("should handle maximum padding case", () => {
        const fp = new FixedPointNumber(1n, 20n)
        expect(fp.toString()).toBe("0.00000000000000000001")
      })

      it("should handle numbers requiring both integer and fractional precision", () => {
        const fp = new FixedPointNumber(123456789012345678901234567890n, 15n)
        expect(fp.toString()).toBe("123456789012345.678901234567890")
      })
    })

    describe("boundary values", () => {
      it("should handle powers of 10 as whole numbers", () => {
        const fp = new FixedPointNumber(1000n, 0n)
        expect(fp.toString()).toBe("1000")
      })

      it("should handle powers of 10 with decimals", () => {
        const fp = new FixedPointNumber(1000n, 3n)
        expect(fp.toString()).toBe("1.000")
      })

      it("should handle very large amounts with no decimals", () => {
        const fp = new FixedPointNumber(BigInt(Number.MAX_SAFE_INTEGER), 0n)
        expect(fp.toString()).toBe(Number.MAX_SAFE_INTEGER.toString())
      })

      it("should handle very large amounts with decimals", () => {
        const fp = new FixedPointNumber(BigInt(Number.MAX_SAFE_INTEGER), 3n)
        expect(fp.toString()).toBe("9007199254740.991")
      })

      it("should handle minimum safe integer", () => {
        const fp = new FixedPointNumber(BigInt(Number.MIN_SAFE_INTEGER), 0n)
        expect(fp.toString()).toBe(Number.MIN_SAFE_INTEGER.toString())
      })

      it("should handle amounts at decimal boundaries", () => {
        const fp = new FixedPointNumber(999999999n, 9n)
        expect(fp.toString()).toBe("0.999999999")
      })
    })

    describe("edge cases", () => {
      it("should handle single digit amounts", () => {
        const fp = new FixedPointNumber(5n, 0n)
        expect(fp.toString()).toBe("5")
      })

      it("should handle single digit with high precision", () => {
        const fp = new FixedPointNumber(5n, 8n)
        expect(fp.toString()).toBe("0.00000005")
      })

      it("should handle fractional amounts close to 1", () => {
        const fp = new FixedPointNumber(999n, 3n)
        expect(fp.toString()).toBe("0.999")
      })

      it("should handle fractional amounts just over 1", () => {
        const fp = new FixedPointNumber(1001n, 3n)
        expect(fp.toString()).toBe("1.001")
      })

      it("should handle maximum precision with large numbers", () => {
        const fp = new FixedPointNumber(987654321098765432109876543210n, 18n)
        expect(fp.toString()).toBe("987654321098.765432109876543210")
      })
    })

    describe("consistency with parseString round-trip", () => {
      it("should round-trip correctly for simple decimals", () => {
        const original = new FixedPointNumber(12345n, 2n)
        const str = original.toString()
        const parsed = FixedPointNumber.parseString(str, 2n)
        expect(parsed.equals(original)).toBe(true)
      })

      it("should round-trip correctly for negative numbers", () => {
        const original = new FixedPointNumber(-12345n, 3n)
        const str = original.toString()
        const parsed = FixedPointNumber.parseString(str, 3n)
        expect(parsed.equals(original)).toBe(true)
      })

      it("should round-trip correctly for high precision numbers", () => {
        const original = new FixedPointNumber(123456789012345n, 10n)
        const str = original.toString()
        const parsed = FixedPointNumber.parseString(str, 10n)
        expect(parsed.equals(original)).toBe(true)
      })

      it("should round-trip correctly for numbers with trailing zeros", () => {
        const original = new FixedPointNumber(12300n, 2n)
        const str = original.toString()
        expect(str).toBe("123.00")
        const parsed = FixedPointNumber.parseString(str, 2n)
        expect(parsed.equals(original)).toBe(true)
      })
    })

    describe("percentage formatting", () => {
      it("should format as percentage with asPercentage option", () => {
        const fp = new FixedPointNumber(2525n, 4n) // 0.2525
        expect(fp.toString({ asPercentage: true })).toBe("25.2500%")
      })

      it("should format whole numbers as percentage", () => {
        const fp = new FixedPointNumber(1n, 0n) // 1
        expect(fp.toString({ asPercentage: true })).toBe("100%")
      })

      it("should format decimal numbers as percentage", () => {
        const fp = new FixedPointNumber(125n, 2n) // 1.25
        expect(fp.toString({ asPercentage: true })).toBe("125.00%")
      })

      it("should format zero as percentage", () => {
        const fp = new FixedPointNumber(0n, 2n) // 0.00
        expect(fp.toString({ asPercentage: true })).toBe("0.00%")
      })

      it("should format small fractions as percentage", () => {
        const fp = new FixedPointNumber(1n, 4n) // 0.0001
        expect(fp.toString({ asPercentage: true })).toBe("0.0100%")
      })

      it("should format negative numbers as percentage", () => {
        const fp = new FixedPointNumber(-5n, 3n) // -0.005
        expect(fp.toString({ asPercentage: true })).toBe("-0.500%")
      })

      it("should format negative decimals as percentage", () => {
        const fp = new FixedPointNumber(-125n, 2n) // -1.25
        expect(fp.toString({ asPercentage: true })).toBe("-125.00%")
      })

      it("should format high precision numbers as percentage", () => {
        const fp = new FixedPointNumber(123456n, 10n) // 0.0000123456
        expect(fp.toString({ asPercentage: true })).toBe("0.0012345600%")
      })

      it("should preserve trailing zeros in percentage format", () => {
        const fp = new FixedPointNumber(2500n, 4n) // 0.2500
        expect(fp.toString({ asPercentage: true })).toBe("25.0000%")
      })

      it("should handle very small percentages", () => {
        const fp = new FixedPointNumber(1n, 6n) // 0.000001
        expect(fp.toString({ asPercentage: true })).toBe("0.000100%")
      })

      it("should handle large percentages", () => {
        const fp = new FixedPointNumber(12345n, 2n) // 123.45
        expect(fp.toString({ asPercentage: true })).toBe("12345.00%")
      })

      it("should work with default formatting when option not provided", () => {
        const fp = new FixedPointNumber(2525n, 4n) // 0.2525
        expect(fp.toString()).toBe("0.2525")
        expect(fp.toString({})).toBe("0.2525")
      })

      it("should work with asPercentage: false", () => {
        const fp = new FixedPointNumber(2525n, 4n) // 0.2525
        expect(fp.toString({ asPercentage: false })).toBe("0.2525")
      })

      it("should handle negative numbers with zero whole part as percentage", () => {
        const fp = new FixedPointNumber(-5n, 1n) // -0.5
        expect(fp.toString({ asPercentage: true })).toBe("-50.0%")
      })

      it("should handle edge case: exactly 100%", () => {
        const fp = new FixedPointNumber(100n, 2n) // 1.00
        expect(fp.toString({ asPercentage: true })).toBe("100.00%")
      })

      it("should handle edge case: exactly 50%", () => {
        const fp = new FixedPointNumber(50n, 2n) // 0.50
        expect(fp.toString({ asPercentage: true })).toBe("50.00%")
      })
    })

    describe("trailing zero control", () => {
      it("should remove trailing zeros with trailingZeroes: false", () => {
        const fp = new FixedPointNumber(12300n, 2n) // 123.00
        expect(fp.toString({ trailingZeroes: false })).toBe("123")
      })

      it("should remove some trailing zeros but keep significant ones", () => {
        const fp = new FixedPointNumber(12340n, 2n) // 123.40
        expect(fp.toString({ trailingZeroes: false })).toBe("123.4")
      })

      it("should preserve non-trailing zeros", () => {
        const fp = new FixedPointNumber(12345n, 2n) // 123.45
        expect(fp.toString({ trailingZeroes: false })).toBe("123.45")
      })

      it("should handle whole numbers with trailingZeroes: false", () => {
        const fp = new FixedPointNumber(123n, 0n) // 123
        expect(fp.toString({ trailingZeroes: false })).toBe("123")
      })

      it("should handle zero with trailingZeroes: false", () => {
        const fp = new FixedPointNumber(0n, 3n) // 0.000
        expect(fp.toString({ trailingZeroes: false })).toBe("0")
      })

      it("should handle negative numbers with trailing zeros", () => {
        const fp = new FixedPointNumber(-12300n, 2n) // -123.00
        expect(fp.toString({ trailingZeroes: false })).toBe("-123")
      })

      it("should handle negative numbers with some trailing zeros", () => {
        const fp = new FixedPointNumber(-12340n, 2n) // -123.40
        expect(fp.toString({ trailingZeroes: false })).toBe("-123.4")
      })

      it("should handle high precision numbers with trailing zeros", () => {
        const fp = new FixedPointNumber(1234000n, 6n) // 1.234000
        expect(fp.toString({ trailingZeroes: false })).toBe("1.234")
      })

      it("should handle numbers with leading zeros in fractional part", () => {
        const fp = new FixedPointNumber(1050n, 3n) // 1.050
        expect(fp.toString({ trailingZeroes: false })).toBe("1.05")
      })

      it("should handle fractional numbers less than 1", () => {
        const fp = new FixedPointNumber(500n, 3n) // 0.500
        expect(fp.toString({ trailingZeroes: false })).toBe("0.5")
      })

      it("should preserve trailing zeros by default (trailingZeroes: true)", () => {
        const fp = new FixedPointNumber(12300n, 2n) // 123.00
        expect(fp.toString()).toBe("123.00")
        expect(fp.toString({ trailingZeroes: true })).toBe("123.00")
      })
    })

    describe("combined formatting options", () => {
      it("should work with both asPercentage and trailingZeroes: false", () => {
        const fp = new FixedPointNumber(2500n, 4n) // 0.2500
        expect(fp.toString({ asPercentage: true, trailingZeroes: false })).toBe("25%")
      })

      it("should handle percentage with some trailing zeros removed", () => {
        const fp = new FixedPointNumber(2540n, 4n) // 0.2540
        expect(fp.toString({ asPercentage: true, trailingZeroes: false })).toBe("25.4%")
      })

      it("should handle percentage with no trailing zeros to remove", () => {
        const fp = new FixedPointNumber(2545n, 4n) // 0.2545
        expect(fp.toString({ asPercentage: true, trailingZeroes: false })).toBe("25.45%")
      })

      it("should handle negative percentages with trailing zeros", () => {
        const fp = new FixedPointNumber(-2500n, 4n) // -0.2500
        expect(fp.toString({ asPercentage: true, trailingZeroes: false })).toBe("-25%")
      })

      it("should handle zero percentage with trailing zeros", () => {
        const fp = new FixedPointNumber(0n, 4n) // 0.0000
        expect(fp.toString({ asPercentage: true, trailingZeroes: false })).toBe("0%")
      })

      it("should handle whole number percentages", () => {
        const fp = new FixedPointNumber(100n, 2n) // 1.00
        expect(fp.toString({ asPercentage: true, trailingZeroes: false })).toBe("100%")
      })

      it("should handle high precision percentages with trailing zeros", () => {
        const fp = new FixedPointNumber(123450n, 8n) // 0.00123450
        expect(fp.toString({ asPercentage: true, trailingZeroes: false })).toBe("0.12345%")
      })

      it("should preserve trailing zeros in percentage by default", () => {
        const fp = new FixedPointNumber(2500n, 4n) // 0.2500
        expect(fp.toString({ asPercentage: true })).toBe("25.0000%")
        expect(fp.toString({ asPercentage: true, trailingZeroes: true })).toBe("25.0000%")
      })
    })
  })

  describe("parseString", () => {
    it("should parse a whole number", () => {
      const fp = FixedPointNumber.parseString("123", 0n)
      expect(fp.amount).toBe(123n)
      expect(fp.decimals).toBe(0n)
    })

    it("should parse a decimal number with exact decimal places", () => {
      const fp = FixedPointNumber.parseString("123.45", 2n)
      expect(fp.amount).toBe(12345n)
      expect(fp.decimals).toBe(2n)
    })

    it("should parse a decimal number with fewer decimal places than specified", () => {
      const fp = FixedPointNumber.parseString("123.4", 2n)
      expect(fp.amount).toBe(12340n)
      expect(fp.decimals).toBe(2n)
    })

    it("should parse a decimal number with more decimal places than specified (truncating)", () => {
      const fp = FixedPointNumber.parseString("123.456", 2n)
      expect(fp.amount).toBe(12345n) // Truncated to 2 decimal places
      expect(fp.decimals).toBe(2n)
    })

    it("should parse negative numbers", () => {
      const fp = FixedPointNumber.parseString("-123.45", 2n)
      expect(fp.amount).toBe(-12345n)
      expect(fp.decimals).toBe(2n)
    })

    it("should parse negative whole numbers", () => {
      const fp = FixedPointNumber.parseString("-123", 0n)
      expect(fp.amount).toBe(-123n)
      expect(fp.decimals).toBe(0n)
    })

    it("should parse negative numbers with fewer decimal places than specified", () => {
      const fp = FixedPointNumber.parseString("-123.4", 2n)
      expect(fp.amount).toBe(-12340n)
      expect(fp.decimals).toBe(2n)
    })

    it("should throw an error for invalid number format", () => {
      expect(() => FixedPointNumber.parseString("123.", 2n)).toThrow(
        "Invalid number format",
      )
      expect(() => FixedPointNumber.parseString(".123", 2n)).toThrow(
        "Invalid number format",
      )
      expect(() => FixedPointNumber.parseString("abc", 2n)).toThrow(
        "Invalid number format",
      )
      expect(() => FixedPointNumber.parseString("--123", 2n)).toThrow(
        "Invalid number format",
      )
      expect(() => FixedPointNumber.parseString("-", 2n)).toThrow(
        "Invalid number format",
      )
    })
  })

  describe("fromDecimalString", () => {
    it("should parse a whole number", () => {
      const fp = FixedPointNumber.fromDecimalString("123")
      expect(fp.amount).toBe(123n)
      expect(fp.decimals).toBe(0n)
    })

    it("should parse a decimal number and auto-detect decimals", () => {
      const fp = FixedPointNumber.fromDecimalString("123.45")
      expect(fp.amount).toBe(12345n)
      expect(fp.decimals).toBe(2n)
    })

    it("should parse a decimal number with more decimal places", () => {
      const fp = FixedPointNumber.fromDecimalString("123.456789")
      expect(fp.amount).toBe(123456789n)
      expect(fp.decimals).toBe(6n)
    })

    it("should parse negative numbers", () => {
      const fp = FixedPointNumber.fromDecimalString("-123.45")
      expect(fp.amount).toBe(-12345n)
      expect(fp.decimals).toBe(2n)
    })

    it("should parse negative whole numbers", () => {
      const fp = FixedPointNumber.fromDecimalString("-123")
      expect(fp.amount).toBe(-123n)
      expect(fp.decimals).toBe(0n)
    })

    it("should handle zero", () => {
      const fp = FixedPointNumber.fromDecimalString("0")
      expect(fp.amount).toBe(0n)
      expect(fp.decimals).toBe(0n)
    })

    it("should handle zero with decimals", () => {
      const fp = FixedPointNumber.fromDecimalString("0.00")
      expect(fp.amount).toBe(0n)
      expect(fp.decimals).toBe(2n)
    })

    it("should handle single decimal place", () => {
      const fp = FixedPointNumber.fromDecimalString("1.5")
      expect(fp.amount).toBe(15n)
      expect(fp.decimals).toBe(1n)
    })

    it("should throw error for invalid number format", () => {
      expect(() => FixedPointNumber.fromDecimalString("123.")).toThrow(
        "Invalid number format",
      )
      expect(() => FixedPointNumber.fromDecimalString(".123")).toThrow(
        "Invalid number format",
      )
      expect(() => FixedPointNumber.fromDecimalString("abc")).toThrow(
        "Invalid number format",
      )
      expect(() => FixedPointNumber.fromDecimalString("--123")).toThrow(
        "Invalid number format",
      )
      expect(() => FixedPointNumber.fromDecimalString("-")).toThrow(
        "Invalid number format",
      )
    })

    it("should round-trip with toString", () => {
      const original = new FixedPointNumber(12345n, 3n) // 12.345
      const str = original.toString()
      const parsed = FixedPointNumber.fromDecimalString(str)
      expect(parsed.equals(original)).toBe(true)
    })

    it("should work with DecimalString type", () => {
      const rational = new (require("../src/rationals").RationalNumber)({
        p: 1n,
        q: 2n,
      })
      const decimalStr = rational.toDecimalString() // Returns DecimalString
      const fp = FixedPointNumber.fromDecimalString(decimalStr)
      expect(fp.amount).toBe(5n)
      expect(fp.decimals).toBe(1n)
      expect(fp.toString()).toBe("0.5")
    })
  })

  describe("equals", () => {
    it("should return true for identical FixedPointNumbers", () => {
      const fp1 = new FixedPointNumber(123n, 2n)
      const fp2 = new FixedPointNumber(123n, 2n)
      expect(fp1.equals(fp2)).toBe(true)
    })

    it("should return false for FixedPointNumbers with different amounts but same decimals", () => {
      const fp1 = new FixedPointNumber(123n, 2n)
      const fp2 = new FixedPointNumber(124n, 2n)
      expect(fp1.equals(fp2)).toBe(false)
    })

    it("should return true for equivalent FixedPointNumbers with different decimal places", () => {
      const fp1 = new FixedPointNumber(123n, 2n) // 1.23
      const fp2 = new FixedPointNumber(1230n, 3n) // 1.230
      expect(fp1.equals(fp2)).toBe(true)
    })

    it("should return false for non-equivalent FixedPointNumbers with different decimal places", () => {
      const fp1 = new FixedPointNumber(123n, 2n) // 1.23
      const fp2 = new FixedPointNumber(1231n, 3n) // 1.231
      expect(fp1.equals(fp2)).toBe(false)
    })

    it("should work with FixedPoint-compatible objects", () => {
      const fp = new FixedPointNumber(123n, 2n)
      expect(fp.equals({ amount: 123n, decimals: 2n })).toBe(true)
      expect(fp.equals({ amount: 1230n, decimals: 3n })).toBe(true)
      expect(fp.equals({ amount: 124n, decimals: 2n })).toBe(false)
    })
  })

  describe("normalize", () => {
    it("should return a copy when decimal places are the same", () => {
      const fp1 = new FixedPointNumber(123n, 2n)
      const fp2 = new FixedPointNumber(456n, 2n)
      const result = fp1.normalize(fp2)

      expect(result.amount).toBe(123n)
      expect(result.decimals).toBe(2n)
      expect(result).not.toBe(fp1) // Should be a new instance
    })

    it("should scale up when normalizing to higher decimal places", () => {
      const fp1 = new FixedPointNumber(10n, 1n) // 1.0
      const fp2 = new FixedPointNumber(0n, 2n) // Target 2 decimals
      const result = fp1.normalize(fp2)

      expect(result.amount).toBe(100n) // 10 * 10^(2-1) = 100
      expect(result.decimals).toBe(2n)
    })

    it("should scale down when normalizing to lower decimal places", () => {
      const fp1 = new FixedPointNumber(1000n, 3n) // 1.000
      const fp2 = new FixedPointNumber(0n, 1n) // Target 1 decimal
      const result = fp1.normalize(fp2)

      expect(result.amount).toBe(10n) // 1000 / 10^(3-1) = 10
      expect(result.decimals).toBe(1n)
    })

    it("should work with the example from the user request", () => {
      const fp = new FixedPointNumber(10n, 1n)
      const target = { amount: 0n, decimals: 2n }
      const result = fp.normalize(target)

      expect(result.amount).toBe(100n)
      expect(result.decimals).toBe(2n)
    })

    it("should work with FixedPoint-compatible objects", () => {
      const fp = new FixedPointNumber(123n, 2n)
      const result = fp.normalize({ amount: 456n, decimals: 3n })

      expect(result.amount).toBe(1230n) // 123 * 10^(3-2) = 1230
      expect(result.decimals).toBe(3n)
    })
  })

  describe("isZero", () => {
    it("should return true for zero amounts", () => {
      const zero = new FixedPointNumber(0n, 2n)
      expect(zero.isZero()).toBe(true)
    })

    it("should return false for non-zero amounts", () => {
      const nonZero = new FixedPointNumber(100n, 2n)
      expect(nonZero.isZero()).toBe(false)
    })

    it("should return true for zero regardless of decimals", () => {
      const zeroNoDecimals = new FixedPointNumber(0n, 0n)
      const zeroWithDecimals = new FixedPointNumber(0n, 5n)

      expect(zeroNoDecimals.isZero()).toBe(true)
      expect(zeroWithDecimals.isZero()).toBe(true)
    })
  })

  describe("lessThan", () => {
    it("should return true when this number is less than other with same decimals", () => {
      const fp1 = new FixedPointNumber(100n, 2n) // 1.00
      const fp2 = new FixedPointNumber(200n, 2n) // 2.00

      expect(fp1.lessThan(fp2)).toBe(true)
      expect(fp2.lessThan(fp1)).toBe(false)
    })

    it("should return false when numbers are equal", () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)

      expect(fp1.lessThan(fp2)).toBe(false)
    })

    it("should handle different decimal places", () => {
      const fp1 = new FixedPointNumber(100n, 2n) // 1.00
      const fp2 = new FixedPointNumber(1500n, 3n) // 1.500

      expect(fp1.lessThan(fp2)).toBe(true)
      expect(fp2.lessThan(fp1)).toBe(false)
    })

    it("should work with FixedPoint-compatible objects", () => {
      const fp = new FixedPointNumber(100n, 2n)

      expect(fp.lessThan({ amount: 200n, decimals: 2n })).toBe(true)
      expect(fp.lessThan({ amount: 50n, decimals: 2n })).toBe(false)
    })
  })

  describe("lessThanOrEqual", () => {
    it("should return true when this number is less than other", () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(200n, 2n)

      expect(fp1.lessThanOrEqual(fp2)).toBe(true)
    })

    it("should return true when numbers are equal", () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)

      expect(fp1.lessThanOrEqual(fp2)).toBe(true)
    })

    it("should return false when this number is greater than other", () => {
      const fp1 = new FixedPointNumber(200n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)

      expect(fp1.lessThanOrEqual(fp2)).toBe(false)
    })

    it("should handle equivalent numbers with different decimal places", () => {
      const fp1 = new FixedPointNumber(100n, 2n) // 1.00
      const fp2 = new FixedPointNumber(1000n, 3n) // 1.000

      expect(fp1.lessThanOrEqual(fp2)).toBe(true)
      expect(fp2.lessThanOrEqual(fp1)).toBe(true)
    })
  })

  describe("greaterThan", () => {
    it("should return true when this number is greater than other with same decimals", () => {
      const fp1 = new FixedPointNumber(200n, 2n) // 2.00
      const fp2 = new FixedPointNumber(100n, 2n) // 1.00

      expect(fp1.greaterThan(fp2)).toBe(true)
      expect(fp2.greaterThan(fp1)).toBe(false)
    })

    it("should return false when numbers are equal", () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)

      expect(fp1.greaterThan(fp2)).toBe(false)
    })

    it("should handle different decimal places", () => {
      const fp1 = new FixedPointNumber(1500n, 3n) // 1.500
      const fp2 = new FixedPointNumber(100n, 2n) // 1.00

      expect(fp1.greaterThan(fp2)).toBe(true)
      expect(fp2.greaterThan(fp1)).toBe(false)
    })

    it("should work with FixedPoint-compatible objects", () => {
      const fp = new FixedPointNumber(200n, 2n)

      expect(fp.greaterThan({ amount: 100n, decimals: 2n })).toBe(true)
      expect(fp.greaterThan({ amount: 300n, decimals: 2n })).toBe(false)
    })
  })

  describe("greaterThanOrEqual", () => {
    it("should return true when this number is greater than other", () => {
      const fp1 = new FixedPointNumber(200n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)

      expect(fp1.greaterThanOrEqual(fp2)).toBe(true)
    })

    it("should return true when numbers are equal", () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)

      expect(fp1.greaterThanOrEqual(fp2)).toBe(true)
    })

    it("should return false when this number is less than other", () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(200n, 2n)

      expect(fp1.greaterThanOrEqual(fp2)).toBe(false)
    })

    it("should handle equivalent numbers with different decimal places", () => {
      const fp1 = new FixedPointNumber(100n, 2n) // 1.00
      const fp2 = new FixedPointNumber(1000n, 3n) // 1.000

      expect(fp1.greaterThanOrEqual(fp2)).toBe(true)
      expect(fp2.greaterThanOrEqual(fp1)).toBe(true)
    })
  })

  describe("isPositive", () => {
    it("should return true for positive amounts", () => {
      const positive = new FixedPointNumber(100n, 2n)
      expect(positive.isPositive()).toBe(true)
    })

    it("should return false for zero amounts", () => {
      const zero = new FixedPointNumber(0n, 2n)
      expect(zero.isPositive()).toBe(false)
    })

    it("should return false for negative amounts", () => {
      const negative = new FixedPointNumber(-100n, 2n)
      expect(negative.isPositive()).toBe(false)
    })
  })

  describe("isNegative", () => {
    it("should return true for negative amounts", () => {
      const negative = new FixedPointNumber(-100n, 2n)
      expect(negative.isNegative()).toBe(true)
    })

    it("should return false for zero amounts", () => {
      const zero = new FixedPointNumber(0n, 2n)
      expect(zero.isNegative()).toBe(false)
    })

    it("should return false for positive amounts", () => {
      const positive = new FixedPointNumber(100n, 2n)
      expect(positive.isNegative()).toBe(false)
    })
  })

  describe("max", () => {
    it("should return the larger of two numbers", () => {
      const fp1 = new FixedPointNumber(100n, 2n) // 1.00
      const fp2 = new FixedPointNumber(200n, 2n) // 2.00

      expect(fp1.max(fp2).equals(fp2)).toBe(true)
      expect(fp2.max(fp1).equals(fp2)).toBe(true)
    })

    it("should return this when equal", () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)

      expect(fp1.max(fp2)).toBe(fp1)
    })

    it("should handle multiple values in array", () => {
      const fp1 = new FixedPointNumber(100n, 2n) // 1.00
      const fp2 = new FixedPointNumber(300n, 2n) // 3.00
      const fp3 = new FixedPointNumber(200n, 2n) // 2.00

      const result = fp1.max([fp2, fp3])
      expect(result.equals(fp2)).toBe(true)
    })

    it("should handle different decimal places", () => {
      const fp1 = new FixedPointNumber(100n, 2n) // 1.00
      const fp2 = new FixedPointNumber(1500n, 3n) // 1.500

      const result = fp1.max(fp2)
      expect(result.equals(fp2)).toBe(true)
    })

    it("should work with FixedPoint-compatible objects", () => {
      const fp = new FixedPointNumber(100n, 2n)
      const result = fp.max({ amount: 200n, decimals: 2n })

      expect(result.amount).toBe(200n)
      expect(result.decimals).toBe(2n)
    })
  })

  describe("min", () => {
    it("should return the smaller of two numbers", () => {
      const fp1 = new FixedPointNumber(100n, 2n) // 1.00
      const fp2 = new FixedPointNumber(200n, 2n) // 2.00

      expect(fp1.min(fp2).equals(fp1)).toBe(true)
      expect(fp2.min(fp1).equals(fp1)).toBe(true)
    })

    it("should return this when equal", () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)

      expect(fp1.min(fp2)).toBe(fp1)
    })

    it("should handle multiple values in array", () => {
      const fp1 = new FixedPointNumber(300n, 2n) // 3.00
      const fp2 = new FixedPointNumber(100n, 2n) // 1.00
      const fp3 = new FixedPointNumber(200n, 2n) // 2.00

      const result = fp1.min([fp2, fp3])
      expect(result.equals(fp2)).toBe(true)
    })

    it("should handle different decimal places", () => {
      const fp1 = new FixedPointNumber(1500n, 3n) // 1.500
      const fp2 = new FixedPointNumber(100n, 2n) // 1.00

      const result = fp1.min(fp2)
      expect(result.equals(fp2)).toBe(true)
    })

    it("should work with FixedPoint-compatible objects", () => {
      const fp = new FixedPointNumber(200n, 2n)
      const result = fp.min({ amount: 100n, decimals: 2n })

      expect(result.amount).toBe(100n)
      expect(result.decimals).toBe(2n)
    })
  })

  describe("toJSON", () => {
    it("should serialize as decimal string with trailing zeros", () => {
      const fp = new FixedPointNumber(10050n, 2n) // 100.50
      const json = fp.toJSON()

      expect(json).toBe("100.50")
    })

    it("should handle zero values", () => {
      const fp = new FixedPointNumber(0n, 0n)
      const json = fp.toJSON()

      expect(json).toBe("0")
    })

    it("should handle zero with decimal places", () => {
      const fp = new FixedPointNumber(0n, 2n)
      const json = fp.toJSON()

      expect(json).toBe("0.00")
    })

    it("should handle large numbers", () => {
      const fp = new FixedPointNumber(12345678901234567890n, 8n)
      const json = fp.toJSON()

      expect(json).toBe("123456789012.34567890")
    })

    it("should handle negative amounts", () => {
      const fp = new FixedPointNumber(-10050n, 2n) // -100.50
      const json = fp.toJSON()

      expect(json).toBe("-100.50")
    })

    it("should preserve trailing zeros for precision", () => {
      const fp = new FixedPointNumber(1234500n, 5n) // 12.34500
      const json = fp.toJSON()

      expect(json).toBe("12.34500")
    })

    it("should handle whole numbers with decimal places", () => {
      const fp = new FixedPointNumber(12000n, 3n) // 12.000
      const json = fp.toJSON()

      expect(json).toBe("12.000")
    })

    it("should work with JSON.stringify", () => {
      const fp = new FixedPointNumber(10050n, 2n)
      const jsonString = JSON.stringify(fp)

      expect(jsonString).toBe('"100.50"')
    })
  })

  describe("fromJSON", () => {
    it("should deserialize decimal string back to FixedPointNumber", () => {
      const json = "100.50"
      const fp = FixedPointNumber.fromJSON(json)

      expect(fp.amount).toBe(10050n)
      expect(fp.decimals).toBe(2n)
    })

    it("should handle zero values", () => {
      const json = "0"
      const fp = FixedPointNumber.fromJSON(json)

      expect(fp.amount).toBe(0n)
      expect(fp.decimals).toBe(0n)
    })

    it("should handle zero with decimal places", () => {
      const json = "0.00"
      const fp = FixedPointNumber.fromJSON(json)

      expect(fp.amount).toBe(0n)
      expect(fp.decimals).toBe(2n)
    })

    it("should handle large numbers", () => {
      const json = "123456789012.34567890"
      const fp = FixedPointNumber.fromJSON(json)

      expect(fp.amount).toBe(12345678901234567890n)
      expect(fp.decimals).toBe(8n)
    })

    it("should handle negative amounts", () => {
      const json = "-100.50"
      const fp = FixedPointNumber.fromJSON(json)

      expect(fp.amount).toBe(-10050n)
      expect(fp.decimals).toBe(2n)
    })

    it("should preserve trailing zeros for precision", () => {
      const json = "12.34500"
      const fp = FixedPointNumber.fromJSON(json)

      expect(fp.amount).toBe(1234500n)
      expect(fp.decimals).toBe(5n)
    })

    it("should round-trip correctly with toJSON", () => {
      const original = new FixedPointNumber(12345n, 3n)
      const json = original.toJSON()
      const restored = FixedPointNumber.fromJSON(json)

      expect(restored.amount).toBe(original.amount)
      expect(restored.decimals).toBe(original.decimals)
      expect(restored.equals(original)).toBe(true)
    })

    it("should work with JSON.stringify/parse round-trip", () => {
      const original = new FixedPointNumber(54321n, 4n)
      const jsonString = JSON.stringify(original)
      const parsed = JSON.parse(jsonString)
      const restored = FixedPointNumber.fromJSON(parsed)

      expect(restored.equals(original)).toBe(true)
    })

    it("should throw error for invalid number format", () => {
      expect(() => FixedPointNumber.fromJSON("100.")).toThrow()
      expect(() => FixedPointNumber.fromJSON(".123")).toThrow()
      expect(() => FixedPointNumber.fromJSON("abc")).toThrow()
      expect(() => FixedPointNumber.fromJSON("--123")).toThrow()
    })

    it("should throw error for null input", () => {
      expect(() => FixedPointNumber.fromJSON(null)).toThrow()
    })

    it("should throw error for undefined input", () => {
      expect(() => FixedPointNumber.fromJSON(undefined)).toThrow()
    })

    it("should throw error for non-string input", () => {
      expect(() => FixedPointNumber.fromJSON(123)).toThrow()
      expect(() => FixedPointNumber.fromJSON({})).toThrow()
      expect(() => FixedPointNumber.fromJSON([])).toThrow()
    })
  })

  describe("FixedPointJSONSchema", () => {
    it("should be exported and usable independently", () => {
      const validData = "100.50"
      const parsed = FixedPointJSONSchema.parse(validData)

      expect(parsed).toEqual(validData)
    })

    it("should validate data independently of fromJSON", () => {
      const invalidData = 100

      expect(() => FixedPointJSONSchema.parse(invalidData)).toThrow()
    })

    it("should provide the same validation as fromJSON", () => {
      const testData = "abc"

      // Both should throw for the same invalid data
      expect(() => FixedPointJSONSchema.parse(testData)).toThrow()
      expect(() => FixedPointNumber.fromJSON(testData)).toThrow()
    })
  })

  describe("Ratio interface", () => {
    it("should implement Ratio interface with p and q getters", () => {
      const fp = new FixedPointNumber(123n, 2n) // 1.23

      expect(fp.p).toBe(123n)
      expect(fp.q).toBe(100n) // 10^2
    })

    it("should calculate q correctly for different decimal places", () => {
      const fp0 = new FixedPointNumber(5n, 0n) // 5
      const fp2 = new FixedPointNumber(123n, 2n) // 1.23
      const fp3 = new FixedPointNumber(456n, 3n) // 0.456
      const fp5 = new FixedPointNumber(78901n, 5n) // 0.78901

      expect(fp0.q).toBe(1n) // 10^0
      expect(fp2.q).toBe(100n) // 10^2
      expect(fp3.q).toBe(1000n) // 10^3
      expect(fp5.q).toBe(100000n) // 10^5
    })

    it("should work with RationalNumber operations", () => {
      const fp = new FixedPointNumber(150n, 2n) // 1.50 = 150/100
      const rational = new (require("../src/rationals").RationalNumber)(fp)

      expect(rational.p).toBe(150n)
      expect(rational.q).toBe(100n)
    })

    it("should maintain ratio consistency for zero amounts", () => {
      const fp = new FixedPointNumber(0n, 3n) // 0.000

      expect(fp.p).toBe(0n)
      expect(fp.q).toBe(1000n) // 10^3
    })

    it("should maintain ratio consistency for negative amounts", () => {
      const fp = new FixedPointNumber(-250n, 2n) // -2.50

      expect(fp.p).toBe(-250n)
      expect(fp.q).toBe(100n) // 10^2
    })

    it("should represent proper fractions for amounts less than 1", () => {
      const fp = new FixedPointNumber(75n, 2n) // 0.75

      expect(fp.p).toBe(75n)
      expect(fp.q).toBe(100n) // represents 75/100 = 0.75
    })
  })
})

describe("FixedPoint factory function", () => {
  describe("string parsing mode", () => {
    it("should parse whole numbers", () => {
      const fp = FixedPoint("123")
      expect(fp).toBeInstanceOf(FixedPointNumber)
      expect(fp.amount).toBe(123n)
      expect(fp.decimals).toBe(0n)
    })

    it("should parse decimal numbers with auto-detected decimals", () => {
      const fp = FixedPoint("123.45")
      expect(fp.amount).toBe(12345n)
      expect(fp.decimals).toBe(2n)
    })

    it("should parse high precision decimals", () => {
      const fp = FixedPoint("1.234098")
      expect(fp.amount).toBe(1234098n)
      expect(fp.decimals).toBe(6n)
    })

    it("should parse negative numbers", () => {
      const fp = FixedPoint("-123.45")
      expect(fp.amount).toBe(-12345n)
      expect(fp.decimals).toBe(2n)
    })

    it("should parse zero", () => {
      const fp = FixedPoint("0")
      expect(fp.amount).toBe(0n)
      expect(fp.decimals).toBe(0n)
    })

    it("should parse zero with decimals", () => {
      const fp = FixedPoint("0.00")
      expect(fp.amount).toBe(0n)
      expect(fp.decimals).toBe(2n)
    })

    it("should work with DecimalString type", () => {
      const decimalStr = "1.5" as any // Simulating DecimalString
      const fp = FixedPoint(decimalStr)
      expect(fp.amount).toBe(15n)
      expect(fp.decimals).toBe(1n)
    })

    it("should throw for invalid string formats", () => {
      expect(() => FixedPoint("abc")).toThrow("Invalid number format")
      expect(() => FixedPoint("123.")).toThrow("Invalid number format")
      expect(() => FixedPoint(".123")).toThrow("Invalid number format")
    })
  })

  describe("percentage string parsing", () => {
    it("should parse simple percentage strings", () => {
      const fp = FixedPoint("51.1%")
      expect(fp.amount).toBe(511n)
      expect(fp.decimals).toBe(3n)
      expect(fp.equals(FixedPoint({ amount: 511n, decimals: 3n }))).toBe(true)
    })

    it("should parse whole number percentages", () => {
      const fp = FixedPoint("100%")
      expect(fp.amount).toBe(100n)
      expect(fp.decimals).toBe(2n)
      expect(fp.equals(FixedPoint({ amount: 100n, decimals: 2n }))).toBe(true)
    })

    it("should parse zero percentage", () => {
      const fp = FixedPoint("0%")
      expect(fp.amount).toBe(0n)
      expect(fp.decimals).toBe(2n)
      expect(fp.equals(FixedPoint({ amount: 0n, decimals: 2n }))).toBe(true)
    })

    it("should parse negative percentages", () => {
      const fp = FixedPoint("-25%")
      expect(fp.amount).toBe(-25n)
      expect(fp.decimals).toBe(2n)
      expect(fp.equals(FixedPoint({ amount: -25n, decimals: 2n }))).toBe(true)
    })

    it("should parse high precision percentages", () => {
      const fp = FixedPoint("12.345%")
      expect(fp.amount).toBe(12345n)
      expect(fp.decimals).toBe(5n)
      expect(fp.equals(FixedPoint({ amount: 12345n, decimals: 5n }))).toBe(true)
    })

    it("should parse small percentages", () => {
      const fp = FixedPoint("0.1%")
      expect(fp.amount).toBe(1n)
      expect(fp.decimals).toBe(3n)
      expect(fp.equals(FixedPoint({ amount: 1n, decimals: 3n }))).toBe(true)
    })

    it("should parse very small percentages", () => {
      const fp = FixedPoint("0.01%")
      expect(fp.amount).toBe(1n)
      expect(fp.decimals).toBe(4n)
      expect(fp.equals(FixedPoint({ amount: 1n, decimals: 4n }))).toBe(true)
    })

    it("should parse percentages with trailing zeros", () => {
      const fp = FixedPoint("50.00%")
      expect(fp.amount).toBe(5000n)
      expect(fp.decimals).toBe(4n)
      expect(fp.equals(FixedPoint({ amount: 5000n, decimals: 4n }))).toBe(true)
    })

    it("should parse large percentages", () => {
      const fp = FixedPoint("200%")
      expect(fp.amount).toBe(200n)
      expect(fp.decimals).toBe(2n)
      expect(fp.equals(FixedPoint({ amount: 200n, decimals: 2n }))).toBe(true)
    })

    it("should parse fractional percentages", () => {
      const fp = FixedPoint("33.333%")
      expect(fp.amount).toBe(33333n)
      expect(fp.decimals).toBe(5n)
      expect(fp.equals(FixedPoint({ amount: 33333n, decimals: 5n }))).toBe(true)
    })

    it("should handle negative small percentages", () => {
      const fp = FixedPoint("-0.5%")
      expect(fp.amount).toBe(-5n)
      expect(fp.decimals).toBe(3n)
      expect(fp.equals(FixedPoint({ amount: -5n, decimals: 3n }))).toBe(true)
    })

    it("should throw for invalid percentage formats", () => {
      expect(() => FixedPoint("abc%")).toThrow("Invalid number format")
      expect(() => FixedPoint("123.%")).toThrow("Invalid number format")
      expect(() => FixedPoint(".123%")).toThrow("Invalid number format")
      expect(() => FixedPoint("%")).toThrow("Invalid number format")
      expect(() => FixedPoint("-%")).toThrow("Invalid number format")
    })

    it("should round-trip with percentage toString", () => {
      const original = FixedPoint("25.5%")
      const asPercentage = original.toString({ asPercentage: true })
      expect(asPercentage).toBe("25.500%")
      
      const roundTrip = FixedPoint(asPercentage)
      expect(roundTrip.equals(original)).toBe(true)
    })

    it("should handle edge case: exactly 100%", () => {
      const fp = FixedPoint("100%")
      expect(fp.toString()).toBe("1.00")
    })

    it("should handle edge case: exactly 50%", () => {
      const fp = FixedPoint("50%")
      expect(fp.toString()).toBe("0.50")
    })
  })

  describe("original constructor mode", () => {
    it("should work with bigint amount and decimals", () => {
      const fp = FixedPoint(12345n, 3n)
      expect(fp).toBeInstanceOf(FixedPointNumber)
      expect(fp.amount).toBe(12345n)
      expect(fp.decimals).toBe(3n)
    })

    it("should work with zero values", () => {
      const fp = FixedPoint(0n, 2n)
      expect(fp.amount).toBe(0n)
      expect(fp.decimals).toBe(2n)
    })

    it("should work with negative amounts", () => {
      const fp = FixedPoint(-500n, 2n)
      expect(fp.amount).toBe(-500n)
      expect(fp.decimals).toBe(2n)
    })

    it("should throw when decimals parameter is missing", () => {
      expect(() => FixedPoint(123n as any)).toThrow(
        "decimals parameter is required",
      )
    })
  })

  describe("FixedPoint object mode", () => {
    it("should work with FixedPoint objects", () => {
      const original = new FixedPointNumber(12345n, 3n)
      const fp = FixedPoint(original)
      expect(fp).toBeInstanceOf(FixedPointNumber)
      expect(fp.amount).toBe(12345n)
      expect(fp.decimals).toBe(3n)
      expect(fp.equals(original)).toBe(true)
    })

    it("should work with FixedPoint-compatible objects", () => {
      const compatibleObj = { amount: 98765n, decimals: 4n }
      const fp = FixedPoint(compatibleObj)
      expect(fp).toBeInstanceOf(FixedPointNumber)
      expect(fp.amount).toBe(98765n)
      expect(fp.decimals).toBe(4n)
    })

    it("should work with zero values", () => {
      const zero = { amount: 0n, decimals: 2n }
      const fp = FixedPoint(zero)
      expect(fp.amount).toBe(0n)
      expect(fp.decimals).toBe(2n)
    })

    it("should work with negative amounts", () => {
      const negative = { amount: -5000n, decimals: 2n }
      const fp = FixedPoint(negative)
      expect(fp.amount).toBe(-5000n)
      expect(fp.decimals).toBe(2n)
    })

    it("should create a new instance, not return the same object", () => {
      const original = new FixedPointNumber(12345n, 3n)
      const fp = FixedPoint(original)
      expect(fp).not.toBe(original) // Different object references
      expect(fp.equals(original)).toBe(true) // But same values
    })
  })

  describe("equivalence with constructor", () => {
    it("should produce same results as constructor for bigint mode", () => {
      const factory = FixedPoint(12345n, 3n)
      const constructor = new FixedPointNumber(12345n, 3n)
      expect(factory.equals(constructor)).toBe(true)
    })

    it("should produce same results as fromDecimalString for string mode", () => {
      const factory = FixedPoint("123.45")
      const method = FixedPointNumber.fromDecimalString("123.45")
      expect(factory.equals(method)).toBe(true)
    })
  })

  describe("String argument support", () => {
    const fp100 = new FixedPointNumber(10000n, 2n) // 100.00
    const fp25 = new FixedPointNumber(2500n, 2n) // 25.00

    describe("add", () => {
      it("should add string decimal numbers", () => {
        const result = fp100.add("25.50")
        expect(result.amount).toBe(12550n) // 125.50
        expect(result.decimals).toBe(2n)
      })

      it("should handle different precision strings", () => {
        const result = fp100.add("0.123") // 3 decimals
        expect(result.amount).toBe(100123n) // 100.123
        expect(result.decimals).toBe(3n)
      })

      it("should handle integer strings", () => {
        const result = fp100.add("25")
        expect(result.amount).toBe(12500n) // 125.00
        expect(result.decimals).toBe(2n)
      })

      it("should handle negative string amounts", () => {
        const result = fp100.add("-25.00")
        expect(result.amount).toBe(7500n) // 75.00
        expect(result.decimals).toBe(2n)
      })

      it("should throw on invalid string formats", () => {
        expect(() => fp100.add("invalid")).toThrow("Invalid number format")
      })
    })

    describe("subtract", () => {
      it("should subtract string decimal numbers", () => {
        const result = fp100.subtract("25.50")
        expect(result.amount).toBe(7450n) // 74.50
        expect(result.decimals).toBe(2n)
      })

      it("should handle different precision strings", () => {
        const result = fp100.subtract("0.123") // 3 decimals
        expect(result.amount).toBe(99877n) // 99.877
        expect(result.decimals).toBe(3n)
      })

      it("should handle negative string amounts", () => {
        const result = fp100.subtract("-25.00")
        expect(result.amount).toBe(12500n) // 125.00
        expect(result.decimals).toBe(2n)
      })
    })

    describe("multiply", () => {
      it("should multiply by string decimal numbers", () => {
        const result = fp25.multiply("2.5")
        expect(result.amount).toBe(6250n) // 62.50
        expect(result.decimals).toBe(2n)
      })

      it("should handle high precision strings", () => {
        const result = fp25.multiply("1.125") // 3 decimals
        expect(result.amount).toBe(28125n) // 28.125
        expect(result.decimals).toBe(3n)
      })

      it("should handle integer strings", () => {
        const result = fp25.multiply("3")
        expect(result.amount).toBe(7500n) // 75.00
        expect(result.decimals).toBe(2n)
      })

      it("should preserve FixedPoint behavior with bigint", () => {
        const result = fp25.multiply(3n)
        expect(result.amount).toBe(7500n) // 75.00
        expect(result.decimals).toBe(2n)
      })
    })

    describe("divide", () => {
      it("should divide by string decimal numbers (factors of 2 and 5)", () => {
        const result = fp100.divide("2.5")
        expect(result.amount).toBe(400000n) // 40.00000 (higher precision)
        expect(result.decimals).toBe(5n)
        expect(result.toString()).toBe("4.00000")
      })

      it("should divide by string integers", () => {
        const result = fp100.divide("4")
        expect(result.amount).toBe(250000n) // 25.0000 (higher precision)
        expect(result.decimals).toBe(4n)
        expect(result.toString()).toBe("25.0000")
      })

      it("should throw on division by invalid factors", () => {
        expect(() => fp100.divide("3.0")).toThrow(
          "divisor numerator must be composed only of factors of 2 and 5",
        )
      })

      it("should throw on division by zero string", () => {
        expect(() => fp100.divide("0")).toThrow("Cannot divide by zero")
      })

      it("should preserve FixedPoint behavior with bigint", () => {
        const result = fp100.divide(4n)
        expect(result.amount).toBe(250000n) // 25.0000 (higher precision due to calculation)
        expect(result.decimals).toBe(4n)
      })
    })

    describe("equals", () => {
      it("should compare with string decimal numbers", () => {
        expect(fp100.equals("100.00")).toBe(true)
        expect(fp100.equals("100.0")).toBe(true)
        expect(fp100.equals("100")).toBe(true)
        expect(fp100.equals("100.01")).toBe(false)
      })

      it("should handle high precision comparisons", () => {
        const precise = new FixedPointNumber(10012345n, 5n) // 100.12345
        expect(precise.equals("100.12345")).toBe(true)
        expect(precise.equals("100.12346")).toBe(false)
      })

      it("should handle negative comparisons", () => {
        const negative = new FixedPointNumber(-10000n, 2n) // -100.00
        expect(negative.equals("-100.00")).toBe(true)
        expect(negative.equals("-100.01")).toBe(false)
      })
    })

    describe("lessThan", () => {
      it("should compare with string numbers", () => {
        expect(fp25.lessThan("100.00")).toBe(true)
        expect(fp100.lessThan("25.00")).toBe(false)
        expect(fp100.lessThan("100.00")).toBe(false)
      })

      it("should handle different precision strings", () => {
        expect(fp25.lessThan("25.001")).toBe(true)
        expect(fp25.lessThan("24.999")).toBe(false)
      })
    })

    describe("lessThanOrEqual", () => {
      it("should compare with string numbers", () => {
        expect(fp25.lessThanOrEqual("100.00")).toBe(true)
        expect(fp100.lessThanOrEqual("100.00")).toBe(true)
        expect(fp100.lessThanOrEqual("25.00")).toBe(false)
      })
    })

    describe("greaterThan", () => {
      it("should compare with string numbers", () => {
        expect(fp100.greaterThan("25.00")).toBe(true)
        expect(fp25.greaterThan("100.00")).toBe(false)
        expect(fp100.greaterThan("100.00")).toBe(false)
      })

      it("should handle different precision strings", () => {
        expect(fp25.greaterThan("24.999")).toBe(true)
        expect(fp25.greaterThan("25.001")).toBe(false)
      })
    })

    describe("greaterThanOrEqual", () => {
      it("should compare with string numbers", () => {
        expect(fp100.greaterThanOrEqual("25.00")).toBe(true)
        expect(fp100.greaterThanOrEqual("100.00")).toBe(true)
        expect(fp25.greaterThanOrEqual("100.00")).toBe(false)
      })
    })

    describe("max", () => {
      it("should handle string arguments", () => {
        const result = fp25.max("100.00")
        expect(result.equals(fp100)).toBe(true)
      })

      it("should handle array of strings", () => {
        const result = fp25.max(["50.00", "100.00", "75.00"])
        expect(result.equals(fp100)).toBe(true)
      })

      it("should handle mixed string and FixedPoint arguments", () => {
        const result = fp25.max([fp100, "75.00"])
        expect(result.equals(fp100)).toBe(true)
      })

      it("should handle different precision strings", () => {
        const result = fp25.max("25.001")
        expect(result.amount).toBe(25001n)
        expect(result.decimals).toBe(3n)
      })
    })

    describe("min", () => {
      it("should handle string arguments", () => {
        const result = fp100.min("25.00")
        expect(result.equals(fp25)).toBe(true)
      })

      it("should handle array of strings", () => {
        const result = fp100.min(["50.00", "25.00", "75.00"])
        expect(result.equals(fp25)).toBe(true)
      })

      it("should handle mixed string and FixedPoint arguments", () => {
        const result = fp100.min([fp25, "75.00"])
        expect(result.equals(fp25)).toBe(true)
      })

      it("should handle different precision strings", () => {
        const result = fp25.min("24.999")
        expect(result.amount).toBe(24999n)
        expect(result.decimals).toBe(3n)
      })
    })

    describe("normalize", () => {
      it("should normalize to string target precision", () => {
        const fp = new FixedPointNumber(12345n, 3n) // 12.345
        const result = fp.normalize("100.00") // 2 decimals, safe mode
        expect(result.amount).toBe(12345n) // Keeps original precision when would lose data
        expect(result.decimals).toBe(3n)
      })

      it("should scale up to higher precision string", () => {
        const fp = new FixedPointNumber(1234n, 2n) // 12.34
        const result = fp.normalize("100.000") // 3 decimals
        expect(result.amount).toBe(12340n) // 12.340
        expect(result.decimals).toBe(3n)
      })

      it("should preserve precision when unsafe=true", () => {
        const fp = new FixedPointNumber(12345n, 3n) // 12.345
        const result = fp.normalize("100.00", true) // 2 decimals, unsafe
        expect(result.amount).toBe(1234n) // 12.34 (precision lost)
        expect(result.decimals).toBe(2n)
      })

      it("should keep original precision when would lose data and unsafe=false", () => {
        const fp = new FixedPointNumber(12345n, 3n) // 12.345
        const result = fp.normalize("100.00", false) // 2 decimals, safe
        expect(result.amount).toBe(12345n) // Keep original
        expect(result.decimals).toBe(3n)
      })
    })

    describe("Edge cases and error handling", () => {
      it("should preserve FixedPoint instance when passed instead of string", () => {
        const result = fp100.add(fp25)
        expect(result.amount).toBe(12500n) // 125.00
        expect(result.decimals).toBe(2n)
      })

      it("should handle very high precision strings", () => {
        const result = fp100.add("0.123456789")
        expect(result.amount).toBe(100123456789n)
        expect(result.decimals).toBe(9n)
      })

      it("should handle zero strings", () => {
        const result = fp100.add("0.0")
        expect(result.equals(fp100)).toBe(true)
      })

      it("should handle very large numbers", () => {
        const large = new FixedPointNumber(123456789012345n, 5n) // 1234567890.12345
        const result = large.add("1000000.0") // Add 1000000.0
        expect(result.amount).toBe(123556789012345n) // 1235567890.12345
        expect(result.decimals).toBe(5n)
      })
    })
  })
})
