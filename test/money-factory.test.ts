import { Money } from "../src/index"
import { Money as MoneyClass } from "../src/money"
import { USD, EUR, GBP, JPY, BTC, ETH, CNY as __CNY, USDT, USDC } from "../src/currencies"

describe("Money Factory Function", () => {
  describe("US Number Format (1,234.56)", () => {
    describe("USD Currency Symbol ($)", () => {
      it("should parse basic dollar amounts", () => {
        expect(
          Money("$100").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: 10000n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("$1.50").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: 150n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("$0.99").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: 99n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse dollar amounts with thousands separators", () => {
        expect(
          Money("$1,000").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: 100000n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("$1,234.56").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: 123456n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("$10,000,000.00").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: 1000000000n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse whole dollar amounts without decimals", () => {
        expect(
          Money("$100").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: 10000n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("$1,234").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: 123400n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse negative dollar amounts", () => {
        expect(
          Money("-$100.50").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: -10050n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("$-100.50").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: -10050n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse zero amounts", () => {
        expect(
          Money("$0").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: 0n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("$0.00").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: 0n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })
    })

    describe("EUR Currency Symbol (€)", () => {
      it("should parse basic euro amounts", () => {
        expect(
          Money("€100").equals(
            new MoneyClass({
              asset: EUR,
              amount: { amount: 10000n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("€1.50").equals(
            new MoneyClass({
              asset: EUR,
              amount: { amount: 150n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse euro amounts with thousands separators", () => {
        expect(
          Money("€1,234.56").equals(
            new MoneyClass({
              asset: EUR,
              amount: { amount: 123456n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })
    })

    describe("GBP Currency Symbol (£)", () => {
      it("should parse basic pound amounts", () => {
        expect(
          Money("£100").equals(
            new MoneyClass({
              asset: GBP,
              amount: { amount: 10000n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("£1.50").equals(
            new MoneyClass({
              asset: GBP,
              amount: { amount: 150n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse pound amounts with thousands separators", () => {
        expect(
          Money("£1,234.56").equals(
            new MoneyClass({
              asset: GBP,
              amount: { amount: 123456n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })
    })

    describe("JPY Currency Symbol (¥)", () => {
      it("should parse yen amounts (no decimals)", () => {
        expect(
          Money("¥100").equals(
            new MoneyClass({
              asset: JPY,
              amount: { amount: 100n, decimals: 0n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("¥1,234").equals(
            new MoneyClass({
              asset: JPY,
              amount: { amount: 1234n, decimals: 0n },
            }),
          ),
        ).toBe(true)
      })

      it("should prefer JPY over CNY for ¥ symbol", () => {
        // ¥ should resolve to JPY by default (more common internationally)
        const money = Money("¥100")
        expect(money.asset.code).toBe("JPY")
        expect(money.asset).toBe(JPY)
      })
    })

    describe("Currency Codes", () => {
      it("should parse USD currency code formats", () => {
        expect(
          Money("USD 100").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: 10000n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("100 USD").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: 10000n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("USD 1,234.56").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: 123456n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("1,234.56 USD").equals(
            new MoneyClass({
              asset: USD,
              amount: { amount: 123456n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse EUR currency code formats", () => {
        expect(
          Money("EUR 100").equals(
            new MoneyClass({
              asset: EUR,
              amount: { amount: 10000n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("100 EUR").equals(
            new MoneyClass({
              asset: EUR,
              amount: { amount: 10000n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse GBP currency code formats", () => {
        expect(
          Money("GBP 100").equals(
            new MoneyClass({
              asset: GBP,
              amount: { amount: 10000n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("100 GBP").equals(
            new MoneyClass({
              asset: GBP,
              amount: { amount: 10000n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse JPY currency code formats (no decimals)", () => {
        expect(
          Money("JPY 100").equals(
            new MoneyClass({
              asset: JPY,
              amount: { amount: 100n, decimals: 0n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("100 JPY").equals(
            new MoneyClass({
              asset: JPY,
              amount: { amount: 100n, decimals: 0n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("JPY 1,234").equals(
            new MoneyClass({
              asset: JPY,
              amount: { amount: 1234n, decimals: 0n },
            }),
          ),
        ).toBe(true)
      })
    })
  })

  describe("EU Number Format (1.234,56)", () => {
    describe("EUR Currency Symbol (€)", () => {
      it("should parse euro amounts with EU formatting", () => {
        expect(
          Money("€1.234,56").equals(
            new MoneyClass({
              asset: EUR,
              amount: { amount: 123456n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("€10.000,00").equals(
            new MoneyClass({
              asset: EUR,
              amount: { amount: 1000000n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("€1.000").equals(
            new MoneyClass({
              asset: EUR,
              amount: { amount: 100000n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse negative euro amounts with EU formatting", () => {
        expect(
          Money("-€1.234,56").equals(
            new MoneyClass({
              asset: EUR,
              amount: { amount: -123456n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("€-1.234,56").equals(
            new MoneyClass({
              asset: EUR,
              amount: { amount: -123456n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })
    })

    describe("Currency Codes with EU formatting", () => {
      it("should parse EUR with EU number formatting", () => {
        expect(
          Money("EUR 1.234,56").equals(
            new MoneyClass({
              asset: EUR,
              amount: { amount: 123456n, decimals: 2n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("1.234,56 EUR").equals(
            new MoneyClass({
              asset: EUR,
              amount: { amount: 123456n, decimals: 2n },
            }),
          ),
        ).toBe(true)
      })
    })
  })

  describe("Stablecoin Currencies", () => {
    describe("USDT (Tether)", () => {
      it("should parse USDT amounts with currency code", () => {
        expect(
          Money("5 USDT").equals(
            new MoneyClass({
              asset: USDT,
              amount: { amount: 5000000n, decimals: 6n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("USDT 5").equals(
            new MoneyClass({
              asset: USDT,
              amount: { amount: 5000000n, decimals: 6n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("100.50 USDT").equals(
            new MoneyClass({
              asset: USDT,
              amount: { amount: 100500000n, decimals: 6n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("USDT 100.50").equals(
            new MoneyClass({
              asset: USDT,
              amount: { amount: 100500000n, decimals: 6n },
            }),
          ),
        ).toBe(true)
      })
    })

    describe("USDC (USD Coin)", () => {
      it("should parse USDC amounts with currency code", () => {
        expect(
          Money("1000.000001 USDC").equals(
            new MoneyClass({
              asset: USDC,
              amount: { amount: 1000000001n, decimals: 6n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("USDC 1000.000001").equals(
            new MoneyClass({
              asset: USDC,
              amount: { amount: 1000000001n, decimals: 6n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("50.123456 USDC").equals(
            new MoneyClass({
              asset: USDC,
              amount: { amount: 50123456n, decimals: 6n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("USDC 50.123456").equals(
            new MoneyClass({
              asset: USDC,
              amount: { amount: 50123456n, decimals: 6n },
            }),
          ),
        ).toBe(true)
      })
    })
  })

  describe("Cryptocurrency Main Units", () => {
    describe("Bitcoin (BTC)", () => {
      it("should parse BTC amounts with 8 decimals", () => {
        expect(
          Money("₿1").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 100000000n, decimals: 8n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("₿0.5").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 50000000n, decimals: 8n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("₿0.00000001").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 1n, decimals: 8n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse BTC with currency code", () => {
        expect(
          Money("BTC 1").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 100000000n, decimals: 8n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("1 BTC").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 100000000n, decimals: 8n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("BTC 0.00000001").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 1n, decimals: 8n },
            }),
          ),
        ).toBe(true)
      })
    })

    describe("Ethereum (ETH)", () => {
      it("should parse ETH amounts with 18 decimals", () => {
        expect(
          Money("Ξ1").equals(
            new MoneyClass({
              asset: ETH,
              amount: { amount: 1000000000000000000n, decimals: 18n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("Ξ0.5").equals(
            new MoneyClass({
              asset: ETH,
              amount: { amount: 500000000000000000n, decimals: 18n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse ETH with currency code", () => {
        expect(
          Money("ETH 1").equals(
            new MoneyClass({
              asset: ETH,
              amount: { amount: 1000000000000000000n, decimals: 18n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("1 ETH").equals(
            new MoneyClass({
              asset: ETH,
              amount: { amount: 1000000000000000000n, decimals: 18n },
            }),
          ),
        ).toBe(true)
      })
    })
  })

  describe("Cryptocurrency Sub-Units", () => {
    describe("Bitcoin Sub-Units", () => {
      it("should parse satoshis (sat, satoshi)", () => {
        expect(
          Money("100 sat").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 100n, decimals: 8n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("100 satoshi").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 100n, decimals: 8n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("100 satoshis").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 100n, decimals: 8n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("1,000 sat").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 1000n, decimals: 8n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("21,000,000 sat").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 21000000n, decimals: 8n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse bits", () => {
        expect(
          Money("1 bit").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 10n, decimals: 8n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("100 bit").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 1000n, decimals: 8n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("1,000 bits").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 10000n, decimals: 8n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse millisatoshis (msat)", () => {
        expect(
          Money("1000 msat").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 1000n, decimals: 12n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("1000 millisatoshi").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 1000n, decimals: 12n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("1000 millisatoshis").equals(
            new MoneyClass({
              asset: BTC,
              amount: { amount: 1000n, decimals: 12n },
            }),
          ),
        ).toBe(true)
      })
    })

    describe("Ethereum Sub-Units", () => {
      it("should parse wei", () => {
        expect(
          Money("1 wei").equals(
            new MoneyClass({
              asset: ETH,
              amount: { amount: 1n, decimals: 18n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("1000 wei").equals(
            new MoneyClass({
              asset: ETH,
              amount: { amount: 1000n, decimals: 18n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("1,000,000 wei").equals(
            new MoneyClass({
              asset: ETH,
              amount: { amount: 1000000n, decimals: 18n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse gwei", () => {
        expect(
          Money("1 gwei").equals(
            new MoneyClass({
              asset: ETH,
              amount: { amount: 1000000000n, decimals: 18n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("1 shannon").equals(
            new MoneyClass({
              asset: ETH,
              amount: { amount: 1000000000n, decimals: 18n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("100 gwei").equals(
            new MoneyClass({
              asset: ETH,
              amount: { amount: 100000000000n, decimals: 18n },
            }),
          ),
        ).toBe(true)
      })

      it("should parse kwei", () => {
        expect(
          Money("1 kwei").equals(
            new MoneyClass({
              asset: ETH,
              amount: { amount: 1000n, decimals: 18n },
            }),
          ),
        ).toBe(true)
        expect(
          Money("1 babbage").equals(
            new MoneyClass({
              asset: ETH,
              amount: { amount: 1000n, decimals: 18n },
            }),
          ),
        ).toBe(true)
      })
    })
  })

  describe("Symbol Disambiguation", () => {
    it("should prefer USD for $ symbol over other dollar currencies", () => {
      // $ should always resolve to USD, not AUD, CAD, etc.
      const money = Money("$100")
      expect(money.asset.code).toBe("USD")
      expect(money.asset).toBe(USD)
    })

    it("should prefer JPY for ¥ symbol over CNY", () => {
      // ¥ should resolve to JPY by default (more common internationally)
      const money = Money("¥100")
      expect(money.asset.code).toBe("JPY")
      expect(money.asset).toBe(JPY)
    })

    it("should prefer GBP for £ symbol over other pound currencies", () => {
      // £ should resolve to GBP by default (most common)
      const money = Money("£100")
      expect(money.asset.code).toBe("GBP")
      expect(money.asset).toBe(GBP)
    })

    it("should handle ambiguous symbols with currency codes", () => {
      // When ambiguous, currency code should be explicit
      expect(Money("AUD 100").asset.code).toBe("AUD")
      expect(Money("CAD 100").asset.code).toBe("CAD")
      expect(Money("CNY 100").asset.code).toBe("CNY")
      expect(Money("NZD 100").asset.code).toBe("NZD")
    })
  })

  describe("Edge Cases and Error Handling", () => {
    it("should handle whitespace variations", () => {
      expect(
        Money("  $100  ").equals(
          new MoneyClass({
            asset: USD,
            amount: { amount: 10000n, decimals: 2n },
          }),
        ),
      ).toBe(true)
      expect(
        Money("$ 100").equals(
          new MoneyClass({
            asset: USD,
            amount: { amount: 10000n, decimals: 2n },
          }),
        ),
      ).toBe(true)
      expect(
        Money("USD  100").equals(
          new MoneyClass({
            asset: USD,
            amount: { amount: 10000n, decimals: 2n },
          }),
        ),
      ).toBe(true)
      expect(
        Money("100  USD").equals(
          new MoneyClass({
            asset: USD,
            amount: { amount: 10000n, decimals: 2n },
          }),
        ),
      ).toBe(true)
    })

    it("should handle very large amounts", () => {
      expect(
        Money("$999,999,999.99").equals(
          new MoneyClass({
            asset: USD,
            amount: { amount: 99999999999n, decimals: 2n },
          }),
        ),
      ).toBe(true)
      expect(
        Money("1,000,000 satoshi").equals(
          new MoneyClass({
            asset: BTC,
            amount: { amount: 1000000n, decimals: 8n },
          }),
        ),
      ).toBe(true)
    })

    it("should throw errors for invalid formats", () => {
      expect(() => Money("")).toThrow()
      expect(() => Money("invalid")).toThrow()
      expect(() => Money("$")).toThrow()
      expect(() => Money("100")).toThrow() // No currency specified
      expect(() => Money("XYZ 100")).toThrow() // Unknown currency
      expect(() => Money("100 unknown")).toThrow() // Unknown unit
    })

    it("should throw errors for malformed numbers", () => {
      expect(() => Money("$1,00")).toThrow() // Invalid thousands separator
      expect(() => Money("$1.234.56")).toThrow() // Multiple decimal points
      expect(() => Money("$1..50")).toThrow() // Double decimal
      expect(() => Money("$1,2345")).toThrow() // Invalid grouping
    })

    it("should allow sub-unit precision for financial accuracy", () => {
      // Financial libraries should support higher precision than standard currency decimals
      expect(
        Money("JPY 100.50").equals(
          new MoneyClass({
            asset: JPY,
            amount: { amount: 10050n, decimals: 2n },
          }),
        ),
      ).toBe(true)
      expect(
        Money("$100.123").equals(
          new MoneyClass({
            asset: USD,
            amount: { amount: 100123n, decimals: 3n },
          }),
        ),
      ).toBe(true)
    })
  })

  describe("Case Sensitivity", () => {
    it("should be case insensitive for currency codes", () => {
      expect(
        Money("usd 100").equals(
          new MoneyClass({
            asset: USD,
            amount: { amount: 10000n, decimals: 2n },
          }),
        ),
      ).toBe(true)
      expect(
        Money("USD 100").equals(
          new MoneyClass({
            asset: USD,
            amount: { amount: 10000n, decimals: 2n },
          }),
        ),
      ).toBe(true)
      expect(
        Money("Usd 100").equals(
          new MoneyClass({
            asset: USD,
            amount: { amount: 10000n, decimals: 2n },
          }),
        ),
      ).toBe(true)
    })

    it("should be case insensitive for crypto sub-units", () => {
      expect(
        Money("100 SAT").equals(
          new MoneyClass({
            asset: BTC,
            amount: { amount: 100n, decimals: 8n },
          }),
        ),
      ).toBe(true)
      expect(
        Money("100 sat").equals(
          new MoneyClass({
            asset: BTC,
            amount: { amount: 100n, decimals: 8n },
          }),
        ),
      ).toBe(true)
      expect(
        Money("100 Sat").equals(
          new MoneyClass({
            asset: BTC,
            amount: { amount: 100n, decimals: 8n },
          }),
        ),
      ).toBe(true)
      expect(
        Money("1000 GWEI").equals(
          new MoneyClass({
            asset: ETH,
            amount: { amount: 1000000000000n, decimals: 18n },
          }),
        ),
      ).toBe(true)
      expect(
        Money("1000 Wei").equals(
          new MoneyClass({
            asset: ETH,
            amount: { amount: 1000n, decimals: 18n },
          }),
        ),
      ).toBe(true)
    })
  })

  describe("Format Detection", () => {
    it("should auto-detect US vs EU number formatting based on currency", () => {
      // $ should imply US formatting by default
      expect(
        Money("$1,234.56").equals(
          new MoneyClass({
            asset: USD,
            amount: { amount: 123456n, decimals: 2n },
          }),
        ),
      ).toBe(true)

      // € should allow both US and EU formatting, but prefer EU for decimal comma
      expect(
        Money("€1.234,56").equals(
          new MoneyClass({
            asset: EUR,
            amount: { amount: 123456n, decimals: 2n },
          }),
        ),
      ).toBe(true)
      expect(
        Money("€1,234.56").equals(
          new MoneyClass({
            asset: EUR,
            amount: { amount: 123456n, decimals: 2n },
          }),
        ),
      ).toBe(true)
    })

    it("should handle ambiguous formatting by context", () => {
      // Clear cases
      expect(
        Money("€1.234,56").equals(
          new MoneyClass({
            asset: EUR,
            amount: { amount: 123456n, decimals: 2n },
          }),
        ),
      ).toBe(true) // EU format
      expect(
        Money("$1,234.56").equals(
          new MoneyClass({
            asset: USD,
            amount: { amount: 123456n, decimals: 2n },
          }),
        ),
      ).toBe(true) // US format

      // Unambiguous cases (no thousands separator)
      expect(
        Money("€100.50").equals(
          new MoneyClass({
            asset: EUR,
            amount: { amount: 10050n, decimals: 2n },
          }),
        ),
      ).toBe(true)
      expect(
        Money("€100,50").equals(
          new MoneyClass({
            asset: EUR,
            amount: { amount: 10050n, decimals: 2n },
          }),
        ),
      ).toBe(true)
    })
  })

  describe("JSON Deserialization", () => {
    it("should deserialize JSON objects from Money.toJSON()", () => {
      // Create original money instance
      const originalMoney = new MoneyClass({
        asset: USD,
        amount: { amount: 12345n, decimals: 2n },
      })

      // Get JSON representation
      const json = originalMoney.toJSON()

      // Factory should be able to deserialize it
      const deserializedMoney = Money(json)

      expect(deserializedMoney.equals(originalMoney)).toBe(true)
      expect(deserializedMoney.currency.code).toBe(originalMoney.currency.code)
      expect(deserializedMoney.currency.name).toBe(originalMoney.currency.name)
      expect(deserializedMoney.amount.equals(originalMoney.amount)).toBe(true)
    })

    it("should work with different currencies", () => {
      const currencies = [USD, EUR, BTC, ETH]
      
      for (const currency of currencies) {
        const originalMoney = new MoneyClass({
          asset: currency,
          amount: { amount: 100000n, decimals: currency.decimals },
        })

        const json = originalMoney.toJSON()
        const deserializedMoney = Money(json)

        expect(deserializedMoney.equals(originalMoney)).toBe(true)
      }
    })

    it("should preserve precision through JSON round-trip", () => {
      // Test with high precision amount
      const originalMoney = new MoneyClass({
        asset: BTC,
        amount: { amount: 123456789n, decimals: 8n }, // 1.23456789 BTC
      })

      const json = originalMoney.toJSON()
      const deserializedMoney = Money(json)

      expect(deserializedMoney.equals(originalMoney)).toBe(true)
      expect(deserializedMoney.amount.toString()).toBe("1.23456789")
    })

    it("should distinguish between JSON objects and AssetAmount objects", () => {
      // Create a Money instance and get its JSON representation
      const originalMoney = new MoneyClass({
        asset: USD,
        amount: { amount: 12345n, decimals: 2n }
      })
      const jsonObject = originalMoney.toJSON()

      // AssetAmount object (has 'asset' field)
      const assetAmountObject = {
        asset: USD,
        amount: { amount: 12345n, decimals: 2n }
      }

      const fromJson = Money(jsonObject)
      const fromAssetAmount = Money(assetAmountObject)

      expect(fromJson.equals(fromAssetAmount)).toBe(true)
      expect(fromJson.currency.code).toBe("USD")
      expect(fromAssetAmount.currency.code).toBe("USD")
    })
  })
})
