import { describe, expect, it } from "@jest/globals"
import {
  Money,
  MoneyClass,
  Ok,
  Err,
  ok,
  err,
  ParseError,
  InvalidInputError,
  CentError,
} from "../src"
import type { Result } from "../src"

describe("Result Type", () => {
  describe("Ok class", () => {
    it("creates an Ok with a value", () => {
      const result = new Ok(42)
      expect(result.ok).toBe(true)
      expect(result.value).toBe(42)
    })

    it("map transforms the value", () => {
      const result = new Ok(10).map((x) => x * 2)
      expect(result.ok).toBe(true)
      expect(result.value).toBe(20)
    })

    it("flatMap chains Result-returning functions", () => {
      const result = new Ok(10).flatMap((x) =>
        x > 0 ? new Ok(x * 2) : new Err("negative")
      )
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(20)
      }
    })

    it("unwrap returns the value", () => {
      const result = new Ok(42)
      expect(result.unwrap()).toBe(42)
    })

    it("unwrapOr returns the value (ignores default)", () => {
      const result = new Ok(42)
      expect(result.unwrapOr(0)).toBe(42)
    })

    it("unwrapOrElse returns the value (ignores function)", () => {
      const result = new Ok(42)
      expect(result.unwrapOrElse(() => 0)).toBe(42)
    })

    it("match calls the ok handler", () => {
      const result = new Ok(42).match({
        ok: (v) => `Success: ${v}`,
        err: (e) => `Error: ${e}`,
      })
      expect(result).toBe("Success: 42")
    })

    it("isOk returns true", () => {
      expect(new Ok(42).isOk()).toBe(true)
    })

    it("isErr returns false", () => {
      expect(new Ok(42).isErr()).toBe(false)
    })
  })

  describe("Err class", () => {
    it("creates an Err with an error", () => {
      const result = new Err("something went wrong")
      expect(result.ok).toBe(false)
      expect(result.error).toBe("something went wrong")
    })

    it("map does not transform (returns same Err)", () => {
      const original = new Err<string>("error")
      const result = original.map((x: number) => x * 2)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe("error")
      }
    })

    it("flatMap does not transform (returns same Err)", () => {
      const original = new Err<string>("error")
      const result = original.flatMap((x: number) => new Ok(x * 2))
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe("error")
      }
    })

    it("unwrap throws the error", () => {
      const error = new Error("oops")
      const result = new Err(error)
      expect(() => result.unwrap()).toThrow("oops")
    })

    it("unwrapOr returns the default value", () => {
      const result = new Err("error")
      expect(result.unwrapOr(42)).toBe(42)
    })

    it("unwrapOrElse calls the function", () => {
      const result = new Err("error")
      expect(result.unwrapOrElse(() => 42)).toBe(42)
    })

    it("match calls the err handler", () => {
      const result = new Err("oops").match({
        ok: (v) => `Success: ${v}`,
        err: (e) => `Error: ${e}`,
      })
      expect(result).toBe("Error: oops")
    })

    it("isOk returns false", () => {
      expect(new Err("error").isOk()).toBe(false)
    })

    it("isErr returns true", () => {
      expect(new Err("error").isErr()).toBe(true)
    })
  })

  describe("factory functions", () => {
    it("ok() creates an Ok", () => {
      const result = ok(42)
      expect(result).toBeInstanceOf(Ok)
      expect(result.value).toBe(42)
    })

    it("err() creates an Err", () => {
      const result = err("error")
      expect(result).toBeInstanceOf(Err)
      expect(result.error).toBe("error")
    })
  })

  describe("type narrowing", () => {
    it("narrows type with ok property", () => {
      const result: Result<number, string> = ok(42)

      if (result.ok) {
        // TypeScript should know result.value exists
        expect(result.value).toBe(42)
      } else {
        // TypeScript should know result.error exists
        expect(result.error).toBeDefined()
      }
    })

    it("narrows type with isOk()", () => {
      const result: Result<number, string> = ok(42)

      if (result.isOk()) {
        expect(result.value).toBe(42)
      }
    })

    it("narrows type with isErr()", () => {
      const result: Result<number, string> = err("oops")

      if (result.isErr()) {
        expect(result.error).toBe("oops")
      }
    })
  })
})

describe("Money.parse()", () => {
  describe("successful parsing", () => {
    it("parses valid USD string", () => {
      const result = MoneyClass.parse("$100.00")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.toString()).toBe("$100.00")
      }
    })

    it("parses valid EUR string", () => {
      const result = MoneyClass.parse("€50.00")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.toString()).toBe("€50.00")
      }
    })

    it("parses currency code format", () => {
      const result = MoneyClass.parse("100 USD")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.toString()).toBe("$100.00")
      }
    })

    it("parses BTC format", () => {
      const result = MoneyClass.parse("1.5 BTC")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.currency.code).toBe("BTC")
      }
    })
  })

  describe("failed parsing", () => {
    it("returns Err for invalid input", () => {
      const result = MoneyClass.parse("not money")
      expect(result.ok).toBe(false)
    })

    it("error has helpful message", () => {
      const result = MoneyClass.parse("invalid")
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(ParseError)
        expect(result.error.message).toBeDefined()
      }
    })

    it("returns Err for empty string", () => {
      const result = MoneyClass.parse("")
      expect(result.ok).toBe(false)
    })
  })

  describe("chaining methods", () => {
    it("map transforms successful result", () => {
      const result = MoneyClass.parse("$100.00")
        .map((m) => m.multiply(2n))

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.toString()).toBe("$200.00")
      }
    })

    it("map is no-op on error", () => {
      const result = MoneyClass.parse("invalid")
        .map((m) => m.multiply(2n))

      expect(result.ok).toBe(false)
    })

    it("unwrapOr returns default on error", () => {
      const money = MoneyClass.parse("invalid")
        .unwrapOr(MoneyClass.zero("USD"))

      expect(money.toString()).toBe("$0.00")
    })

    it("match handles both cases", () => {
      const successMessage = MoneyClass.parse("$100.00").match({
        ok: (m) => `Got: ${m.toString()}`,
        err: (e) => `Error: ${e.message}`,
      })
      expect(successMessage).toBe("Got: $100.00")

      const errorMessage = MoneyClass.parse("invalid").match({
        ok: (m) => `Got: ${m.toString()}`,
        err: (e) => `Error: ${e.message}`,
      })
      expect(errorMessage).toContain("Error:")
    })
  })
})

describe("Money.tryFrom()", () => {
  describe("string input", () => {
    it("creates Money from valid string", () => {
      const result = MoneyClass.tryFrom("$100.00")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.toString()).toBe("$100.00")
      }
    })

    it("returns Err for invalid string", () => {
      const result = MoneyClass.tryFrom("not money")
      expect(result.ok).toBe(false)
    })
  })

  describe("number input", () => {
    it("creates Money from number with currency", () => {
      const result = MoneyClass.tryFrom(100, "USD")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.toString()).toBe("$100.00")
      }
    })

    it("returns Err when currency missing for number", () => {
      const result = MoneyClass.tryFrom(100)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain("Currency is required")
      }
    })
  })

  describe("bigint input", () => {
    it("creates Money from bigint with currency", () => {
      const result = MoneyClass.tryFrom(10050n, "USD")
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.toString()).toBe("$100.50")
      }
    })

    it("returns Err when currency missing for bigint", () => {
      const result = MoneyClass.tryFrom(10050n)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain("Currency is required")
      }
    })
  })

  describe("JSON input", () => {
    it("creates Money from JSON object", () => {
      const result = MoneyClass.tryFrom({
        asset: { code: "USD", decimals: 2n, name: "US Dollar" },
        amount: { amount: 10000n, decimals: 2n },
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        // Verify the amount is correct
        expect(result.value.balance.amount.amount).toBe(10000n)
        expect(result.value.currency.code).toBe("USD")
      }
    })
  })

  describe("error types", () => {
    it("returns CentError for known error types", () => {
      const result = MoneyClass.tryFrom(100)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(CentError)
      }
    })

    it("error has suggestion", () => {
      const result = MoneyClass.tryFrom(100)
      if (!result.ok) {
        expect(result.error.suggestion).toBeDefined()
      }
    })
  })

  describe("chaining methods", () => {
    it("flatMap chains operations", () => {
      const result = MoneyClass.tryFrom("$100.00")
        .flatMap((m) => MoneyClass.tryFrom(m.add("$50.00").toString()))

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.toString()).toBe("$150.00")
      }
    })

    it("unwrapOrElse computes default lazily", () => {
      let computed = false
      const money = MoneyClass.tryFrom("invalid")
        .unwrapOrElse(() => {
          computed = true
          return MoneyClass.zero("USD")
        })

      expect(computed).toBe(true)
      expect(money.toString()).toBe("$0.00")
    })

    it("unwrapOrElse does not compute for success", () => {
      let computed = false
      const money = MoneyClass.tryFrom("$100.00")
        .unwrapOrElse(() => {
          computed = true
          return MoneyClass.zero("USD")
        })

      expect(computed).toBe(false)
      expect(money.toString()).toBe("$100.00")
    })
  })
})

describe("practical use cases", () => {
  it("safely processes user input", () => {
    const processInput = (input: string) =>
      MoneyClass.parse(input).match({
        ok: (money) => ({ success: true, amount: money.toString() }),
        err: (error) => ({ success: false, error: error.message }),
      })

    expect(processInput("$100.00")).toEqual({
      success: true,
      amount: "$100.00",
    })

    const errorResult = processInput("bad input")
    expect(errorResult.success).toBe(false)
    expect((errorResult as { error: string }).error).toBeDefined()
  })

  it("provides default values for invalid input", () => {
    const inputs = ["$100.00", "invalid", "$50.00", "bad"]
    const amounts = inputs.map((input) =>
      MoneyClass.parse(input).unwrapOr(MoneyClass.zero("USD"))
    )

    expect(amounts[0].toString()).toBe("$100.00")
    expect(amounts[1].toString()).toBe("$0.00")
    expect(amounts[2].toString()).toBe("$50.00")
    expect(amounts[3].toString()).toBe("$0.00")
  })

  it("chains multiple operations safely", () => {
    const calculateTotal = (priceStr: string, quantityStr: string) =>
      MoneyClass.parse(priceStr)
        .flatMap((price) => {
          const qty = parseInt(quantityStr, 10)
          if (isNaN(qty) || qty <= 0) {
            return err(
              new InvalidInputError("Invalid quantity", {
                suggestion: "Provide a positive integer quantity",
              })
            )
          }
          return ok(price.multiply(BigInt(qty)))
        })

    const result1 = calculateTotal("$25.00", "4")
    expect(result1.ok).toBe(true)
    if (result1.ok) {
      expect(result1.value.toString()).toBe("$100.00")
    }

    const result2 = calculateTotal("invalid", "4")
    expect(result2.ok).toBe(false)

    const result3 = calculateTotal("$25.00", "bad")
    expect(result3.ok).toBe(false)
  })

  it("collects valid amounts from mixed input", () => {
    const inputs = ["$100.00", "bad", "€50.00", "invalid", "30 GBP"]
    const validAmounts = inputs
      .map((input) => MoneyClass.parse(input))
      .filter((result): result is Ok<ReturnType<typeof Money>> => result.ok)
      .map((result) => result.value)

    expect(validAmounts).toHaveLength(3)
    expect(validAmounts[0].toString()).toBe("$100.00")
    expect(validAmounts[1].toString()).toBe("€50.00")
    expect(validAmounts[2].toString()).toBe("£30.00")
  })
})
