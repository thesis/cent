import { describe, expect, it } from "@jest/globals"
import {
  Money,
  MoneyClass,
  EmptyArrayError,
  CurrencyMismatchError,
  HALF_EXPAND,
  USD,
  EUR,
  BTC,
} from "../src"

describe("Static Aggregation Methods", () => {
  describe("Money.zero()", () => {
    it("creates zero USD", () => {
      const zero = MoneyClass.zero("USD")
      expect(zero.toString()).toBe("$0.00")
      expect(zero.isZero()).toBe(true)
    })

    it("creates zero EUR", () => {
      const zero = MoneyClass.zero("EUR")
      expect(zero.toString()).toBe("€0.00")
      expect(zero.isZero()).toBe(true)
    })

    it("creates zero BTC", () => {
      const zero = MoneyClass.zero("BTC")
      expect(zero.isZero()).toBe(true)
      expect(zero.currency.code).toBe("BTC")
    })

    it("accepts Currency object", () => {
      const zero = MoneyClass.zero(USD)
      expect(zero.toString()).toBe("$0.00")
    })

    it("throws for unknown currency", () => {
      expect(() => MoneyClass.zero("XYZ")).toThrow(/Unsupported currency/)
    })

    it("has correct decimals for each currency", () => {
      const usd = MoneyClass.zero("USD")
      const btc = MoneyClass.zero("BTC")

      expect(usd.balance.amount.decimals).toBe(2n)
      expect(btc.balance.amount.decimals).toBe(8n)
    })
  })

  describe("Money.sum()", () => {
    describe("basic functionality", () => {
      it("sums an array of Money instances", () => {
        const items = [Money("$10.00"), Money("$20.00"), Money("$30.00")]
        const result = MoneyClass.sum(items)
        expect(result.toString()).toBe("$60.00")
      })

      it("returns single item unchanged", () => {
        const items = [Money("$42.50")]
        const result = MoneyClass.sum(items)
        expect(result.toString()).toBe("$42.50")
      })

      it("handles many items", () => {
        const items = Array.from({ length: 100 }, () => Money("$1.00"))
        const result = MoneyClass.sum(items)
        expect(result.toString()).toBe("$100.00")
      })

      it("handles negative amounts", () => {
        const items = [Money("$100.00"), Money("-$30.00"), Money("-$20.00")]
        const result = MoneyClass.sum(items)
        expect(result.toString()).toBe("$50.00")
      })

      it("handles decimal amounts", () => {
        const items = [Money("$10.25"), Money("$20.50"), Money("$30.75")]
        const result = MoneyClass.sum(items)
        expect(result.toString()).toBe("$61.50")
      })
    })

    describe("empty array handling", () => {
      it("throws EmptyArrayError for empty array", () => {
        expect(() => MoneyClass.sum([])).toThrow(EmptyArrayError)
      })

      it("returns default value for empty array when provided", () => {
        const defaultValue = MoneyClass.zero("USD")
        const result = MoneyClass.sum([], defaultValue)
        expect(result.toString()).toBe("$0.00")
      })

      it("returns custom default for empty array", () => {
        const defaultValue = Money("$100.00")
        const result = MoneyClass.sum([], defaultValue)
        expect(result.toString()).toBe("$100.00")
      })
    })

    describe("currency validation", () => {
      it("throws CurrencyMismatchError for mixed currencies", () => {
        const items = [Money("$10.00"), Money("€20.00")]
        expect(() => MoneyClass.sum(items)).toThrow(CurrencyMismatchError)
      })

      it("works with same currency different formats", () => {
        const items = [Money("$10"), Money("10 USD"), Money("USD 10.00")]
        const result = MoneyClass.sum(items)
        expect(result.toString()).toBe("$30.00")
      })
    })
  })

  describe("Money.avg()", () => {
    describe("basic functionality", () => {
      it("calculates average of Money instances", () => {
        const items = [Money("$10.00"), Money("$20.00"), Money("$30.00")]
        const result = MoneyClass.avg(items, HALF_EXPAND)
        expect(result.toString()).toBe("$20.00")
      })

      it("returns single item unchanged", () => {
        const items = [Money("$42.50")]
        const result = MoneyClass.avg(items, HALF_EXPAND)
        expect(result.toString()).toBe("$42.50")
      })

      it("handles two items", () => {
        const items = [Money("$10.00"), Money("$20.00")]
        const result = MoneyClass.avg(items, HALF_EXPAND)
        expect(result.toString()).toBe("$15.00")
      })

      it("handles non-exact averages with rounding", () => {
        const items = [Money("$10.00"), Money("$20.00"), Money("$5.00")]
        // Sum = $35, avg = $11.666...
        const result = MoneyClass.avg(items, HALF_EXPAND)
        expect(result.toString()).toBe("$11.67")
      })
    })

    describe("empty array handling", () => {
      it("throws EmptyArrayError for empty array", () => {
        expect(() => MoneyClass.avg([])).toThrow(EmptyArrayError)
      })

      it("error message mentions avg operation", () => {
        try {
          MoneyClass.avg([])
          expect.fail("Should have thrown")
        } catch (e: unknown) {
          expect((e as Error).message).toContain("avg")
        }
      })
    })

    describe("currency validation", () => {
      it("throws CurrencyMismatchError for mixed currencies", () => {
        const items = [Money("$10.00"), Money("€20.00")]
        expect(() => MoneyClass.avg(items)).toThrow(CurrencyMismatchError)
      })
    })
  })

  describe("Money.min()", () => {
    describe("variadic form", () => {
      it("finds minimum with variadic args", () => {
        const result = MoneyClass.min(
          Money("$30.00"),
          Money("$10.00"),
          Money("$20.00")
        )
        expect(result.toString()).toBe("$10.00")
      })

      it("finds minimum with two args", () => {
        const result = MoneyClass.min(Money("$50.00"), Money("$25.00"))
        expect(result.toString()).toBe("$25.00")
      })

      it("returns single argument unchanged", () => {
        const result = MoneyClass.min(Money("$42.50"))
        expect(result.toString()).toBe("$42.50")
      })
    })

    describe("array form", () => {
      it("finds minimum from array", () => {
        const prices = [Money("$30.00"), Money("$10.00"), Money("$20.00")]
        const result = MoneyClass.min(prices)
        expect(result.toString()).toBe("$10.00")
      })

      it("handles single-element array", () => {
        const result = MoneyClass.min([Money("$42.50")])
        expect(result.toString()).toBe("$42.50")
      })
    })

    describe("edge cases", () => {
      it("handles negative amounts", () => {
        const result = MoneyClass.min(
          Money("$10.00"),
          Money("-$5.00"),
          Money("$0.00")
        )
        expect(result.toString()).toBe("-$5.00")
      })

      it("handles equal amounts", () => {
        const result = MoneyClass.min(
          Money("$10.00"),
          Money("$10.00"),
          Money("$10.00")
        )
        expect(result.toString()).toBe("$10.00")
      })

      it("handles many items", () => {
        const prices = [
          Money("$50.00"),
          Money("$25.00"),
          Money("$75.00"),
          Money("$5.00"),
          Money("$100.00"),
        ]
        const result = MoneyClass.min(prices)
        expect(result.toString()).toBe("$5.00")
      })

      it("throws EmptyArrayError for empty array", () => {
        expect(() => MoneyClass.min([])).toThrow(EmptyArrayError)
      })

      it("throws EmptyArrayError for no args", () => {
        expect(() => MoneyClass.min()).toThrow(EmptyArrayError)
      })
    })

    describe("currency validation", () => {
      it("throws for mixed currencies (variadic)", () => {
        expect(() =>
          MoneyClass.min(Money("$10.00"), Money("€20.00"))
        ).toThrow(CurrencyMismatchError)
      })

      it("throws for mixed currencies (array)", () => {
        expect(() =>
          MoneyClass.min([Money("$10.00"), Money("€20.00")])
        ).toThrow(CurrencyMismatchError)
      })
    })
  })

  describe("Money.max()", () => {
    describe("variadic form", () => {
      it("finds maximum with variadic args", () => {
        const result = MoneyClass.max(
          Money("$10.00"),
          Money("$30.00"),
          Money("$20.00")
        )
        expect(result.toString()).toBe("$30.00")
      })

      it("finds maximum with two args", () => {
        const result = MoneyClass.max(Money("$25.00"), Money("$50.00"))
        expect(result.toString()).toBe("$50.00")
      })

      it("returns single argument unchanged", () => {
        const result = MoneyClass.max(Money("$42.50"))
        expect(result.toString()).toBe("$42.50")
      })
    })

    describe("array form", () => {
      it("finds maximum from array", () => {
        const prices = [Money("$10.00"), Money("$30.00"), Money("$20.00")]
        const result = MoneyClass.max(prices)
        expect(result.toString()).toBe("$30.00")
      })

      it("handles single-element array", () => {
        const result = MoneyClass.max([Money("$42.50")])
        expect(result.toString()).toBe("$42.50")
      })
    })

    describe("edge cases", () => {
      it("handles negative amounts", () => {
        const result = MoneyClass.max(
          Money("-$10.00"),
          Money("-$5.00"),
          Money("-$20.00")
        )
        expect(result.toString()).toBe("-$5.00")
      })

      it("handles equal amounts", () => {
        const result = MoneyClass.max(
          Money("$10.00"),
          Money("$10.00"),
          Money("$10.00")
        )
        expect(result.toString()).toBe("$10.00")
      })

      it("handles many items", () => {
        const prices = [
          Money("$50.00"),
          Money("$25.00"),
          Money("$75.00"),
          Money("$5.00"),
          Money("$100.00"),
        ]
        const result = MoneyClass.max(prices)
        expect(result.toString()).toBe("$100.00")
      })

      it("throws EmptyArrayError for empty array", () => {
        expect(() => MoneyClass.max([])).toThrow(EmptyArrayError)
      })

      it("throws EmptyArrayError for no args", () => {
        expect(() => MoneyClass.max()).toThrow(EmptyArrayError)
      })
    })

    describe("currency validation", () => {
      it("throws for mixed currencies (variadic)", () => {
        expect(() =>
          MoneyClass.max(Money("$10.00"), Money("€20.00"))
        ).toThrow(CurrencyMismatchError)
      })

      it("throws for mixed currencies (array)", () => {
        expect(() =>
          MoneyClass.max([Money("$10.00"), Money("€20.00")])
        ).toThrow(CurrencyMismatchError)
      })
    })
  })

  describe("practical use cases", () => {
    it("calculates shopping cart total", () => {
      const cart = [
        Money("$29.99"),
        Money("$49.99"),
        Money("$15.00"),
        Money("$9.99"),
      ]
      const total = MoneyClass.sum(cart)
      expect(total.toString()).toBe("$104.97")
    })

    it("finds cheapest option", () => {
      const prices = [
        Money("$299.99"),
        Money("$249.99"),
        Money("$279.99"),
        Money("$259.99"),
      ]
      const cheapest = MoneyClass.min(prices)
      expect(cheapest.toString()).toBe("$249.99")
    })

    it("finds most expensive option", () => {
      const prices = [
        Money("$299.99"),
        Money("$249.99"),
        Money("$379.99"),
        Money("$259.99"),
      ]
      const mostExpensive = MoneyClass.max(prices)
      expect(mostExpensive.toString()).toBe("$379.99")
    })

    it("calculates average price", () => {
      const prices = [
        Money("$100.00"),
        Money("$200.00"),
        Money("$150.00"),
        Money("$250.00"),
      ]
      const avg = MoneyClass.avg(prices, HALF_EXPAND)
      expect(avg.toString()).toBe("$175.00")
    })

    it("handles empty cart with default", () => {
      const emptyCart: ReturnType<typeof Money>[] = []
      const total = MoneyClass.sum(emptyCart, MoneyClass.zero("USD"))
      expect(total.toString()).toBe("$0.00")
    })

    it("processes transaction list", () => {
      const transactions = [
        Money("$500.00"),   // deposit
        Money("-$50.00"),  // withdrawal
        Money("$200.00"),  // deposit
        Money("-$100.00"), // withdrawal
      ]
      const balance = MoneyClass.sum(transactions)
      expect(balance.toString()).toBe("$550.00")
    })

    it("finds price range", () => {
      const prices = [
        Money("$15.99"),
        Money("$29.99"),
        Money("$19.99"),
        Money("$24.99"),
      ]
      const min = MoneyClass.min(prices)
      const max = MoneyClass.max(prices)

      expect(min.toString()).toBe("$15.99")
      expect(max.toString()).toBe("$29.99")
    })
  })

  describe("cryptocurrency aggregations", () => {
    it("sums BTC amounts", () => {
      const btcAmounts = [
        Money("0.1 BTC"),
        Money("0.25 BTC"),
        Money("0.15 BTC"),
      ]
      const total = MoneyClass.sum(btcAmounts)
      expect(total.toString()).toBe("0.5 BTC")
    })

    it("finds min/max ETH", () => {
      const ethPrices = [
        Money("1.5 ETH"),
        Money("0.5 ETH"),
        Money("2.0 ETH"),
      ]
      expect(MoneyClass.min(ethPrices).toString()).toBe("0.5 ETH")
      expect(MoneyClass.max(ethPrices).toString()).toBe("2 ETH")
    })

    it("calculates average crypto amount", () => {
      const amounts = [
        Money("1.0 BTC"),
        Money("2.0 BTC"),
        Money("3.0 BTC"),
      ]
      const avg = MoneyClass.avg(amounts, HALF_EXPAND)
      expect(avg.toString()).toBe("2 BTC")
    })
  })
})
