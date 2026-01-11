import { describe, expect, it } from "@jest/globals"
import { Money, Round, USD, BTC } from "../src"

describe("Round constants", () => {
  it("exports all rounding modes", () => {
    expect(Round.UP).toBe("expand")
    expect(Round.DOWN).toBe("trunc")
    expect(Round.CEILING).toBe("ceil")
    expect(Round.FLOOR).toBe("floor")
    expect(Round.HALF_UP).toBe("halfExpand")
    expect(Round.HALF_DOWN).toBe("halfTrunc")
    expect(Round.HALF_EVEN).toBe("halfEven")
  })
})

describe("Money.divide()", () => {
  describe("exact division (factors of 2 and 5 only)", () => {
    it("divides by 2 without rounding mode", () => {
      const money = Money("$100.00")
      const result = money.divide(2)
      expect(result.toString()).toBe("$50.00")
    })

    it("divides by 5 without rounding mode", () => {
      const money = Money("$100.00")
      const result = money.divide(5)
      expect(result.toString()).toBe("$20.00")
    })

    it("divides by 10 without rounding mode", () => {
      const money = Money("$100.00")
      const result = money.divide(10)
      expect(result.toString()).toBe("$10.00")
    })

    it("divides by 4 (2*2) without rounding mode", () => {
      const money = Money("$100.00")
      const result = money.divide(4)
      expect(result.toString()).toBe("$25.00")
    })

    it("divides by 25 (5*5) without rounding mode", () => {
      const money = Money("$100.00")
      const result = money.divide(25)
      expect(result.toString()).toBe("$4.00")
    })

    it("divides by decimal string with only 2/5 factors", () => {
      const money = Money("$100.00")
      const result = money.divide("0.5")
      expect(result.toString()).toBe("$200.00")
    })
  })

  describe("division requiring rounding", () => {
    it("throws without rounding mode for divisor 3", () => {
      const money = Money("$100.00")
      expect(() => money.divide(3)).toThrow(/requires a rounding mode/)
    })

    it("throws without rounding mode for divisor 7", () => {
      const money = Money("$100.00")
      expect(() => money.divide(7)).toThrow(/requires a rounding mode/)
    })

    it("divides by 3 with HALF_UP rounding", () => {
      const money = Money("$100.00")
      const result = money.divide(3, Round.HALF_UP)
      expect(result.toString()).toBe("$33.33")
    })

    it("divides by 3 with CEILING rounding", () => {
      const money = Money("$100.00")
      const result = money.divide(3, Round.CEILING)
      expect(result.toString()).toBe("$33.34")
    })

    it("divides by 3 with FLOOR rounding", () => {
      const money = Money("$100.00")
      const result = money.divide(3, Round.FLOOR)
      expect(result.toString()).toBe("$33.33")
    })

    it("divides by 7 with HALF_UP rounding", () => {
      const money = Money("$100.00")
      const result = money.divide(7, Round.HALF_UP)
      expect(result.toString()).toBe("$14.29")
    })

    it("divides by 6 with HALF_EVEN (banker's rounding)", () => {
      const money = Money("$100.00")
      const result = money.divide(6, Round.HALF_EVEN)
      // 100/6 = 16.666... → rounds to 16.67
      expect(result.toString()).toBe("$16.67")
    })
  })

  describe("negative divisors", () => {
    it("handles negative bigint divisor", () => {
      const money = Money("$100.00")
      const result = money.divide(-2n)
      expect(result.toString()).toBe("-$50.00")
    })

    it("handles negative number divisor with rounding", () => {
      const money = Money("$100.00")
      const result = money.divide(-3, Round.HALF_UP)
      expect(result.toString()).toBe("-$33.33")
    })
  })

  describe("edge cases", () => {
    it("throws on division by zero (number)", () => {
      const money = Money("$100.00")
      expect(() => money.divide(0)).toThrow(/Cannot divide by zero/)
    })

    it("throws on division by zero (bigint)", () => {
      const money = Money("$100.00")
      expect(() => money.divide(0n)).toThrow(/Cannot divide by zero/)
    })

    it("throws on division by zero (string)", () => {
      const money = Money("$100.00")
      expect(() => money.divide("0")).toThrow(/Cannot divide by zero/)
    })

    it("throws on division by Infinity", () => {
      const money = Money("$100.00")
      expect(() => money.divide(Infinity)).toThrow(/Cannot divide by Infinity/)
    })

    it("throws on division by NaN", () => {
      const money = Money("$100.00")
      expect(() => money.divide(NaN)).toThrow(/Cannot divide by Infinity or NaN/)
    })

    it("preserves currency precision for BTC", () => {
      const money = Money("1 BTC")
      const result = money.divide(3, Round.HALF_UP)
      // BTC has 8 decimals, toString uses code format for BTC
      expect(result.toString()).toBe("0.33333333 BTC")
    })
  })
})

describe("Money.round()", () => {
  it("rounds to currency precision with default HALF_UP", () => {
    const money = Money({
      asset: USD,
      amount: { amount: 100125n, decimals: 3n },
    })
    const result = money.round()
    expect(result.toString()).toBe("$100.13")
  })

  it("rounds with HALF_EVEN (banker's rounding)", () => {
    const money = Money({
      asset: USD,
      amount: { amount: 100125n, decimals: 3n },
    })
    const result = money.round(Round.HALF_EVEN)
    expect(result.toString()).toBe("$100.12")
  })

  it("rounds with FLOOR", () => {
    const money = Money({
      asset: USD,
      amount: { amount: 100129n, decimals: 3n },
    })
    const result = money.round(Round.FLOOR)
    expect(result.toString()).toBe("$100.12")
  })

  it("rounds with CEILING", () => {
    const money = Money({
      asset: USD,
      amount: { amount: 100121n, decimals: 3n },
    })
    const result = money.round(Round.CEILING)
    expect(result.toString()).toBe("$100.13")
  })

  it("handles negative amounts", () => {
    const money = Money({
      asset: USD,
      amount: { amount: -100125n, decimals: 3n },
    })
    const result = money.round(Round.HALF_UP)
    expect(result.toString()).toBe("-$100.13")
  })

  it("returns same value if already at precision", () => {
    const money = Money("$100.12")
    const result = money.round()
    expect(result.toString()).toBe("$100.12")
  })
})

describe("Money.roundTo()", () => {
  it("rounds to specified decimal places", () => {
    const money = Money({
      asset: USD,
      amount: { amount: 10012345n, decimals: 5n },
    })
    // Check internal representation, not string (toString uses currency decimals)
    expect(money.roundTo(2).balance.amount.amount).toBe(10012n)
    expect(money.roundTo(2).balance.amount.decimals).toBe(2n)
    expect(money.roundTo(3).balance.amount.amount).toBe(100123n)
    expect(money.roundTo(3).balance.amount.decimals).toBe(3n)
    expect(money.roundTo(4).balance.amount.amount).toBe(1001235n)
    expect(money.roundTo(4).balance.amount.decimals).toBe(4n)
  })

  it("rounds to 0 decimal places", () => {
    const money = Money({
      asset: USD,
      amount: { amount: 10050n, decimals: 2n },
    })
    const result = money.roundTo(0, Round.HALF_UP)
    expect(result.balance.amount.amount).toBe(101n)
    expect(result.balance.amount.decimals).toBe(0n)
  })

  it("throws for negative decimals", () => {
    const money = Money("$100.00")
    expect(() => money.roundTo(-1)).toThrow(/non-negative/)
  })

  it("pads with zeros when increasing precision", () => {
    const money = Money("$100.12")
    const result = money.roundTo(4)
    expect(result.balance.amount.decimals).toBe(4n)
    expect(result.balance.amount.amount).toBe(1001200n)
  })
})

describe("Money.multiply() with rounding", () => {
  it("multiplies without rounding", () => {
    const money = Money("$100.00")
    const result = money.multiply("1.5")
    expect(result.toString()).toBe("$150.00")
  })

  it("multiplies with rounding to currency precision", () => {
    const money = Money("$100.00")
    const result = money.multiply("0.333", Round.HALF_UP)
    expect(result.toString()).toBe("$33.30")
  })

  it("multiplies by bigint", () => {
    const money = Money("$100.00")
    const result = money.multiply(3n)
    expect(result.toString()).toBe("$300.00")
  })
})

describe("Rounding mode behaviors", () => {
  // Test all rounding modes with a value that ends in .5 (tie case)
  const createMoney = (amount: bigint) =>
    Money({ asset: USD, amount: { amount, decimals: 3n } })

  describe("positive ties (.5)", () => {
    it("HALF_UP rounds ties away from zero", () => {
      // 2.505 -> 2.51 (ties away from zero)
      expect(createMoney(2505n).roundTo(2, Round.HALF_UP).balance.amount.amount).toBe(251n)
    })

    it("HALF_DOWN rounds ties toward zero", () => {
      // 2.505 -> 2.50 (ties toward zero)
      expect(createMoney(2505n).roundTo(2, Round.HALF_DOWN).balance.amount.amount).toBe(250n)
    })

    it("HALF_EVEN rounds ties to even", () => {
      // 2.505 -> 2.50 (5 is odd, round down to even)
      expect(createMoney(2505n).roundTo(2, Round.HALF_EVEN).balance.amount.amount).toBe(250n)
      // 2.515 -> 2.52 (1 is odd, round up to even)
      expect(createMoney(2515n).roundTo(2, Round.HALF_EVEN).balance.amount.amount).toBe(252n)
    })
  })

  describe("negative ties (-.5)", () => {
    it("HALF_UP rounds ties away from zero", () => {
      // -2.505 -> -2.51 (ties away from zero)
      expect(createMoney(-2505n).roundTo(2, Round.HALF_UP).balance.amount.amount).toBe(-251n)
    })
  })

  describe("non-tie cases", () => {
    it("UP rounds away from zero", () => {
      // 2.101 -> 2.11 (away from zero)
      expect(createMoney(2101n).roundTo(2, Round.UP).balance.amount.amount).toBe(211n)
      // -2.101 -> -2.11 (away from zero)
      expect(createMoney(-2101n).roundTo(2, Round.UP).balance.amount.amount).toBe(-211n)
    })

    it("DOWN rounds toward zero", () => {
      // 2.109 -> 2.10 (toward zero)
      expect(createMoney(2109n).roundTo(2, Round.DOWN).balance.amount.amount).toBe(210n)
      // -2.109 -> -2.10 (toward zero)
      expect(createMoney(-2109n).roundTo(2, Round.DOWN).balance.amount.amount).toBe(-210n)
    })

    it("CEILING rounds toward positive infinity", () => {
      // 2.101 -> 2.11 (toward +infinity)
      expect(createMoney(2101n).roundTo(2, Round.CEILING).balance.amount.amount).toBe(211n)
      // -2.109 -> -2.10 (toward +infinity)
      expect(createMoney(-2109n).roundTo(2, Round.CEILING).balance.amount.amount).toBe(-210n)
    })

    it("FLOOR rounds toward negative infinity", () => {
      // 2.109 -> 2.10 (toward -infinity)
      expect(createMoney(2109n).roundTo(2, Round.FLOOR).balance.amount.amount).toBe(210n)
      // -2.101 -> -2.11 (toward -infinity)
      expect(createMoney(-2101n).roundTo(2, Round.FLOOR).balance.amount.amount).toBe(-211n)
    })
  })
})
