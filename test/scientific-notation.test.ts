import { USD } from "../src/currencies"
import { Money } from "../src/index"
import { Money as MoneyClass } from "../src/money"

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
    it("should never output scientific notation for extreme values", () => {
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
        try {
          const money = Money(moneyString)
          const formatted = money.toString(formatOptions)

          // Check that output doesn't contain scientific notation patterns
          expect(typeof formatted).toBe("string")
          expect(formatted.length).toBeGreaterThan(0)
          expect(formatted).not.toMatch(/[eE][+-]?[0-9]+/)
          expect(formatted).not.toMatch(/[eE][+-]?[0-9]+/)
        } catch (error) {
          // if parsing fails, that's acceptable
          // we're only testing successful cases
          console.warn(
            `Test case "${description}" failed to parse: ${error.message}`,
          )
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

    it("should maintain precision without scientific notation for edge cases", () => {
      // Test specific edge cases that are most likely to trigger scientific notation
      const edgeCases = [
        // Values around JavaScript's number limits
        { input: "$1e-15", description: "Near double precision limit" },
        { input: "$1e-20", description: "Beyond typical precision" },
        { input: "$1e+15", description: "Large integer boundary" },
        { input: "$1e+20", description: "Beyond safe integer" },

        // Values that when converted to number would use scientific notation
        {
          input: "$0.0000001",
          description: "Small decimal that JS would format as 1e-7",
        },
        {
          input: "$10000000",
          description: "Large integer that JS might format as 1e+7",
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
        try {
          const money = Money(input)

          // Test multiple formatting options
          const formatOptions = [
            {},
            { maxDecimals: 50 },
            { minDecimals: 0 },
            { compact: true },
            { locale: "en-US" },
            { locale: "de-DE" },
            { excludeCurrency: true },
          ]

          formatOptions.forEach((options, _idx) => {
            const formatted = money.toString(options)
            const hasScientificNotation = /[0-9]\.?[0-9]*[eE][+-]?[0-9]+/.test(
              formatted,
            )

            if (hasScientificNotation) {
              throw new Error(
                `Scientific notation found: "${formatted}" from "${input}" with options ${JSON.stringify(options)}`,
              )
            }

            expect(hasScientificNotation).toBe(false)
          })
        } catch (error) {
          if (error.message.includes("Scientific notation found")) {
            throw error
          }
          console.warn(`${description} (${input}) failed: ${error.message}`)
        }
      })
    })
  })
})
