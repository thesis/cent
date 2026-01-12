import { describe, expect, it } from "@jest/globals"
import { MoneyClass } from "@thesis-co/cent"
import { zMoney, zMoneyJSON, zMoneyString } from "../src"

describe("zMoneyString", () => {
  it("parses money string with symbol prefix", () => {
    const result = zMoneyString.parse("$100.50")
    expect(result).toBeInstanceOf(MoneyClass)
    expect(result.toString()).toBe("$100.50")
  })

  it("parses money string with currency code suffix", () => {
    const result = zMoneyString.parse("100.50 USD")
    expect(result).toBeInstanceOf(MoneyClass)
    expect(result.currency.code).toBe("USD")
  })

  it("parses euro amounts", () => {
    const result = zMoneyString.parse("€50.00")
    expect(result.currency.code).toBe("EUR")
  })

  it("rejects invalid money strings", () => {
    expect(() => zMoneyString.parse("invalid")).toThrow()
  })
})

describe("zMoneyJSON", () => {
  it("parses Money JSON with currency code string", () => {
    const result = zMoneyJSON.parse({
      currency: "USD",
      amount: "100.50",
    })
    expect(result).toBeInstanceOf(MoneyClass)
    expect(result.toString()).toBe("$100.50")
  })

  it("parses Money JSON with full currency object", () => {
    const result = zMoneyJSON.parse({
      currency: {
        name: "United States dollar",
        code: "USD",
        decimals: "2",
        symbol: "$",
      },
      amount: "50.00",
    })
    expect(result).toBeInstanceOf(MoneyClass)
    // Custom currency objects preserve their properties
    expect(result.currency.name).toBe("United States dollar")
  })

  it("parses Money JSON with rational amount", () => {
    const result = zMoneyJSON.parse({
      currency: "USD",
      amount: { p: "10050", q: "100" },
    })
    expect(result).toBeInstanceOf(MoneyClass)
  })
})

describe("zMoney", () => {
  it("accepts string format", () => {
    const schema = zMoney()
    const result = schema.parse("$100.50")
    expect(result).toBeInstanceOf(MoneyClass)
  })

  it("accepts JSON format", () => {
    const schema = zMoney()
    const result = schema.parse({
      currency: "USD",
      amount: "100.50",
    })
    expect(result).toBeInstanceOf(MoneyClass)
  })

  it("accepts Money instance passthrough", () => {
    const schema = zMoney()
    const money = MoneyClass.fromJSON({
      currency: "USD",
      amount: "100.50",
    })
    const result = schema.parse(money)
    expect(result).toBe(money)
  })

  describe("with currency constraint", () => {
    it("accepts matching currency", () => {
      const schema = zMoney("USD")
      const result = schema.parse("$100.00")
      expect(result.currency.code).toBe("USD")
    })

    it("rejects non-matching currency", () => {
      const schema = zMoney("USD")
      expect(() => schema.parse("€100.00")).toThrow(/Expected currency USD/)
    })
  })

  describe("with min/max constraints", () => {
    it("accepts value within range", () => {
      const schema = zMoney({ min: "$10.00", max: "$100.00" })
      const result = schema.parse("$50.00")
      expect(result.toString()).toBe("$50.00")
    })

    it("rejects value below min", () => {
      const schema = zMoney({ min: "$10.00" })
      expect(() => schema.parse("$5.00")).toThrow(/at least/)
    })

    it("rejects value above max", () => {
      const schema = zMoney({ max: "$100.00" })
      expect(() => schema.parse("$150.00")).toThrow(/at most/)
    })
  })

  describe("with positive/nonNegative/nonZero constraints", () => {
    it("positive rejects zero", () => {
      const schema = zMoney({ positive: true })
      expect(() => schema.parse("$0.00")).toThrow(/positive/)
    })

    it("positive rejects negative", () => {
      const schema = zMoney({ positive: true })
      expect(() => schema.parse("-$10.00")).toThrow(/positive/)
    })

    it("nonNegative accepts zero", () => {
      const schema = zMoney({ nonNegative: true })
      const result = schema.parse("$0.00")
      expect(result.isZero()).toBe(true)
    })

    it("nonNegative rejects negative", () => {
      const schema = zMoney({ nonNegative: true })
      expect(() => schema.parse("-$10.00")).toThrow(/non-negative/)
    })

    it("nonZero rejects zero", () => {
      const schema = zMoney({ nonZero: true })
      expect(() => schema.parse("$0.00")).toThrow(/not be zero/)
    })
  })
})
