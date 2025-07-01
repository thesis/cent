import { ExchangeRate } from "../src/exchange-rates"
import { Currency, AssetAmount } from "../src/types"
import { Money } from "../src/money"

describe("ExchangeRate", () => {
  const usdCurrency: Currency = {
    name: "US Dollar",
    code: "USD",
    decimals: 2n,
    symbol: "$",
  }

  const eurCurrency: Currency = {
    name: "Euro",
    code: "EUR",
    decimals: 2n,
    symbol: "€",
  }

  const btcCurrency: Currency = {
    name: "Bitcoin",
    code: "BTC",
    decimals: 8n,
    symbol: "₿",
  }

  const usdAmount: AssetAmount = {
    asset: usdCurrency,
    amount: { amount: 10000n, decimals: 2n }, // $100.00
  }

  const eurAmount: AssetAmount = {
    asset: eurCurrency,
    amount: { amount: 8500n, decimals: 2n }, // €85.00
  }

  const __btcAmount: AssetAmount = {
    asset: btcCurrency,
    amount: { amount: 100000000n, decimals: 8n }, // 1.00000000 BTC
  }

  describe("constructor", () => {
    it("should create an ExchangeRate instance with the provided amounts", () => {
      const rate = new ExchangeRate(usdAmount, eurAmount)
      expect(rate.amounts).toEqual([usdAmount, eurAmount])
      expect(rate.time).toBeDefined()
    })

    it("should accept Money instances and convert to AssetAmount", () => {
      const usdMoney = new Money(usdAmount)
      const eurMoney = new Money(eurAmount)
      const rate = new ExchangeRate(usdMoney, eurMoney)

      expect(rate.amounts[0]).toEqual(usdAmount)
      expect(rate.amounts[1]).toEqual(eurAmount)
    })

    it("should accept a custom time parameter", () => {
      const customTime = "1609459200" // 2021-01-01 00:00:00 UTC
      const rate = new ExchangeRate(usdAmount, eurAmount, customTime)
      expect(rate.time).toBe(customTime)
    })
  })

  describe("invert", () => {
    it("should swap the order of amounts while preserving time", () => {
      const customTime = "1609459200"
      const rate = new ExchangeRate(usdAmount, eurAmount, customTime)
      const inverted = rate.invert()

      expect(inverted.amounts[0]).toEqual(eurAmount)
      expect(inverted.amounts[1]).toEqual(usdAmount)
      expect(inverted.time).toBe(customTime)
      expect(inverted).toBeInstanceOf(ExchangeRate)
    })
  })

  describe("inherited functionality from Price", () => {
    it("should inherit asRatio method", () => {
      const rate = new ExchangeRate(usdAmount, eurAmount)
      const ratio = rate.asRatio()

      expect(ratio.p).toBe(usdAmount.amount.amount)
      expect(ratio.q).toBe(eurAmount.amount.amount)
    })

    it("should inherit multiply method", () => {
      const rate = new ExchangeRate(usdAmount, eurAmount)
      const multiplied = rate.multiply(2n)

      expect(multiplied.amounts[0].amount.amount).toBe(20000n) // 200.00 USD
      expect(multiplied.amounts[1].amount.amount).toBe(8500n) // 85.00 EUR (unchanged)
      expect(multiplied.time).toBe(rate.time)
    })

    it("should inherit divide method", () => {
      const rate = new ExchangeRate(usdAmount, eurAmount)
      const divided = rate.divide(2n)

      expect(divided.amounts[0].amount.amount).toBe(5000n) // 50.00 USD
      expect(divided.amounts[1].amount.amount).toBe(8500n) // 85.00 EUR (unchanged)
      expect(divided.time).toBe(rate.time)
    })

    it("should inherit equals method with time comparison", () => {
      const time1 = "1609459200"
      const time2 = "1609545600"

      const rate1 = new ExchangeRate(usdAmount, eurAmount, time1)
      const rate2 = new ExchangeRate(usdAmount, eurAmount, time1)
      const rate3 = new ExchangeRate(usdAmount, eurAmount, time2)

      expect(rate1.equals(rate2)).toBe(true)
      expect(rate1.equals(rate3)).toBe(false) // Different times
    })
  })

  describe("real-world exchange rate scenarios", () => {
    it("should handle USD/EUR exchange rate", () => {
      // 1 USD = 0.85 EUR
      const usdBase: AssetAmount = {
        asset: usdCurrency,
        amount: { amount: 100n, decimals: 2n },
      } // $1.00
      const eurQuote: AssetAmount = {
        asset: eurCurrency,
        amount: { amount: 85n, decimals: 2n },
      } // €0.85

      const rate = new ExchangeRate(usdBase, eurQuote)
      const ratio = rate.asRatio()

      expect(ratio.p).toBe(100n)
      expect(ratio.q).toBe(85n)
    })

    it("should handle BTC/USD exchange rate", () => {
      // 1 BTC = $50,000 USD
      const btcBase: AssetAmount = {
        asset: btcCurrency,
        amount: { amount: 100000000n, decimals: 8n },
      } // 1.00000000 BTC
      const usdQuote: AssetAmount = {
        asset: usdCurrency,
        amount: { amount: 5000000n, decimals: 2n },
      } // $50,000.00

      const rate = new ExchangeRate(btcBase, usdQuote)

      // Test inversion to get USD/BTC rate
      const inverted = rate.invert()
      expect(inverted.amounts[0]).toEqual(usdQuote)
      expect(inverted.amounts[1]).toEqual(btcBase)
    })

    it("should handle scaling exchange rates", () => {
      const rate = new ExchangeRate(usdAmount, eurAmount)

      // Double the exchange rate
      const doubled = rate.multiply(2n)
      expect(doubled.amounts[0].amount.amount).toBe(20000n)
      expect(doubled.amounts[1].amount.amount).toBe(8500n) // unchanged

      // Half the exchange rate
      const halved = rate.divide(2n)
      expect(halved.amounts[0].amount.amount).toBe(5000n)
      expect(halved.amounts[1].amount.amount).toBe(8500n) // unchanged
    })
  })
})
