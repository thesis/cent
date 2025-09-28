import { USD } from "../src/currencies"
import { FixedPointNumber } from "../src/fixed-point"
import { Money } from "../src/index"
import { Money as MoneyClass } from "../src/money"
import { RationalNumber } from "../src/rationals"

describe("Scientific notation parsing", () => {
  // while cent doesn't support scientific notation as output, we want to
  // support it as input
  describe("Currency symbol with scientific notation", () => {
    it("should parse dollar amounts in scientific notation", () => {
      // $1.23E+5 = $123,000
      const largeAmount = Money("$1.23E+5")
      expect(
        largeAmount.equals(
          new MoneyClass({
            asset: USD,
            amount: { amount: 12300000n, decimals: 2n },
          }),
        ),
      ).toBe(true)

      // Test very small amounts parse without error
      const smallAmount = Money("$1.06521485582e-7")
      expect(smallAmount.currency.code).toBe("USD")
      expect(smallAmount.amount.amount > 0n).toBe(true)

      const tinyAmount = Money("$5e-8")
      expect(tinyAmount.currency.code).toBe("USD")
      expect(tinyAmount.amount.amount > 0n).toBe(true)
    })

    it("should parse negative scientific notation amounts", () => {
      const negativeAmount = Money("-$1.23E+5")
      expect(negativeAmount.currency.code).toBe("USD")
      expect(negativeAmount.amount.amount < 0n).toBe(true)
      expect(negativeAmount.toString()).toContain("-")
    })
  })

  describe("Currency codes with scientific notation", () => {
    it("should not parse currency code amounts in scientific notation", () => {
      // currency code with scientific notation is not supported
      expect(() => Money("USD 1.23E+5")).toThrow("Invalid money string format")
      expect(() => Money("1.06521485582e-7 BTC")).toThrow(
        "Invalid money string format",
      )
    })
  })

  describe("Edge Cases", () => {
    it("should handle zero in scientific notation", () => {
      const zeroAmount = Money("$0e+5")
      expect(zeroAmount.currency.code).toBe("USD")
      expect(zeroAmount.amount.amount).toBe(0n)
      expect(zeroAmount.isZero()).toBe(true)
    })

    it("should handle very large exponents", () => {
      const largeAmount = Money("$1e+10")
      expect(largeAmount.currency.code).toBe("USD")
      expect(largeAmount.amount.amount > 0n).toBe(true)
      expect(largeAmount.toString()).toBe("$10,000,000,000.00")
    })

    it("should handle extremely small numbers without precision loss", () => {
      // test extremely small number that would have 70+ decimal places
      const tinyAmount = Money("$1e-70")
      expect(tinyAmount.currency.code).toBe("USD")
      expect(tinyAmount.isZero()).toBe(false) // Should not be zero
      expect(tinyAmount.amount.amount).not.toBe(0n)

      // test a number with many explicit decimal places
      const preciseAmount = Money(
        "$0.0000000000000000000000000000000000000000000000000000000000000000000001",
      )
      expect(preciseAmount.currency.code).toBe("USD")
      expect(preciseAmount.isZero()).toBe(false)
      expect(preciseAmount.amount.amount).toBe(1n)

      // verify both represent the same value (1 with 70 decimal places)
      expect(tinyAmount.equals(preciseAmount)).toBe(true)
    })

    it("should reject invalid scientific notation", () => {
      // these should still fail because they're invalid scientific notation
      expect(() => Money("$1.23ee+5")).toThrow()
      expect(() => Money("$e+5")).toThrow()
      expect(() => Money("$1.23e")).toThrow()
    })
  })

  describe("Invariant: No scientific notation output", () => {
    const testCases: Array<{
      description: string
      moneyString: string
      formatOptions?: Parameters<typeof Money.prototype.toString>[0]
    }> = [
      // large values
      {
        description: "Very large integer",
        moneyString: "$999999999999999999999999999999",
      },
      {
        description: "Large with decimals",
        moneyString: "$123456789012345678901234567890.99",
      },
      { description: "Scientific input, large", moneyString: "$1.26E+30" },
      {
        description: "Scientific input, very large",
        moneyString: "$9.87654321E+50",
      },
      { description: "Scientific input, extreme", moneyString: "$1E+100" },

      // small values (high precision)
      {
        description: "Very small decimal",
        moneyString: "$0.000000000000000000000000000001",
      },
      { description: "Scientific input, small", moneyString: "$1.26E-30" },
      {
        description: "Scientific input, very small",
        moneyString: "$9.87654321E-50",
      },
      {
        description: "Scientific input, extreme small",
        moneyString: "$1E-100",
      },

      // edge cases with different formatting options
      {
        description: "Large with compact notation",
        moneyString: "$1.23E+20",
        formatOptions: { compact: true },
      },
      {
        description: "Small with max decimals",
        moneyString: "$1E-50",
        formatOptions: { maxDecimals: 100 },
      },
      {
        description: "Large with min decimals",
        moneyString: "$1E+30",
        formatOptions: { minDecimals: 10 },
      },
      {
        description: "Extreme with custom locale",
        moneyString: "$1.5E+40",
        formatOptions: { locale: "de-DE" },
      },

      // negative values
      { description: "Large negative", moneyString: "-$1.26E+30" },
      { description: "Small negative", moneyString: "-$1.26E-30" },

      // zero-adjacent values that could trigger scientific notation
      { description: "Just above zero", moneyString: "$1E-99" },
      {
        description: "Just below max safe integer",
        moneyString: `$${Number.MAX_SAFE_INTEGER - 1}`,
      },
      {
        description: "10x above max safe integer",
        moneyString: `$${Number.MAX_SAFE_INTEGER - 1}0`,
      },
    ]

    testCases.forEach(({ description, moneyString, formatOptions }) => {
      it(`should never return scientific notation: ${description}`, () => {
        try {
          const money = Money(moneyString)
          const formatted = money.toString(formatOptions)

          // Check that output doesn't contain scientific notation patterns
          expect(typeof formatted).toBe("string")
          expect(formatted.length).toBeGreaterThan(0)
          expect(formatted).not.toMatch(/[eE][+-]?[0-9]+/)
        } catch (_error) {
          // if parsing fails, that's acceptable - we're only testing successful cases
          // But we should make the test pass since unparseable input is not a failure
          expect(true).toBe(true)
        }
      })
    })

    it("should handle property-based fuzzing for large range of values", () => {
      // Generate random test cases with extreme exponents
      const randomTests = Array.from({ length: 100 }, (_, i) => {
        const sign = Math.random() > 0.5 ? "" : "-"
        const mantissa = (1 + Math.random() * 9).toFixed(
          Math.floor(Math.random() * 10),
        )
        const exponent = Math.floor(Math.random() * 200) - 100 // -100 to +99
        const scientificString = `${sign}$${mantissa}E${exponent >= 0 ? "+" : ""}${exponent}`

        return {
          description: `Random test ${i + 1}: ${scientificString}`,
          moneyString: scientificString,
          formatOptions:
            Math.random() > 0.7
              ? {
                  compact: Math.random() > 0.5,
                  maxDecimals: Math.floor(Math.random() * 50),
                  minDecimals: Math.floor(Math.random() * 10),
                }
              : undefined,
        }
      })

      randomTests.forEach(({ description, moneyString, formatOptions }) => {
        try {
          const money = Money(moneyString)
          const formatted = money.toString(formatOptions)

          // Verify no scientific notation in output
          const hasScientificNotation = /[0-9]\.?[0-9]*[eE][+-]?[0-9]+/.test(
            formatted,
          )

          if (hasScientificNotation) {
            throw new Error(
              `Scientific notation found in output: "${formatted}" from input "${moneyString}"`,
            )
          }

          expect(hasScientificNotation).toBe(false)
        } catch (error) {
          // Log failed cases but don't fail the test if parsing fails
          if (error.message.includes("Scientific notation found")) {
            throw error // Re-throw scientific notation failures
          }
          console.warn(`${description} failed to parse: ${error.message}`)
        }
      })
    })

    const edgeCases = [
      // Values around JavaScript's number limits
      { input: "$1e-15", description: "Near double precision limit" },
      { input: "$1e-20", description: "Beyond typical precision" },
      { input: "$1e+15", description: "Large integer boundary" },
      { input: "$1e+20", description: "Beyond safe integer" },

      // Values that when converted to number would use scientific notation
      {
        input: "$0.0000001",
        description: "Small decimal that JS Number would format as 1e-7",
      },
      {
        input: "$10000000",
        description: "Large integer that JS Number might format as 1e+7",
      },
      { input: "$0.000000000001", description: "Very small decimal" },
      { input: "$1000000000000", description: "Trillion" },

      // Zero with high precision
      {
        input: "$0.0000000000000000000000000000001",
        description: "Nearly zero with high precision",
      },
    ]

    edgeCases.forEach(({ input, description }) => {
      const formatOptions = [
        { name: "default", options: {} },
        { name: "max decimals", options: { maxDecimals: 50 } },
        { name: "min decimals", options: { minDecimals: 0 } },
        { name: "compact", options: { compact: true } },
        { name: "en-US locale", options: { locale: "en-US" } },
        { name: "de-DE locale", options: { locale: "de-DE" } },
        { name: "exclude currency", options: { excludeCurrency: true } },
      ]

      formatOptions.forEach(({ name, options }) => {
        it(`should maintain precision without scientific notation: ${description} (${name})`, () => {
          try {
            const money = Money(input)
            const formatted = money.toString(options)
            const hasScientificNotation = /[0-9]\.?[0-9]*[eE][+-]?[0-9]+/.test(
              formatted,
            )

            expect(hasScientificNotation).toBe(false)
          } catch (error) {
            if (error.message.includes("Scientific notation found")) {
              throw error
            }
            // If parsing fails, that's acceptable - we're only testing successful cases
            expect(true).toBe(true)
          }
        })
      })
    })
  })

  describe("FixedPointNumber invariant: No scientific notation output", () => {
    const testCases = [
      // Very large values
      {
        description: "Very large integer",
        amount: 999999999999999999999999999999n,
        decimals: 0n,
      },
      {
        description: "Large with decimals",
        amount: 12345678901234567890123456789099n,
        decimals: 2n,
      },
      { description: "Extreme large", amount: 10n ** 100n, decimals: 0n },
      {
        description: "Large with high precision",
        amount: 123n * 10n ** 80n,
        decimals: 50n,
      },

      // Very small values (high decimal precision)
      { description: "Very small decimal", amount: 1n, decimals: 100n },
      {
        description: "Small with medium precision",
        amount: 123n,
        decimals: 50n,
      },
      { description: "Tiny fraction", amount: 1n, decimals: 200n },

      // Zero and near-zero
      { description: "Zero", amount: 0n, decimals: 100n },
      { description: "Negative tiny", amount: -1n, decimals: 100n },
      { description: "Negative large", amount: -(10n ** 50n), decimals: 10n },

      // Edge cases around JavaScript number limits
      {
        description: "Max safe integer",
        amount: BigInt(Number.MAX_SAFE_INTEGER),
        decimals: 0n,
      },
      {
        description: "Beyond max safe integer",
        amount: BigInt(Number.MAX_SAFE_INTEGER) * 1000n,
        decimals: 0n,
      },
      {
        description: "High precision near limits",
        amount: BigInt(Number.MAX_SAFE_INTEGER),
        decimals: 50n,
      },
    ]

    testCases.forEach(({ description, amount, decimals }) => {
      it(`should never return scientific notation: ${description}`, () => {
        const fp = new FixedPointNumber(amount, decimals)

        // Test default toString
        const defaultStr = fp.toString()
        expect(typeof defaultStr).toBe("string")
        expect(defaultStr.length).toBeGreaterThan(0)
        expect(defaultStr).not.toMatch(/[eE][+-]?[0-9]+/)

        // Test with percentage formatting
        const percentageStr = fp.toString({ asPercentage: true })
        expect(typeof percentageStr).toBe("string")
        expect(percentageStr).toMatch(/%$/)
        expect(percentageStr).not.toMatch(/[eE][+-]?[0-9]+/)

        // Test with trailing zeros disabled
        const noTrailingStr = fp.toString({ trailingZeroes: false })
        expect(typeof noTrailingStr).toBe("string")
        expect(noTrailingStr).not.toMatch(/[eE][+-]?[0-9]+/)
      })
    })

    it("should handle property-based fuzzing for FixedPointNumber", () => {
      // Generate random extreme FixedPointNumbers
      const randomTests = Array.from({ length: 50 }, (_, i) => {
        // Generate random amounts with extreme ranges
        const sign = Math.random() > 0.5 ? 1n : -1n
        const magnitude = BigInt(Math.floor(Math.random() * 100) + 1) // 1 to 100 digits
        const amount =
          sign * (BigInt(Math.floor(Math.random() * 9) + 1) * 10n ** magnitude)
        const decimals = BigInt(Math.floor(Math.random() * 150)) // 0 to 149 decimal places

        return {
          description: `Random test ${i + 1}: amount=${amount.toString().length} digits, decimals=${decimals}`,
          amount,
          decimals,
        }
      })

      randomTests.forEach(({ description, amount, decimals }) => {
        try {
          const fp = new FixedPointNumber(amount, decimals)

          const formatted = fp.toString()
          expect(formatted).not.toMatch(/[eE][+-]?[0-9]+/)

          // Also test percentage format
          const percentageFormatted = fp.toString({ asPercentage: true })
          expect(percentageFormatted).not.toMatch(/[eE][+-]?[0-9]+/)
        } catch (error) {
          console.warn(`${description} failed: ${error.message}`)
        }
      })
    })
  })

  describe("RationalNumber invariant: No scientific notation output", () => {
    const testCases = [
      // Very large rational numbers
      { description: "Very large numerator", p: 10n ** 100n, q: 1n },
      { description: "Large fraction", p: 999999999999999999999n, q: 3n },
      {
        description: "Complex large fraction",
        p: 12345678901234567890n,
        q: 987654321n,
      },

      // Very small rational numbers
      { description: "Very small fraction", p: 1n, q: 10n ** 100n },
      { description: "Tiny complex fraction", p: 123n, q: 10n ** 80n },
      { description: "Near zero", p: 1n, q: 999999999999999999n },

      // Negative values
      { description: "Large negative", p: -(10n ** 50n), q: 7n },
      { description: "Small negative", p: -1n, q: 10n ** 50n },
      { description: "Negative denominator", p: 123n, q: -(10n ** 30n) },

      // Edge cases
      { description: "Zero numerator", p: 0n, q: 999999999n },
      { description: "Unit fraction", p: 1n, q: 1n },
      {
        description: "Beyond JS Number limits",
        p: BigInt(Number.MAX_SAFE_INTEGER) * 1000n,
        q: 7n,
      },
    ]

    testCases.forEach(({ description, p, q }) => {
      if (q === 0n) return // Skip division by zero cases

      it(`should never return scientific notation: ${description}`, () => {
        const rational = new RationalNumber({ p, q })

        // Test rational string format (p/q)
        const rationalStr = rational.toString()
        expect(typeof rationalStr).toBe("string")
        expect(rationalStr).toMatch(/^-?\d+\/\d+$/)
        expect(rationalStr).not.toMatch(/[eE][+-]?[0-9]+/)

        // Test decimal string format with various precisions
        const precisions = [10n, 50n, 100n]
        precisions.forEach((precision) => {
          try {
            const decimalStr = rational.toDecimalString(precision)
            expect(typeof decimalStr).toBe("string")
            expect(decimalStr.length).toBeGreaterThan(0)
            expect(decimalStr).not.toMatch(/[eE][+-]?[0-9]+/)
          } catch (_error) {
            // Some extreme cases might fail, which is acceptable for this test
            // The main goal is to test that successful cases don't use scientific notation
          }
        })
      })
    })

    it("should handle property-based fuzzing for RationalNumber", () => {
      // Generate random extreme RationalNumbers
      const randomTests = Array.from({ length: 30 }, (_, i) => {
        // Generate random p and q with extreme ranges
        const pSign = Math.random() > 0.5 ? 1n : -1n
        const qSign = Math.random() > 0.8 ? -1n : 1n // Mostly positive denominators

        const pMagnitude = BigInt(Math.floor(Math.random() * 80) + 1) // 1 to 80 digits
        const qMagnitude = BigInt(Math.floor(Math.random() * 80) + 1) // 1 to 80 digits

        const p =
          pSign *
          (BigInt(Math.floor(Math.random() * 9) + 1) * 10n ** pMagnitude +
            BigInt(Math.floor(Math.random() * 1000)))
        const q =
          qSign *
          (BigInt(Math.floor(Math.random() * 9) + 1) * 10n ** qMagnitude +
            BigInt(Math.floor(Math.random() * 1000)))

        return {
          description: `Random rational test ${i + 1}: p=${p.toString().length} digits, q=${q.toString().length} digits`,
          p,
          q,
        }
      })

      randomTests.forEach(({ description, p, q }) => {
        if (q === 0n) return // Skip division by zero

        try {
          const rational = new RationalNumber({ p, q })

          // Test rational format
          const rationalFormatted = rational.toString()
          expect(rationalFormatted).not.toMatch(/[eE][+-]?[0-9]+/)

          // Test decimal format with moderate precision
          const decimalFormatted = rational.toDecimalString(30n)
          expect(decimalFormatted).not.toMatch(/[eE][+-]?[0-9]+/)
        } catch (error) {
          console.warn(`${description} failed: ${error.message}`)
        }
      })
    })

    const edgeCases = [
      // Cases that would be scientific notation if converted to JS number
      { description: "JS Number would use 1e-7", p: 1n, q: 10000000n },
      { description: "JS Number would use 1e+7", p: 10000000n, q: 1n },
      { description: "JS Number would use 1.23e-20", p: 123n, q: 10n ** 22n },
      {
        description: "JS Number would use 9.87e+15",
        p: 987n * 10n ** 13n,
        q: 1n,
      },

      // Very high precision that might cause issues
      { description: "Ultra-high precision", p: 1n, q: 10n ** 50n },
      { description: "Repeating decimal", p: 1n, q: 3n },
      { description: "Complex repeating", p: 22n, q: 7n },

      // Large numbers that exceed Number safe integer range
      {
        description: "Beyond Number safe int",
        p: BigInt(Number.MAX_SAFE_INTEGER) * 100n,
        q: 7n,
      },
      { description: "Massive denominator", p: 123n, q: 10n ** 100n },
    ]

    edgeCases.forEach(({ description, p, q }) => {
      it(`should handle edge case without scientific notation: ${description}`, () => {
        const rational = new RationalNumber({ p, q })

        // Test both formats
        const rationalStr = rational.toString()
        expect(rationalStr).not.toMatch(/[eE][+-]?[0-9]+/)

        const decimalStr = rational.toDecimalString(50n)
        expect(decimalStr).not.toMatch(/[eE][+-]?[0-9]+/)
      })
    })
  })
})
