import { describe, expect, it } from "@jest/globals"
import {
  getOriginalColumnName,
  getTempColumnName,
  isTempColumn,
  rewriteSelect,
  TEMP_COLUMN_PREFIX,
} from "../src/transform/select"
import type { NormalizedTableConfig } from "../src/types"

describe("SELECT rewriting", () => {
  // Helper to create a simple table config
  const createConfig = (
    moneyColumns: string[],
  ): NormalizedTableConfig => ({
    moneyColumns,
    money: Object.fromEntries(
      moneyColumns.map((col) => [
        col,
        { currencyCode: "USD", minorUnits: false },
      ]),
    ),
  })

  describe("rewriteSelect", () => {
    describe("SELECT * handling", () => {
      it("appends temp columns for money columns with SELECT *", () => {
        const config = createConfig(["price", "cost"])
        const result = rewriteSelect("*", config)

        expect(result.select).toBe(
          "*, price::text as __cent_price, cost::text as __cent_cost",
        )
        expect(result.tempColumns).toEqual(["__cent_price", "__cent_cost"])
      })

      it("handles single money column with SELECT *", () => {
        const config = createConfig(["amount"])
        const result = rewriteSelect("*", config)

        expect(result.select).toBe("*, amount::text as __cent_amount")
        expect(result.tempColumns).toEqual(["__cent_amount"])
      })

      it("returns unchanged * when no money columns", () => {
        const config = createConfig([])
        const result = rewriteSelect("*", config)

        expect(result.select).toBe("*")
        expect(result.tempColumns).toEqual([])
      })

      it("handles * with whitespace", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("  *  ", config)

        expect(result.select).toBe("*, price::text as __cent_price")
      })
    })

    describe("explicit column handling", () => {
      it("casts money columns in explicit select", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("id, name, price", config)

        expect(result.select).toBe("id, name, price::text")
        expect(result.tempColumns).toEqual([])
      })

      it("casts multiple money columns", () => {
        const config = createConfig(["price", "cost"])
        const result = rewriteSelect("id, price, name, cost", config)

        expect(result.select).toBe("id, price::text, name, cost::text")
      })

      it("leaves non-money columns unchanged", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("id, name, created_at", config)

        expect(result.select).toBe("id, name, created_at")
      })

      it("handles column aliases", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("id, price as product_price", config)

        expect(result.select).toBe("id, price::text as product_price")
      })

      it("handles AS keyword (case insensitive)", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("id, price AS product_price", config)

        expect(result.select).toBe("id, price::text AS product_price")
      })
    })

    describe("aggregate functions", () => {
      it("casts sum() of money columns", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("sum(price)", config)

        expect(result.select).toBe("sum(price)::text")
      })

      it("casts avg() of money columns", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("avg(price)", config)

        expect(result.select).toBe("avg(price)::text")
      })

      it("casts min() and max() of money columns", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("min(price), max(price)", config)

        expect(result.select).toBe("min(price)::text, max(price)::text")
      })

      it("handles aggregate with alias", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("sum(price) as total", config)

        expect(result.select).toBe("sum(price)::text as total")
      })

      it("does not cast count()", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("count(*), sum(price)", config)

        expect(result.select).toBe("count(*), sum(price)::text")
      })
    })

    describe("already-cast columns", () => {
      it("does not double-cast columns with ::text", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("id, price::text", config)

        expect(result.select).toBe("id, price::text")
      })

      it("does not modify columns with other casts", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("id, price::numeric", config)

        expect(result.select).toBe("id, price::numeric")
      })

      it("does not modify already-cast aggregate", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("sum(price)::text", config)

        expect(result.select).toBe("sum(price)::text")
      })
    })

    describe("nested relations (limitations)", () => {
      it("passes through nested relation selects unchanged", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("id, items(id, quantity)", config)

        // Nested relations are not rewritten (documented limitation)
        expect(result.select).toBe("id, items(id, quantity)")
      })

      it("still casts top-level money columns with nested relations", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("id, price, items(id, quantity)", config)

        expect(result.select).toBe("id, price::text, items(id, quantity)")
      })
    })

    describe("edge cases", () => {
      it("handles empty string", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("", config)

        expect(result.select).toBe("")
      })

      it("handles columns with underscores", () => {
        const config = createConfig(["unit_price", "total_cost"])
        const result = rewriteSelect("id, unit_price, total_cost", config)

        expect(result.select).toBe("id, unit_price::text, total_cost::text")
      })

      it("handles mixed whitespace", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("id,  price,   name", config)

        expect(result.select).toBe("id, price::text, name")
      })

      it("handles columns that are substrings of others", () => {
        const config = createConfig(["price"])
        const result = rewriteSelect("id, price, price_history", config)

        // Should only cast 'price', not 'price_history'
        expect(result.select).toBe("id, price::text, price_history")
      })
    })
  })

  describe("temp column utilities", () => {
    describe("getTempColumnName", () => {
      it("adds prefix to column name", () => {
        expect(getTempColumnName("price")).toBe("__cent_price")
        expect(getTempColumnName("total_cost")).toBe("__cent_total_cost")
      })
    })

    describe("isTempColumn", () => {
      it("returns true for temp columns", () => {
        expect(isTempColumn("__cent_price")).toBe(true)
        expect(isTempColumn("__cent_total")).toBe(true)
      })

      it("returns false for regular columns", () => {
        expect(isTempColumn("price")).toBe(false)
        expect(isTempColumn("_price")).toBe(false)
        expect(isTempColumn("cent_price")).toBe(false)
      })
    })

    describe("getOriginalColumnName", () => {
      it("removes prefix from temp column", () => {
        expect(getOriginalColumnName("__cent_price")).toBe("price")
        expect(getOriginalColumnName("__cent_total_cost")).toBe("total_cost")
      })

      it("returns unchanged for non-temp columns", () => {
        expect(getOriginalColumnName("price")).toBe("price")
        expect(getOriginalColumnName("total")).toBe("total")
      })
    })

    describe("TEMP_COLUMN_PREFIX", () => {
      it("is __cent_", () => {
        expect(TEMP_COLUMN_PREFIX).toBe("__cent_")
      })
    })
  })
})
