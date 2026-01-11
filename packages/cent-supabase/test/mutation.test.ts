import { describe, expect, it } from "@jest/globals"
import { Money, MoneyClass } from "@thesis-co/cent"
import {
  serializeMoneyInData,
  serializeMoneyValue,
  serializeRow,
} from "../src/transform/mutation"
import type { NormalizedTableConfig } from "../src/types"

describe("mutation serialization", () => {
  // Helper to create a table config
  const createConfig = (
    columns: Record<
      string,
      { currencyCode?: string; currencyColumn?: string; minorUnits?: boolean }
    >,
  ): NormalizedTableConfig => ({
    moneyColumns: Object.keys(columns),
    money: Object.fromEntries(
      Object.entries(columns).map(([col, config]) => [
        col,
        {
          currencyCode: config.currencyCode,
          currencyColumn: config.currencyColumn,
          minorUnits: config.minorUnits ?? false,
        },
      ]),
    ),
  })

  describe("serializeMoneyInData", () => {
    describe("basic Money serialization", () => {
      it("serializes Money instance to decimal string", () => {
        const config = createConfig({ price: { currencyCode: "USD" } })
        const data = {
          id: 1,
          name: "Widget",
          price: Money("$99.99"),
        }

        const result = serializeMoneyInData(data, config)

        expect(result.price).toBe("99.99")
        expect(result.id).toBe(1)
        expect(result.name).toBe("Widget")
      })

      it("serializes multiple Money columns", () => {
        const config = createConfig({
          price: { currencyCode: "USD" },
          cost: { currencyCode: "USD" },
        })
        const data = {
          id: 1,
          price: Money("$100.00"),
          cost: Money("$50.00"),
        }

        const result = serializeMoneyInData(data, config)

        expect(result.price).toBe("100.00")
        expect(result.cost).toBe("50.00")
      })

      it("passes through non-Money values unchanged", () => {
        const config = createConfig({ price: { currencyCode: "USD" } })
        const data = {
          id: 1,
          price: "99.99", // Already a string
          name: "Widget",
        }

        const result = serializeMoneyInData(data, config)

        expect(result.price).toBe("99.99")
        expect(result.id).toBe(1)
        expect(result.name).toBe("Widget")
      })

      it("passes through numeric values unchanged", () => {
        const config = createConfig({ price: { currencyCode: "USD" } })
        const data = {
          id: 1,
          price: 99.99, // Number
        }

        const result = serializeMoneyInData(data, config)

        expect(result.price).toBe(99.99)
      })
    })

    describe("currency column auto-population", () => {
      it("auto-populates currency column from Money instance", () => {
        const config = createConfig({ total: { currencyColumn: "currency" } })
        const data = {
          id: 1,
          total: Money("€150.00"),
        }

        const result = serializeMoneyInData(data, config)

        expect(result.total).toBe("150.00")
        expect(result.currency).toBe("EUR")
      })

      it("auto-populates multiple currency columns", () => {
        const config = createConfig({
          subtotal: { currencyColumn: "subtotal_currency" },
          shipping: { currencyColumn: "shipping_currency" },
        })
        const data = {
          id: 1,
          subtotal: Money("€100.00"),
          shipping: Money("$10.00"),
        }

        const result = serializeMoneyInData(data, config)

        expect(result.subtotal).toBe("100.00")
        expect(result.subtotal_currency).toBe("EUR")
        expect(result.shipping).toBe("10.00")
        expect(result.shipping_currency).toBe("USD")
      })

      it("does not override existing currency column value", () => {
        const config = createConfig({ total: { currencyColumn: "currency" } })
        const data = {
          id: 1,
          total: Money("€150.00"),
          currency: "GBP", // Explicitly set (should warn or override?)
        }

        // Implementation note: Could warn or throw if currency doesn't match
        // For now, the Money's currency should take precedence
        const result = serializeMoneyInData(data, config)

        expect(result.currency).toBe("EUR") // Money takes precedence
      })

      it("handles shared currency column with matching currencies", () => {
        const config = createConfig({
          total: { currencyColumn: "currency" },
          tax: { currencyColumn: "currency" },
        })
        const data = {
          id: 1,
          total: Money("€150.00"),
          tax: Money("€15.00"),
        }

        const result = serializeMoneyInData(data, config)

        expect(result.total).toBe("150.00")
        expect(result.tax).toBe("15.00")
        expect(result.currency).toBe("EUR")
      })

      it("throws error for conflicting currencies on shared currency column", () => {
        const config = createConfig({
          total: { currencyColumn: "currency" },
          tax: { currencyColumn: "currency" },
        })
        const data = {
          id: 1,
          total: Money("€150.00"),
          tax: Money("$15.00"), // Different currency!
        }

        expect(() => serializeMoneyInData(data, config)).toThrow(
          /conflicting currencies/i,
        )
      })
    })

    describe("minor units mode", () => {
      it("serializes to minor units when configured", () => {
        const config = createConfig({
          balance_sats: { currencyCode: "BTC", minorUnits: true },
        })
        const data = {
          id: 1,
          balance_sats: Money("1.5 BTC"), // 150000000 satoshis
        }

        const result = serializeMoneyInData(data, config)

        expect(result.balance_sats).toBe("150000000")
      })

      it("serializes cents correctly", () => {
        const config = createConfig({
          amount_cents: { currencyCode: "USD", minorUnits: true },
        })
        const data = {
          id: 1,
          amount_cents: Money("$100.50"),
        }

        const result = serializeMoneyInData(data, config)

        expect(result.amount_cents).toBe("10050")
      })

      it("handles minor units with currency column", () => {
        const config = createConfig({
          amount_minor: { currencyColumn: "currency", minorUnits: true },
        })
        const data = {
          id: 1,
          amount_minor: Money("¥1000"), // JPY has 0 decimals
        }

        const result = serializeMoneyInData(data, config)

        expect(result.amount_minor).toBe("1000")
        expect(result.currency).toBe("JPY")
      })
    })

    describe("array handling", () => {
      it("serializes array of rows", () => {
        const config = createConfig({ price: { currencyCode: "USD" } })
        const data = [
          { id: 1, price: Money("$10.00") },
          { id: 2, price: Money("$20.00") },
          { id: 3, price: Money("$30.00") },
        ]

        const result = serializeMoneyInData(data, config)

        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(3)
        expect(result[0].price).toBe("10.00")
        expect(result[1].price).toBe("20.00")
        expect(result[2].price).toBe("30.00")
      })

      it("handles empty array", () => {
        const config = createConfig({ price: { currencyCode: "USD" } })
        const result = serializeMoneyInData([], config)

        expect(result).toEqual([])
      })
    })

    describe("null and undefined handling", () => {
      it("preserves null values", () => {
        const config = createConfig({ price: { currencyCode: "USD" } })
        const data = { id: 1, price: null }

        const result = serializeMoneyInData(data, config)

        expect(result.price).toBeNull()
      })

      it("preserves undefined values", () => {
        const config = createConfig({ price: { currencyCode: "USD" } })
        const data = { id: 1, name: "Test" } // price not included

        const result = serializeMoneyInData(data, config)

        expect(result.price).toBeUndefined()
      })
    })

    describe("precision preservation", () => {
      it("preserves large number precision", () => {
        const config = createConfig({ amount: { currencyCode: "USD" } })
        const data = {
          id: 1,
          amount: Money("900719925474099.28 USD"),
        }

        const result = serializeMoneyInData(data, config)

        expect(result.amount).toBe("900719925474099.28")
      })

      it("preserves crypto precision (18 decimals)", () => {
        const config = createConfig({ balance: { currencyCode: "ETH" } })
        const data = {
          id: 1,
          balance: Money("123456789.123456789012345678 ETH"),
        }

        const result = serializeMoneyInData(data, config)

        expect(result.balance).toBe("123456789.123456789012345678")
      })
    })
  })

  describe("serializeRow", () => {
    it("serializes a single row", () => {
      const config = createConfig({ price: { currencyCode: "USD" } })
      const row = { id: 1, price: Money("$50.00") }

      const result = serializeRow(row, config)

      expect(result.price).toBe("50.00")
    })

    it("does not mutate original row", () => {
      const config = createConfig({ price: { currencyCode: "USD" } })
      const originalMoney = Money("$50.00")
      const row = { id: 1, price: originalMoney }

      serializeRow(row, config)

      expect(row.price).toBe(originalMoney)
      expect(MoneyClass.isMoney(row.price)).toBe(true)
    })
  })

  describe("serializeMoneyValue", () => {
    it("serializes to decimal string by default", () => {
      const money = Money("$100.50")
      const result = serializeMoneyValue(money, false)

      expect(result).toBe("100.50")
    })

    it("serializes to minor units when requested", () => {
      const money = Money("$100.50")
      const result = serializeMoneyValue(money, true)

      expect(result).toBe("10050")
    })

    it("handles BTC satoshis", () => {
      const money = Money("1.5 BTC")
      const result = serializeMoneyValue(money, true)

      expect(result).toBe("150000000")
    })

    it("preserves precision in decimal string", () => {
      const money = Money("123456789.123456789012345678 ETH")
      const result = serializeMoneyValue(money, false)

      expect(result).toBe("123456789.123456789012345678")
    })
  })
})
