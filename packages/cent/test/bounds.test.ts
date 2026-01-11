import { describe, expect, it } from "@jest/globals"
import {
  Money,
  CurrencyMismatchError,
  InvalidInputError,
} from "../src"

describe("Clamp and Bounds Methods", () => {
  describe("clamp()", () => {
    describe("with Money instances", () => {
      it("returns same value when within bounds", () => {
        const result = Money("$50").clamp(Money("$0"), Money("$100"))
        expect(result.toString()).toBe("$50.00")
      })

      it("returns min when below bounds", () => {
        const result = Money("-$50").clamp(Money("$0"), Money("$100"))
        expect(result.toString()).toBe("$0.00")
      })

      it("returns max when above bounds", () => {
        const result = Money("$150").clamp(Money("$0"), Money("$100"))
        expect(result.toString()).toBe("$100.00")
      })

      it("returns min when equal to min", () => {
        const result = Money("$0").clamp(Money("$0"), Money("$100"))
        expect(result.toString()).toBe("$0.00")
      })

      it("returns max when equal to max", () => {
        const result = Money("$100").clamp(Money("$0"), Money("$100"))
        expect(result.toString()).toBe("$100.00")
      })

      it("works with negative bounds", () => {
        const result = Money("$50").clamp(Money("-$100"), Money("-$10"))
        expect(result.toString()).toBe("-$10.00")
      })

      it("works when value is negative and within bounds", () => {
        const result = Money("-$50").clamp(Money("-$100"), Money("$0"))
        expect(result.toString()).toBe("-$50.00")
      })
    })

    describe("with string bounds", () => {
      it("parses currency strings", () => {
        const result = Money("$50").clamp("$0", "$100")
        expect(result.toString()).toBe("$50.00")
      })

      it("clamps below min", () => {
        const result = Money("-$50").clamp("$0", "$100")
        expect(result.toString()).toBe("$0.00")
      })

      it("clamps above max", () => {
        const result = Money("$150").clamp("$0", "$100")
        expect(result.toString()).toBe("$100.00")
      })

      it("works with currency code format", () => {
        const result = Money("50 EUR").clamp("0 EUR", "100 EUR")
        expect(result.toString()).toBe("€50.00")
      })
    })

    describe("with number bounds", () => {
      it("interprets numbers in same currency", () => {
        const result = Money("$50").clamp(0, 100)
        expect(result.toString()).toBe("$50.00")
      })

      it("clamps below min", () => {
        const result = Money("-$50").clamp(0, 100)
        expect(result.toString()).toBe("$0.00")
      })

      it("clamps above max", () => {
        const result = Money("$150").clamp(0, 100)
        expect(result.toString()).toBe("$100.00")
      })

      it("works with decimal numbers", () => {
        const result = Money("$5.50").clamp(0, 10.25)
        expect(result.toString()).toBe("$5.50")
      })

      it("works with negative number bounds", () => {
        const result = Money("-$50").clamp(-100, -10)
        expect(result.toString()).toBe("-$50.00")
      })
    })

    describe("with mixed bound types", () => {
      it("accepts Money min and string max", () => {
        const result = Money("$50").clamp(Money("$0"), "$100")
        expect(result.toString()).toBe("$50.00")
      })

      it("accepts string min and Money max", () => {
        const result = Money("$50").clamp("$0", Money("$100"))
        expect(result.toString()).toBe("$50.00")
      })

      it("accepts number min and Money max", () => {
        const result = Money("$50").clamp(0, Money("$100"))
        expect(result.toString()).toBe("$50.00")
      })

      it("accepts Money min and number max", () => {
        const result = Money("$50").clamp(Money("$0"), 100)
        expect(result.toString()).toBe("$50.00")
      })
    })

    describe("error handling", () => {
      it("throws when min > max", () => {
        expect(() => Money("$50").clamp("$100", "$0")).toThrow(InvalidInputError)
      })

      it("error message includes bound values", () => {
        try {
          Money("$50").clamp("$100", "$0")
          expect(true).toBe(false)
        } catch (e) {
          expect((e as Error).message).toContain("$100")
          expect((e as Error).message).toContain("$0")
        }
      })

      it("throws on currency mismatch with min", () => {
        expect(() => Money("$50").clamp("€0", "$100")).toThrow(
          CurrencyMismatchError
        )
      })

      it("throws on currency mismatch with max", () => {
        expect(() => Money("$50").clamp("$0", "€100")).toThrow(
          CurrencyMismatchError
        )
      })
    })

    describe("edge cases", () => {
      it("works when min equals max", () => {
        const result = Money("$50").clamp("$25", "$25")
        expect(result.toString()).toBe("$25.00")
      })

      it("works with zero bounds", () => {
        const result = Money("$50").clamp("$0", "$0")
        expect(result.toString()).toBe("$0.00")
      })

      it("preserves precision", () => {
        const result = Money("$50.123").clamp("$0", "$100")
        expect(result.toString()).toBe("$50.12")
      })

      it("works with cryptocurrencies", () => {
        const result = Money("0.5 BTC").clamp("0.1 BTC", "1 BTC")
        expect(result.currency.code).toBe("BTC")
      })
    })
  })

  describe("atLeast()", () => {
    describe("with Money instances", () => {
      it("returns same value when above min", () => {
        const result = Money("$50").atLeast(Money("$0"))
        expect(result.toString()).toBe("$50.00")
      })

      it("returns min when below min", () => {
        const result = Money("-$50").atLeast(Money("$0"))
        expect(result.toString()).toBe("$0.00")
      })

      it("returns same value when equal to min", () => {
        const result = Money("$50").atLeast(Money("$50"))
        expect(result.toString()).toBe("$50.00")
      })
    })

    describe("with string bounds", () => {
      it("parses currency strings", () => {
        const result = Money("$50").atLeast("$0")
        expect(result.toString()).toBe("$50.00")
      })

      it("raises to min", () => {
        const result = Money("$25").atLeast("$50")
        expect(result.toString()).toBe("$50.00")
      })
    })

    describe("with number bounds", () => {
      it("interprets numbers in same currency", () => {
        const result = Money("$50").atLeast(0)
        expect(result.toString()).toBe("$50.00")
      })

      it("raises to min", () => {
        const result = Money("-$50").atLeast(0)
        expect(result.toString()).toBe("$0.00")
      })

      it("works with decimal numbers", () => {
        const result = Money("$5").atLeast(10.50)
        expect(result.toString()).toBe("$10.50")
      })
    })

    describe("error handling", () => {
      it("throws on currency mismatch", () => {
        expect(() => Money("$50").atLeast("€0")).toThrow(CurrencyMismatchError)
      })
    })

    describe("practical uses", () => {
      it("ensures non-negative amounts", () => {
        const amounts = [Money("$100"), Money("-$50"), Money("$0")]
        const safe = amounts.map((m) => m.atLeast(0))

        expect(safe[0].toString()).toBe("$100.00")
        expect(safe[1].toString()).toBe("$0.00")
        expect(safe[2].toString()).toBe("$0.00")
      })

      it("enforces minimum order amount", () => {
        const minOrder = Money("$25")
        const order = Money("$15").atLeast(minOrder)
        expect(order.toString()).toBe("$25.00")
      })
    })
  })

  describe("atMost()", () => {
    describe("with Money instances", () => {
      it("returns same value when below max", () => {
        const result = Money("$50").atMost(Money("$100"))
        expect(result.toString()).toBe("$50.00")
      })

      it("returns max when above max", () => {
        const result = Money("$150").atMost(Money("$100"))
        expect(result.toString()).toBe("$100.00")
      })

      it("returns same value when equal to max", () => {
        const result = Money("$100").atMost(Money("$100"))
        expect(result.toString()).toBe("$100.00")
      })
    })

    describe("with string bounds", () => {
      it("parses currency strings", () => {
        const result = Money("$50").atMost("$100")
        expect(result.toString()).toBe("$50.00")
      })

      it("caps at max", () => {
        const result = Money("$150").atMost("$100")
        expect(result.toString()).toBe("$100.00")
      })
    })

    describe("with number bounds", () => {
      it("interprets numbers in same currency", () => {
        const result = Money("$50").atMost(100)
        expect(result.toString()).toBe("$50.00")
      })

      it("caps at max", () => {
        const result = Money("$150").atMost(100)
        expect(result.toString()).toBe("$100.00")
      })

      it("works with decimal numbers", () => {
        const result = Money("$15").atMost(10.50)
        expect(result.toString()).toBe("$10.50")
      })
    })

    describe("error handling", () => {
      it("throws on currency mismatch", () => {
        expect(() => Money("$50").atMost("€100")).toThrow(CurrencyMismatchError)
      })
    })

    describe("practical uses", () => {
      it("caps withdrawal amounts", () => {
        const maxWithdrawal = Money("$500")
        const requested = Money("$750").atMost(maxWithdrawal)
        expect(requested.toString()).toBe("$500.00")
      })

      it("enforces maximum discount", () => {
        const maxDiscount = 100
        const calculatedDiscount = Money("$150").atMost(maxDiscount)
        expect(calculatedDiscount.toString()).toBe("$100.00")
      })
    })
  })

  describe("chaining bounds methods", () => {
    it("atLeast then atMost is equivalent to clamp", () => {
      const value = Money("$150")
      const chained = value.atLeast("$0").atMost("$100")
      const clamped = value.clamp("$0", "$100")

      expect(chained.toString()).toBe(clamped.toString())
    })

    it("atMost then atLeast is equivalent to clamp", () => {
      const value = Money("-$50")
      const chained = value.atMost("$100").atLeast("$0")
      const clamped = value.clamp("$0", "$100")

      expect(chained.toString()).toBe(clamped.toString())
    })

    it("chains with other Money methods", () => {
      const result = Money("$100")
        .multiply(2n)
        .atMost("$150")
        .add("$25")

      expect(result.toString()).toBe("$175.00")
    })
  })

  describe("practical use cases", () => {
    it("validates payment within limits", () => {
      const validatePayment = (amount: string) => {
        return Money(amount)
          .atLeast(1) // Minimum $1
          .atMost(10000) // Maximum $10,000
      }

      expect(validatePayment("$500").toString()).toBe("$500.00")
      expect(validatePayment("$0.50").toString()).toBe("$1.00")
      expect(validatePayment("$50000").toString()).toBe("$10,000.00")
    })

    it("calculates tip with bounds", () => {
      const calculateTip = (bill: string, tipPercent: string) => {
        const tip = Money(bill).multiply(tipPercent)
        return tip.atLeast(1).atMost(100) // Min $1, max $100 tip
      }

      expect(calculateTip("$50", "20%").toString()).toBe("$10.00")
      expect(calculateTip("$5", "10%").toString()).toBe("$1.00") // Raised to min
      expect(calculateTip("$1000", "20%").toString()).toBe("$100.00") // Capped at max
    })

    it("applies discount with floor", () => {
      const applyDiscount = (price: string, discountPercent: string) => {
        const discounted = Money(price).subtract(discountPercent)
        return discounted.atLeast(0) // Never go negative
      }

      expect(applyDiscount("$100", "20%").toString()).toBe("$80.00")
      expect(applyDiscount("$10", "150%").toString()).toBe("$0.00") // Clamped to $0
    })

    it("normalizes fees within range", () => {
      const calculateFee = (amount: string, feePercent: string) => {
        return Money(amount)
          .multiply(feePercent)
          .clamp("$0.50", "$50") // Min $0.50, max $50 fee
      }

      expect(calculateFee("$10", "3%").toString()).toBe("$0.50") // Below min
      expect(calculateFee("$100", "3%").toString()).toBe("$3.00") // Within range
      expect(calculateFee("$5000", "3%").toString()).toBe("$50.00") // Above max
    })
  })
})
