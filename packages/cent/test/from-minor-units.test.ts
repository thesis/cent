import { describe, expect, it } from "@jest/globals"
import { MoneyClass, USD, BTC, ETH } from "../src"

describe("Money.fromMinorUnits()", () => {
  describe("fiat currencies", () => {
    it("creates USD from cents", () => {
      const money = MoneyClass.fromMinorUnits(10050n, "USD")
      expect(money.toString()).toBe("$100.50")
      expect(money.currency.code).toBe("USD")
      expect(money.balance.amount.amount).toBe(10050n)
      expect(money.balance.amount.decimals).toBe(2n)
    })

    it("creates EUR from minor units", () => {
      const money = MoneyClass.fromMinorUnits(99999n, "EUR")
      expect(money.currency.code).toBe("EUR")
      expect(money.balance.amount.amount).toBe(99999n)
      expect(money.balance.amount.decimals).toBe(2n)
    })

    it("handles zero amount", () => {
      const money = MoneyClass.fromMinorUnits(0n, "USD")
      expect(money.toString()).toBe("$0.00")
      expect(money.balance.amount.amount).toBe(0n)
    })

    it("handles negative amounts", () => {
      const money = MoneyClass.fromMinorUnits(-2500n, "USD")
      expect(money.toString()).toBe("-$25.00")
      expect(money.balance.amount.amount).toBe(-2500n)
    })
  })

  describe("crypto currencies", () => {
    it("creates BTC from satoshis", () => {
      const money = MoneyClass.fromMinorUnits(100000000n, "BTC")
      expect(money.currency.code).toBe("BTC")
      expect(money.balance.amount.amount).toBe(100000000n)
      expect(money.balance.amount.decimals).toBe(8n)
    })

    it("creates BTC from a smaller satoshi amount", () => {
      const money = MoneyClass.fromMinorUnits(50000000n, "BTC")
      expect(money.currency.code).toBe("BTC")
      expect(money.balance.amount.amount).toBe(50000000n)
      expect(money.balance.amount.decimals).toBe(8n)
    })

    it("creates ETH from wei", () => {
      const money = MoneyClass.fromMinorUnits(1000000000000000000n, "ETH")
      expect(money.currency.code).toBe("ETH")
      expect(money.balance.amount.amount).toBe(1000000000000000000n)
      expect(money.balance.amount.decimals).toBe(18n)
    })

    it("handles zero crypto amount", () => {
      const money = MoneyClass.fromMinorUnits(0n, "BTC")
      expect(money.balance.amount.amount).toBe(0n)
      expect(money.currency.code).toBe("BTC")
    })

    it("handles negative crypto amounts", () => {
      const money = MoneyClass.fromMinorUnits(-1000n, "BTC")
      expect(money.balance.amount.amount).toBe(-1000n)
      expect(money.currency.code).toBe("BTC")
    })
  })

  describe("Currency object input", () => {
    it("accepts a Currency object for USD", () => {
      const money = MoneyClass.fromMinorUnits(10050n, USD)
      expect(money.toString()).toBe("$100.50")
      expect(money.currency.code).toBe("USD")
    })

    it("accepts a Currency object for BTC", () => {
      const money = MoneyClass.fromMinorUnits(100000000n, BTC)
      expect(money.currency.code).toBe("BTC")
      expect(money.balance.amount.amount).toBe(100000000n)
    })

    it("accepts a Currency object for ETH", () => {
      const money = MoneyClass.fromMinorUnits(1000000000000000000n, ETH)
      expect(money.currency.code).toBe("ETH")
      expect(money.balance.amount.decimals).toBe(18n)
    })
  })

  describe("error cases", () => {
    it("throws on unknown currency code", () => {
      expect(() => MoneyClass.fromMinorUnits(100n, "XYZ")).toThrow()
    })

    it("throws on empty currency code", () => {
      expect(() => MoneyClass.fromMinorUnits(100n, "")).toThrow()
    })
  })

  describe("equivalence with MoneyFactory(bigint, currency)", () => {
    it("produces identical result to Money(amount, currency) for fiat", () => {
      const viaFactory = MoneyClass.fromMinorUnits(10050n, "USD")
      const viaConstructor = MoneyClass.fromMinorUnits(10050n, USD)
      expect(viaFactory.toString()).toBe(viaConstructor.toString())
      expect(viaFactory.balance.amount.amount).toBe(
        viaConstructor.balance.amount.amount,
      )
      expect(viaFactory.balance.amount.decimals).toBe(
        viaConstructor.balance.amount.decimals,
      )
    })
  })
})
