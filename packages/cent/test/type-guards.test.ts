import { describe, expect, it } from "@jest/globals"
import {
  Money,
  MoneyClass,
  ValidationError,
} from "../src"

describe("Type Guards and Assertions", () => {
  describe("Money.isMoney()", () => {
    it("returns true for Money instances", () => {
      const money = Money("$100")
      expect(MoneyClass.isMoney(money)).toBe(true)
    })

    it("returns false for non-Money values", () => {
      expect(MoneyClass.isMoney(null)).toBe(false)
      expect(MoneyClass.isMoney(undefined)).toBe(false)
      expect(MoneyClass.isMoney(100)).toBe(false)
      expect(MoneyClass.isMoney("$100")).toBe(false)
      expect(MoneyClass.isMoney({})).toBe(false)
      expect(MoneyClass.isMoney({ amount: 100, currency: "USD" })).toBe(false)
    })

    it("returns true for any currency when no currency specified", () => {
      expect(MoneyClass.isMoney(Money("$100"))).toBe(true)
      expect(MoneyClass.isMoney(Money("€50"))).toBe(true)
      expect(MoneyClass.isMoney(Money("1 BTC"))).toBe(true)
    })

    describe("with currency parameter", () => {
      it("returns true when currency matches", () => {
        expect(MoneyClass.isMoney(Money("$100"), "USD")).toBe(true)
        expect(MoneyClass.isMoney(Money("€50"), "EUR")).toBe(true)
        expect(MoneyClass.isMoney(Money("£30"), "GBP")).toBe(true)
      })

      it("returns false when currency does not match", () => {
        expect(MoneyClass.isMoney(Money("$100"), "EUR")).toBe(false)
        expect(MoneyClass.isMoney(Money("€50"), "USD")).toBe(false)
        expect(MoneyClass.isMoney(Money("£30"), "USD")).toBe(false)
      })

      it("returns false for non-Money even with currency specified", () => {
        expect(MoneyClass.isMoney("$100", "USD")).toBe(false)
        expect(MoneyClass.isMoney(100, "USD")).toBe(false)
      })
    })

    it("works as type guard in conditionals", () => {
      const values: unknown[] = [Money("$100"), 100, "$100", null]
      const moneyValues = values.filter((v) => MoneyClass.isMoney(v))
      expect(moneyValues).toHaveLength(1)
    })
  })

  describe("Money.assertMoney()", () => {
    it("does not throw for Money instances", () => {
      const money = Money("$100")
      expect(() => MoneyClass.assertMoney(money)).not.toThrow()
    })

    it("throws ValidationError for non-Money values", () => {
      expect(() => MoneyClass.assertMoney(null)).toThrow(ValidationError)
      expect(() => MoneyClass.assertMoney(undefined)).toThrow(ValidationError)
      expect(() => MoneyClass.assertMoney(100)).toThrow(ValidationError)
      expect(() => MoneyClass.assertMoney("$100")).toThrow(ValidationError)
      expect(() => MoneyClass.assertMoney({})).toThrow(ValidationError)
    })

    it("includes type info in default error message", () => {
      try {
        MoneyClass.assertMoney(100)
        expect(true).toBe(false) // Should not reach here
      } catch (e) {
        expect((e as Error).message).toContain("number")
      }
    })

    it("uses custom message when provided", () => {
      try {
        MoneyClass.assertMoney(100, "Payment amount is invalid")
        expect(true).toBe(false)
      } catch (e) {
        expect((e as Error).message).toBe("Payment amount is invalid")
      }
    })

    it("error includes suggestion", () => {
      try {
        MoneyClass.assertMoney(100)
        expect(true).toBe(false)
      } catch (e) {
        expect((e as ValidationError).suggestion).toContain("Money")
      }
    })

    it("works as type assertion in functions", () => {
      function processPayment(amount: unknown): string {
        MoneyClass.assertMoney(amount)
        // TypeScript should know amount is Money after assertion
        return amount.toString()
      }

      expect(processPayment(Money("$100"))).toBe("$100.00")
      expect(() => processPayment("$100")).toThrow(ValidationError)
    })
  })

  describe("Money.assertPositive()", () => {
    it("does not throw for positive amounts", () => {
      expect(() => MoneyClass.assertPositive(Money("$100"))).not.toThrow()
      expect(() => MoneyClass.assertPositive(Money("$0.01"))).not.toThrow()
    })

    it("throws ValidationError for zero", () => {
      expect(() => MoneyClass.assertPositive(Money("$0"))).toThrow(
        ValidationError
      )
    })

    it("throws ValidationError for negative amounts", () => {
      expect(() => MoneyClass.assertPositive(Money("-$100"))).toThrow(
        ValidationError
      )
    })

    it("uses custom message when provided", () => {
      try {
        MoneyClass.assertPositive(Money("$0"), "Amount must be positive")
        expect(true).toBe(false)
      } catch (e) {
        expect((e as Error).message).toBe("Amount must be positive")
      }
    })

    it("includes amount in default error message", () => {
      try {
        MoneyClass.assertPositive(Money("-$50"))
        expect(true).toBe(false)
      } catch (e) {
        expect((e as Error).message).toContain("-$50")
      }
    })

    it("error includes suggestion", () => {
      try {
        MoneyClass.assertPositive(Money("$0"))
        expect(true).toBe(false)
      } catch (e) {
        expect((e as ValidationError).suggestion).toContain("greater than zero")
      }
    })
  })

  describe("Money.assertNonNegative()", () => {
    it("does not throw for positive amounts", () => {
      expect(() => MoneyClass.assertNonNegative(Money("$100"))).not.toThrow()
    })

    it("does not throw for zero", () => {
      expect(() => MoneyClass.assertNonNegative(Money("$0"))).not.toThrow()
    })

    it("throws ValidationError for negative amounts", () => {
      expect(() => MoneyClass.assertNonNegative(Money("-$100"))).toThrow(
        ValidationError
      )
      expect(() => MoneyClass.assertNonNegative(Money("-$0.01"))).toThrow(
        ValidationError
      )
    })

    it("uses custom message when provided", () => {
      try {
        MoneyClass.assertNonNegative(Money("-$50"), "Cannot be negative")
        expect(true).toBe(false)
      } catch (e) {
        expect((e as Error).message).toBe("Cannot be negative")
      }
    })

    it("includes amount in default error message", () => {
      try {
        MoneyClass.assertNonNegative(Money("-$50"))
        expect(true).toBe(false)
      } catch (e) {
        expect((e as Error).message).toContain("-$50")
      }
    })

    it("error includes suggestion", () => {
      try {
        MoneyClass.assertNonNegative(Money("-$50"))
        expect(true).toBe(false)
      } catch (e) {
        expect((e as ValidationError).suggestion).toContain(
          "greater than or equal to zero"
        )
      }
    })
  })

  describe("Money.assertNonZero()", () => {
    it("does not throw for positive amounts", () => {
      expect(() => MoneyClass.assertNonZero(Money("$100"))).not.toThrow()
    })

    it("does not throw for negative amounts", () => {
      expect(() => MoneyClass.assertNonZero(Money("-$100"))).not.toThrow()
    })

    it("throws ValidationError for zero", () => {
      expect(() => MoneyClass.assertNonZero(Money("$0"))).toThrow(
        ValidationError
      )
    })

    it("uses custom message when provided", () => {
      try {
        MoneyClass.assertNonZero(Money("$0"), "Amount cannot be zero")
        expect(true).toBe(false)
      } catch (e) {
        expect((e as Error).message).toBe("Amount cannot be zero")
      }
    })

    it("includes amount in default error message", () => {
      try {
        MoneyClass.assertNonZero(Money("$0"))
        expect(true).toBe(false)
      } catch (e) {
        expect((e as Error).message).toContain("$0")
      }
    })

    it("error includes suggestion", () => {
      try {
        MoneyClass.assertNonZero(Money("$0"))
        expect(true).toBe(false)
      } catch (e) {
        expect((e as ValidationError).suggestion).toContain("non-zero")
      }
    })
  })

  describe("money.validate()", () => {
    describe("positive constraint", () => {
      it("returns Ok for positive amount when positive: true", () => {
        const result = Money("$100").validate({ positive: true })
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.toString()).toBe("$100.00")
        }
      })

      it("returns Err for zero when positive: true", () => {
        const result = Money("$0").validate({ positive: true })
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(ValidationError)
          expect(result.error.message).toContain("positive")
        }
      })

      it("returns Err for negative when positive: true", () => {
        const result = Money("-$50").validate({ positive: true })
        expect(result.ok).toBe(false)
      })
    })

    describe("nonNegative constraint", () => {
      it("returns Ok for positive amount when nonNegative: true", () => {
        const result = Money("$100").validate({ nonNegative: true })
        expect(result.ok).toBe(true)
      })

      it("returns Ok for zero when nonNegative: true", () => {
        const result = Money("$0").validate({ nonNegative: true })
        expect(result.ok).toBe(true)
      })

      it("returns Err for negative when nonNegative: true", () => {
        const result = Money("-$50").validate({ nonNegative: true })
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(ValidationError)
          expect(result.error.message).toContain("non-negative")
        }
      })
    })

    describe("nonZero constraint", () => {
      it("returns Ok for positive amount when nonZero: true", () => {
        const result = Money("$100").validate({ nonZero: true })
        expect(result.ok).toBe(true)
      })

      it("returns Ok for negative amount when nonZero: true", () => {
        const result = Money("-$50").validate({ nonZero: true })
        expect(result.ok).toBe(true)
      })

      it("returns Err for zero when nonZero: true", () => {
        const result = Money("$0").validate({ nonZero: true })
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(ValidationError)
          expect(result.error.message).toContain("non-zero")
        }
      })
    })

    describe("min constraint", () => {
      it("returns Ok when amount >= min (Money)", () => {
        const result = Money("$100").validate({ min: Money("$50") })
        expect(result.ok).toBe(true)
      })

      it("returns Ok when amount equals min", () => {
        const result = Money("$50").validate({ min: Money("$50") })
        expect(result.ok).toBe(true)
      })

      it("returns Err when amount < min", () => {
        const result = Money("$25").validate({ min: Money("$50") })
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain("less than minimum")
        }
      })

      it("accepts min as string", () => {
        const result = Money("$100").validate({ min: "$50" })
        expect(result.ok).toBe(true)

        const result2 = Money("$25").validate({ min: "$50" })
        expect(result2.ok).toBe(false)
      })

      it("accepts min as number", () => {
        const result = Money("$100").validate({ min: 50 })
        expect(result.ok).toBe(true)

        const result2 = Money("$25").validate({ min: 50 })
        expect(result2.ok).toBe(false)
      })
    })

    describe("max constraint", () => {
      it("returns Ok when amount <= max (Money)", () => {
        const result = Money("$50").validate({ max: Money("$100") })
        expect(result.ok).toBe(true)
      })

      it("returns Ok when amount equals max", () => {
        const result = Money("$100").validate({ max: Money("$100") })
        expect(result.ok).toBe(true)
      })

      it("returns Err when amount > max", () => {
        const result = Money("$150").validate({ max: Money("$100") })
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain("greater than maximum")
        }
      })

      it("accepts max as string", () => {
        const result = Money("$50").validate({ max: "$100" })
        expect(result.ok).toBe(true)

        const result2 = Money("$150").validate({ max: "$100" })
        expect(result2.ok).toBe(false)
      })

      it("accepts max as number", () => {
        const result = Money("$50").validate({ max: 100 })
        expect(result.ok).toBe(true)

        const result2 = Money("$150").validate({ max: 100 })
        expect(result2.ok).toBe(false)
      })
    })

    describe("multiple constraints", () => {
      it("validates all constraints together", () => {
        const result = Money("$50").validate({
          min: Money("$10"),
          max: Money("$100"),
          positive: true,
          nonZero: true,
        })
        expect(result.ok).toBe(true)
      })

      it("fails on first violated constraint", () => {
        // positive is checked before min/max
        const result = Money("-$50").validate({
          min: Money("-$100"),
          max: Money("$100"),
          positive: true,
        })
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error.message).toContain("positive")
        }
      })

      it("validates min and max range", () => {
        const result = Money("$50").validate({
          min: "$25",
          max: "$75",
        })
        expect(result.ok).toBe(true)

        const belowMin = Money("$10").validate({
          min: "$25",
          max: "$75",
        })
        expect(belowMin.ok).toBe(false)

        const aboveMax = Money("$100").validate({
          min: "$25",
          max: "$75",
        })
        expect(aboveMax.ok).toBe(false)
      })
    })

    describe("chaining with Result methods", () => {
      it("chains with map() on success", () => {
        const result = Money("$100")
          .validate({ positive: true })
          .map((m) => m.multiply(2n))

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.toString()).toBe("$200.00")
        }
      })

      it("chains with map() on failure", () => {
        const result = Money("-$100")
          .validate({ positive: true })
          .map((m) => m.multiply(2n))

        expect(result.ok).toBe(false)
      })

      it("uses match() for branching", () => {
        const getMessage = (amount: string) =>
          Money(amount)
            .validate({ min: "$50", max: "$100" })
            .match({
              ok: (m) => `Valid: ${m.toString()}`,
              err: (e) => `Invalid: ${e.message}`,
            })

        expect(getMessage("$75")).toBe("Valid: $75.00")
        expect(getMessage("$25")).toContain("Invalid:")
        expect(getMessage("$150")).toContain("Invalid:")
      })

      it("uses unwrapOr() for defaults", () => {
        const amount = Money("-$50")
          .validate({ nonNegative: true })
          .unwrapOr(Money("$0"))

        expect(amount.toString()).toBe("$0.00")
      })
    })

    describe("error details", () => {
      it("error includes code", () => {
        const result = Money("$0").validate({ positive: true })
        if (!result.ok) {
          expect(result.error.code).toBeDefined()
        }
      })

      it("error includes suggestion", () => {
        const result = Money("$0").validate({ positive: true })
        if (!result.ok) {
          expect(result.error.suggestion).toBeDefined()
        }
      })

      it("min/max errors include bounds in message", () => {
        const result = Money("$25").validate({ min: "$50" })
        if (!result.ok) {
          expect(result.error.message).toContain("$25")
          expect(result.error.message).toContain("$50")
        }
      })
    })
  })

  describe("practical use cases", () => {
    it("validates payment amounts", () => {
      function validatePayment(amount: unknown) {
        if (!MoneyClass.isMoney(amount)) {
          return { valid: false, error: "Not a Money instance" }
        }

        const result = amount.validate({
          positive: true,
          max: "$10000",
        })

        return result.match({
          ok: (m) => ({ valid: true, amount: m.toString() }),
          err: (e) => ({ valid: false, error: e.message }),
        })
      }

      expect(validatePayment(Money("$100"))).toEqual({
        valid: true,
        amount: "$100.00",
      })
      expect(validatePayment(Money("$0"))).toEqual({
        valid: false,
        error: expect.stringContaining("positive"),
      })
      expect(validatePayment(Money("$50000"))).toEqual({
        valid: false,
        error: expect.stringContaining("maximum"),
      })
      expect(validatePayment("$100")).toEqual({
        valid: false,
        error: "Not a Money instance",
      })
    })

    it("type guards work with array filtering", () => {
      const values: unknown[] = [
        Money("$100"),
        "$50",
        Money("€200"),
        100,
        null,
        Money("$25"),
      ]

      const moneyValues = values.filter((v): v is ReturnType<typeof Money> =>
        MoneyClass.isMoney(v)
      )

      expect(moneyValues).toHaveLength(3)
      expect(moneyValues.every((m) => MoneyClass.isMoney(m))).toBe(true)
    })

    it("currency-specific filtering", () => {
      const amounts = [
        Money("$100"),
        Money("€200"),
        Money("$50"),
        Money("£30"),
        Money("$25"),
      ]

      const usdOnly = amounts.filter((m) => MoneyClass.isMoney(m, "USD"))

      expect(usdOnly).toHaveLength(3)
      expect(usdOnly.every((m) => m.currency.code === "USD")).toBe(true)
    })

    it("assertion in processing pipeline", () => {
      function processPayments(amounts: unknown[]): string[] {
        return amounts.map((amount) => {
          MoneyClass.assertMoney(amount)
          MoneyClass.assertPositive(amount)
          return amount.toString()
        })
      }

      expect(processPayments([Money("$100"), Money("$50")])).toEqual([
        "$100.00",
        "$50.00",
      ])
      expect(() =>
        processPayments([Money("$100"), "not money"])
      ).toThrow(ValidationError)
      expect(() =>
        processPayments([Money("$100"), Money("-$50")])
      ).toThrow(ValidationError)
    })
  })
})
