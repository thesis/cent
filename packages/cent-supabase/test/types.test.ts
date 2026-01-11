import { describe, expect, it } from "@jest/globals"
import {
  hasCurrencyCode,
  hasCurrencyColumn,
  normalizeConfig,
  type CentSupabaseOptions,
  type MoneyColumnConfig,
} from "../src/types"

describe("types", () => {
  describe("hasCurrencyColumn", () => {
    it("returns true for dynamic currency config", () => {
      const config: MoneyColumnConfig = { currencyColumn: "currency" }
      expect(hasCurrencyColumn(config)).toBe(true)
    })

    it("returns false for static currency config", () => {
      const config: MoneyColumnConfig = { currencyCode: "USD" }
      expect(hasCurrencyColumn(config)).toBe(false)
    })
  })

  describe("hasCurrencyCode", () => {
    it("returns true for static currency config", () => {
      const config: MoneyColumnConfig = { currencyCode: "USD" }
      expect(hasCurrencyCode(config)).toBe(true)
    })

    it("returns false for dynamic currency config", () => {
      const config: MoneyColumnConfig = { currencyColumn: "currency" }
      expect(hasCurrencyCode(config)).toBe(false)
    })
  })

  describe("normalizeConfig", () => {
    it("normalizes a simple config", () => {
      const options: CentSupabaseOptions = {
        tables: {
          orders: {
            money: {
              total: { currencyColumn: "currency" },
            },
          },
        },
      }

      const config = normalizeConfig(options)

      expect(config.tables.orders).toBeDefined()
      expect(config.tables.orders.moneyColumns).toEqual(["total"])
      expect(config.tables.orders.money.total).toEqual({
        currencyColumn: "currency",
        currencyCode: undefined,
        minorUnits: false,
      })
    })

    it("handles static currency configs", () => {
      const options: CentSupabaseOptions = {
        tables: {
          products: {
            money: {
              price: { currencyCode: "USD" },
            },
          },
        },
      }

      const config = normalizeConfig(options)

      expect(config.tables.products.money.price).toEqual({
        currencyColumn: undefined,
        currencyCode: "USD",
        minorUnits: false,
      })
    })

    it("handles minorUnits flag", () => {
      const options: CentSupabaseOptions = {
        tables: {
          wallets: {
            money: {
              balance_sats: { currencyCode: "BTC", minorUnits: true },
            },
          },
        },
      }

      const config = normalizeConfig(options)

      expect(config.tables.wallets.money.balance_sats.minorUnits).toBe(true)
    })

    it("handles multiple tables and columns", () => {
      const options: CentSupabaseOptions = {
        tables: {
          orders: {
            money: {
              total: { currencyColumn: "currency" },
              tax: { currencyColumn: "currency" },
            },
          },
          products: {
            money: {
              price: { currencyCode: "USD" },
              cost: { currencyCode: "USD" },
            },
          },
        },
      }

      const config = normalizeConfig(options)

      expect(config.tables.orders.moneyColumns).toEqual(["total", "tax"])
      expect(config.tables.products.moneyColumns).toEqual(["price", "cost"])
    })
  })
})
