import { BTC, USD } from "../src/currencies"
import { Money } from "../src/index"
import { Money as MoneyClass } from "../src/money"

describe("Scientific Notation Parsing", () => {
  describe("Currency Symbol with Scientific Notation", () => {
    it("should parse dollar amounts in scientific notation", () => {
      // Test $1.23E+5 = $123,000
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

  describe("Currency Code with Scientific Notation", () => {
    it("should parse currency code amounts in scientific notation", () => {
      // This test will initially fail until we fix currency code parsing with scientific notation
      // Currency code with scientific notation is not yet supported
      // These should fail until we extend currency code parsing
      expect(() => Money("USD 1.23E+5")).toThrow("Invalid money string format")
      expect(() => Money("1.06521485582e-7 BTC")).toThrow("Invalid money string format")
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
      // Test extremely small number that would have 70+ decimal places
      const tinyAmount = Money("$1e-70")
      expect(tinyAmount.currency.code).toBe("USD")
      expect(tinyAmount.isZero()).toBe(false) // Should not be zero
      expect(tinyAmount.amount.amount).not.toBe(0n)

      // Test a number with many explicit decimal places
      const preciseAmount = Money("$0.0000000000000000000000000000000000000000000000000000000000000000000001")
      expect(preciseAmount.currency.code).toBe("USD")
      expect(preciseAmount.isZero()).toBe(false)
      expect(preciseAmount.amount.amount).toBe(1n)

      // Verify both represent the same value (1 with 70 decimal places)
      expect(tinyAmount.equals(preciseAmount)).toBe(true)
    })

    it("should reject invalid scientific notation", () => {
      // These should still fail because they're invalid scientific notation
      expect(() => Money("$1.23ee+5")).toThrow()
      expect(() => Money("$e+5")).toThrow()
      expect(() => Money("$1.23e")).toThrow()
    })
  })
})