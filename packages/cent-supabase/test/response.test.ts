import { describe, expect, it } from "@jest/globals"
import { Money, MoneyClass } from "@thesis-co/cent"
import { transformResponseData, transformRow } from "../src/transform/response"
import type { NormalizedTableConfig } from "../src/types"

describe("response transformation", () => {
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

  describe("transformResponseData", () => {
    describe("with temp columns (SELECT * pattern)", () => {
      it("transforms temp column values to Money and removes temp columns", () => {
        const config = createConfig({ price: { currencyCode: "USD" } })
        const data = {
          id: 1,
          name: "Widget",
          price: 99.99, // Original (precision lost)
          __cent_price: "99.99", // Temp column (precision preserved)
        }

        const result = transformResponseData(data, config, ["__cent_price"])

        expect(MoneyClass.isMoney(result.price)).toBe(true)
        expect((result.price as MoneyClass).toDecimalString()).toBe("99.99")
        expect(result.__cent_price).toBeUndefined()
        expect(result.id).toBe(1)
        expect(result.name).toBe("Widget")
      })

      it("handles multiple temp columns", () => {
        const config = createConfig({
          price: { currencyCode: "USD" },
          cost: { currencyCode: "USD" },
        })
        const data = {
          id: 1,
          price: 100,
          cost: 50,
          __cent_price: "100.00",
          __cent_cost: "50.00",
        }

        const result = transformResponseData(data, config, [
          "__cent_price",
          "__cent_cost",
        ])

        expect(MoneyClass.isMoney(result.price)).toBe(true)
        expect(MoneyClass.isMoney(result.cost)).toBe(true)
        expect(result.__cent_price).toBeUndefined()
        expect(result.__cent_cost).toBeUndefined()
      })
    })

    describe("with direct string values (explicit SELECT pattern)", () => {
      it("transforms string values to Money", () => {
        const config = createConfig({ price: { currencyCode: "USD" } })
        const data = {
          id: 1,
          name: "Widget",
          price: "99.99", // Already a string from ::text cast
        }

        const result = transformResponseData(data, config)

        expect(MoneyClass.isMoney(result.price)).toBe(true)
        expect((result.price as MoneyClass).toDecimalString()).toBe("99.99")
      })

      it("leaves non-string money columns unchanged (no cast was applied)", () => {
        const config = createConfig({ price: { currencyCode: "USD" } })
        const data = {
          id: 1,
          price: 99.99, // Number - wasn't cast, don't transform
        }

        const result = transformResponseData(data, config)

        // Number stays as number (user didn't cast it)
        expect(result.price).toBe(99.99)
        expect(MoneyClass.isMoney(result.price)).toBe(false)
      })
    })

    describe("with dynamic currency (currencyColumn)", () => {
      it("reads currency from specified column", () => {
        const config = createConfig({ total: { currencyColumn: "currency" } })
        const data = {
          id: 1,
          total: "150.00",
          currency: "EUR",
        }

        const result = transformResponseData(data, config)

        expect(MoneyClass.isMoney(result.total)).toBe(true)
        expect((result.total as MoneyClass).currency.code).toBe("EUR")
      })

      it("handles different currencies per row", () => {
        const config = createConfig({ amount: { currencyColumn: "currency" } })
        const rows = [
          { id: 1, amount: "100.00", currency: "USD" },
          { id: 2, amount: "200.00", currency: "EUR" },
          { id: 3, amount: "1.5", currency: "BTC" },
        ]

        const result = transformResponseData(rows, config)

        expect((result[0].amount as MoneyClass).currency.code).toBe("USD")
        expect((result[1].amount as MoneyClass).currency.code).toBe("EUR")
        expect((result[2].amount as MoneyClass).currency.code).toBe("BTC")
      })
    })

    describe("with minor units", () => {
      it("converts minor units to Money", () => {
        const config = createConfig({
          balance_sats: { currencyCode: "BTC", minorUnits: true },
        })
        const data = {
          id: 1,
          balance_sats: "150000000", // 1.5 BTC in satoshis
        }

        const result = transformResponseData(data, config)

        expect(MoneyClass.isMoney(result.balance_sats)).toBe(true)
        expect((result.balance_sats as MoneyClass).toDecimalString()).toBe("1.50000000")
      })

      it("handles cents as minor units", () => {
        const config = createConfig({
          amount_cents: { currencyCode: "USD", minorUnits: true },
        })
        const data = {
          id: 1,
          amount_cents: "10050", // $100.50 in cents
        }

        const result = transformResponseData(data, config)

        expect(MoneyClass.isMoney(result.amount_cents)).toBe(true)
        expect((result.amount_cents as MoneyClass).toDecimalString()).toBe("100.50")
      })
    })

    describe("with arrays of rows", () => {
      it("transforms all rows in array", () => {
        const config = createConfig({ price: { currencyCode: "USD" } })
        const data = [
          { id: 1, price: "10.00" },
          { id: 2, price: "20.00" },
          { id: 3, price: "30.00" },
        ]

        const result = transformResponseData(data, config)

        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(3)
        result.forEach((row) => {
          expect(MoneyClass.isMoney(row.price)).toBe(true)
        })
      })

      it("handles empty array", () => {
        const config = createConfig({ price: { currencyCode: "USD" } })
        const result = transformResponseData([], config)

        expect(result).toEqual([])
      })
    })

    describe("null and undefined handling", () => {
      it("preserves null values", () => {
        const config = createConfig({ price: { currencyCode: "USD" } })
        const data = { id: 1, price: null }

        const result = transformResponseData(data, config)

        expect(result.price).toBeNull()
      })

      it("preserves undefined values", () => {
        const config = createConfig({ price: { currencyCode: "USD" } })
        const data = { id: 1, name: "Test" } // price not included

        const result = transformResponseData(data, config)

        expect(result.price).toBeUndefined()
      })
    })

    describe("large number precision", () => {
      it("preserves precision for large numbers", () => {
        const config = createConfig({ amount: { currencyCode: "USD" } })
        const data = {
          id: 1,
          amount: "900719925474099.28", // Larger than MAX_SAFE_INTEGER
        }

        const result = transformResponseData(data, config)

        expect(MoneyClass.isMoney(result.amount)).toBe(true)
        expect((result.amount as MoneyClass).toDecimalString()).toBe(
          "900719925474099.28",
        )
      })

      it("preserves precision for crypto amounts", () => {
        const config = createConfig({ balance: { currencyCode: "ETH" } })
        const data = {
          id: 1,
          balance: "123456789.123456789012345678", // 18 decimals
        }

        const result = transformResponseData(data, config)

        expect(MoneyClass.isMoney(result.balance)).toBe(true)
        // Should preserve all 18 decimals
        expect((result.balance as MoneyClass).toDecimalString()).toBe(
          "123456789.123456789012345678",
        )
      })
    })
  })

  describe("transformRow", () => {
    it("transforms a single row", () => {
      const config = createConfig({ price: { currencyCode: "USD" } })
      const row = { id: 1, price: "50.00" }

      const result = transformRow(row, config)

      expect(MoneyClass.isMoney(result.price)).toBe(true)
    })

    it("does not mutate original row", () => {
      const config = createConfig({ price: { currencyCode: "USD" } })
      const row = { id: 1, price: "50.00" }

      transformRow(row, config)

      expect(row.price).toBe("50.00")
    })
  })
})
