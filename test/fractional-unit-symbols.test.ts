import { MoneyFactory, Money } from "../src/money"
import { BTC, USD, GBP } from "../src/currencies"

describe("Fractional Unit Symbols", () => {
  describe("Parsing", () => {
    it("should parse BTC sats symbol", () => {
      const money = MoneyFactory("§10000")
      expect(money.currency).toEqual(BTC)
      expect(money.toString()).toBe("0.0001 BTC")
    })

    it("should parse USD cents symbol", () => {
      const money = MoneyFactory("¢50")
      expect(money.currency).toEqual(USD)
      expect(money.toString()).toBe("$0.50")
    })

    it("should parse GBP pence symbol", () => {
      const money = MoneyFactory("p75")
      expect(money.currency).toEqual(GBP)
      expect(money.toString()).toBe("£0.75")
    })

    it("should handle negative amounts", () => {
      const btcMoney = MoneyFactory("-§5000")
      expect(btcMoney.toString()).toBe("-0.00005 BTC")

      const usdMoney = MoneyFactory("-¢25")
      expect(usdMoney.toString()).toBe("-$0.25")

      const gbpMoney = MoneyFactory("-p50")
      expect(gbpMoney.toString()).toBe("-£0.50")
    })

    it("should handle large amounts with commas", () => {
      const money = MoneyFactory("§1,000,000")
      expect(money.toString()).toBe("0.01 BTC")
    })
  })

  describe("Formatting", () => {
    it("should format BTC with sats symbol", () => {
      const money = new Money({
        asset: BTC,
        amount: { amount: 10000n, decimals: 8n }
      })
      
      expect(money.toString({ preferredUnit: "sat" })).toBe("10,000 sats")
      expect(money.toString({ preferredUnit: "sat", preferFractionalSymbol: true })).toBe("§10,000")
    })

    it("should format BTC with satoshi symbol", () => {
      const money = new Money({
        asset: BTC,
        amount: { amount: 10000n, decimals: 8n }
      })
      
      expect(money.toString({ preferredUnit: "satoshi" })).toBe("10,000 satoshis")
      expect(money.toString({ preferredUnit: "satoshi", preferFractionalSymbol: true })).toBe("§10,000")
    })

    it("should format BTC with compact notation and symbol", () => {
      const money = new Money({
        asset: BTC,
        amount: { amount: 100000000n, decimals: 8n } // 1 BTC
      })
      
      expect(money.toString({ preferredUnit: "sat", compact: true })).toBe("100M sats")
      expect(money.toString({ 
        preferredUnit: "sat", 
        preferFractionalSymbol: true, 
        compact: true 
      })).toBe("§100M")
    })

    it("should handle negative amounts in formatting", () => {
      const money = new Money({
        asset: BTC,
        amount: { amount: -10000n, decimals: 8n }
      })
      
      expect(money.toString({ 
        preferredUnit: "sat", 
        preferFractionalSymbol: true 
      })).toBe("§-10,000")
    })

    it("should fallback to word format when symbol not available", () => {
      const money = new Money({
        asset: BTC,
        amount: { amount: 10000n, decimals: 8n }
      })
      
      // When preferFractionalSymbol is true but no matching symbol exists
      expect(money.toString({ 
        preferredUnit: "bit", 
        preferFractionalSymbol: true 
      })).toBe("1,000 bits")
    })
  })

  describe("Error Handling", () => {
    it("should throw error when both currency and fractional symbols are present", () => {
      expect(() => MoneyFactory("$¢50")).toThrow(
        "Cannot parse money string with both currency and fractional unit symbols"
      )
      
      expect(() => MoneyFactory("§₿100")).toThrow(
        "Cannot parse money string with both currency and fractional unit symbols"
      )
      
      expect(() => MoneyFactory("¢$25")).toThrow(
        "Cannot parse money string with both currency and fractional unit symbols"
      )
    })
  })

  describe("Round-trip parsing and formatting", () => {
    it("should maintain consistency for BTC sats", () => {
      const original = "§10000"
      const money = MoneyFactory(original)
      const formatted = money.toString({ 
        preferredUnit: "sat", 
        preferFractionalSymbol: true 
      })
      expect(formatted).toBe("§10,000")
      
      // Parse the formatted string back
      const reparsed = MoneyFactory("§10,000")
      expect(reparsed.equals(money)).toBe(true)
    })

    it("should work with compact notation", () => {
      const money = MoneyFactory("§100000")
      const compact = money.toString({ 
        preferredUnit: "sat", 
        preferFractionalSymbol: true, 
        compact: true 
      })
      expect(compact).toBe("§100K")
    })
  })

  describe("Integration with existing functionality", () => {
    it("should work with Money operations", () => {
      const money1 = MoneyFactory("§10000")
      const money2 = MoneyFactory("§5000")
      
      const sum = money1.add(money2)
      expect(sum.toString({ 
        preferredUnit: "sat", 
        preferFractionalSymbol: true 
      })).toBe("§15,000")
    })

    it("should work with different unit preferences", () => {
      const money = MoneyFactory("§100000000") // 1 BTC worth of sats
      
      expect(money.toString()).toBe("1 BTC")
      expect(money.toString({ preferredUnit: "sat" })).toBe("100,000,000 sats")
      expect(money.toString({ 
        preferredUnit: "sat", 
        preferFractionalSymbol: true 
      })).toBe("§100,000,000")
    })
  })
})