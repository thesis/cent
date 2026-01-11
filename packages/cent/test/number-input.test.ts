import { describe, expect, it, beforeEach, jest } from "@jest/globals"
import { Money, MoneyClass, USD, EUR, BTC, ETH, SOL } from "../src"
import { configure, resetConfig, withConfig } from "../src/config"

describe("Number Input", () => {
  beforeEach(() => {
    resetConfig()
  })

  describe("Money(number, currency)", () => {
    it("creates Money from number and currency string", () => {
      const money = Money(100.50, "USD")
      expect(money.toString()).toBe("$100.50")
    })

    it("creates Money from number and Currency object", () => {
      const money = Money(100.50, USD)
      expect(money.toString()).toBe("$100.50")
    })

    it("handles integer amounts", () => {
      const money = Money(100, "USD")
      expect(money.toString()).toBe("$100.00")
    })

    it("handles zero", () => {
      const money = Money(0, "USD")
      expect(money.toString()).toBe("$0.00")
    })

    it("handles negative numbers", () => {
      const money = Money(-50.25, "USD")
      expect(money.toString()).toBe("-$50.25")
    })

    it("throws without currency", () => {
      // @ts-expect-error - testing runtime behavior
      expect(() => Money(100)).toThrow(/Currency is required/)
    })

    it("throws for NaN", () => {
      expect(() => Money(NaN, "USD")).toThrow(/Invalid number input/)
    })

    it("throws for Infinity", () => {
      expect(() => Money(Infinity, "USD")).toThrow(/Invalid number input/)
    })

    it("throws for -Infinity", () => {
      expect(() => Money(-Infinity, "USD")).toThrow(/Invalid number input/)
    })
  })

  describe("Money(bigint, currency)", () => {
    it("creates Money from bigint minor units (USD cents)", () => {
      const money = Money(10050n, "USD")
      expect(money.toString()).toBe("$100.50")
    })

    it("creates Money from bigint minor units (BTC satoshis)", () => {
      const money = Money(100000000n, "BTC")
      expect(money.toString()).toBe("1 BTC")
    })

    it("handles zero", () => {
      const money = Money(0n, "USD")
      expect(money.toString()).toBe("$0.00")
    })

    it("handles negative amounts", () => {
      const money = Money(-5025n, "USD")
      expect(money.toString()).toBe("-$50.25")
    })

    it("throws without currency", () => {
      // @ts-expect-error - testing runtime behavior
      expect(() => Money(10050n)).toThrow(/Currency is required/)
    })

    it("handles large amounts precisely", () => {
      const money = Money(123456789012345678901234567890n, "ETH")
      // ETH has 18 decimals, so this is ~123456789012.345... ETH
      expect(money.balance.amount.amount).toBe(123456789012345678901234567890n)
    })
  })

  describe("numberInputMode configuration", () => {
    describe("'silent' mode", () => {
      beforeEach(() => {
        configure({ numberInputMode: "silent" })
      })

      it("allows all numbers without warning", () => {
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation()

        // Non-safe integer
        const money = Money(9007199254740993, "USD")
        expect(money).toBeDefined()
        expect(consoleSpy).not.toHaveBeenCalled()

        consoleSpy.mockRestore()
      })
    })

    describe("'warn' mode (default)", () => {
      beforeEach(() => {
        configure({ numberInputMode: "warn" })
      })

      it("allows safe integers without warning", () => {
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation()

        const money = Money(100, "USD")
        expect(money.toString()).toBe("$100.00")
        expect(consoleSpy).not.toHaveBeenCalled()

        consoleSpy.mockRestore()
      })

      it("warns for non-safe integers", () => {
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation()

        // This number is beyond safe integer range
        Money(9007199254740993, "USD")
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("may lose precision")
        )

        consoleSpy.mockRestore()
      })
    })

    describe("'error' mode", () => {
      beforeEach(() => {
        configure({ numberInputMode: "error" })
      })

      it("allows safe integers", () => {
        const money = Money(100, "USD")
        expect(money.toString()).toBe("$100.00")
      })

      it("throws for non-safe integers", () => {
        expect(() => Money(9007199254740993, "USD")).toThrow(/may lose precision/)
      })
    })

    describe("'never' mode", () => {
      beforeEach(() => {
        configure({ numberInputMode: "never" })
      })

      it("throws for any number input", () => {
        expect(() => Money(100, "USD")).toThrow(/Number inputs are not allowed/)
      })

      it("throws even for safe integers", () => {
        expect(() => Money(0, "USD")).toThrow(/Number inputs are not allowed/)
      })

      it("suggests using strings instead", () => {
        try {
          Money(100.50, "USD")
          expect.fail("Should have thrown")
        } catch (e: unknown) {
          expect((e as { suggestion?: string }).suggestion).toMatch(/Money\("100\.5 USD"\)/)
        }
      })

      it("still allows string inputs", () => {
        const money = Money("$100.50")
        expect(money.toString()).toBe("$100.50")
      })

      it("still allows bigint inputs", () => {
        const money = Money(10050n, "USD")
        expect(money.toString()).toBe("$100.50")
      })
    })

    describe("withConfig for testing", () => {
      it("temporarily overrides numberInputMode", () => {
        configure({ numberInputMode: "silent" })

        withConfig({ numberInputMode: "never" }, () => {
          expect(() => Money(100, "USD")).toThrow(/Number inputs are not allowed/)
        })

        // Back to silent mode
        const money = Money(100, "USD")
        expect(money.toString()).toBe("$100.00")
      })
    })
  })

  describe("Money.fromSubUnits()", () => {
    describe("Bitcoin sub-units", () => {
      it("creates from satoshis", () => {
        const money = MoneyClass.fromSubUnits(100000000n, "sat")
        expect(money.toString()).toBe("1 BTC")
      })

      it("accepts 'satoshi' alias", () => {
        const money = MoneyClass.fromSubUnits(100000000n, "satoshi")
        expect(money.toString()).toBe("1 BTC")
      })

      it("accepts 'sats' alias", () => {
        const money = MoneyClass.fromSubUnits(50000000n, "sats")
        expect(money.toString()).toBe("0.5 BTC")
      })

      it("creates from millisatoshis", () => {
        const money = MoneyClass.fromSubUnits(100000000000n, "msat")
        expect(money.balance.amount.amount).toBe(100000000000n)
        expect(money.balance.amount.decimals).toBe(11n)
      })

      it("accepts 'msats' alias", () => {
        const money = MoneyClass.fromSubUnits(1000n, "msats")
        expect(money.balance.amount.decimals).toBe(11n)
      })
    })

    describe("Ethereum sub-units", () => {
      it("creates from wei", () => {
        const money = MoneyClass.fromSubUnits(1000000000000000000n, "wei")
        expect(money.toString()).toContain("1")
        expect(money.currency.code).toBe("ETH")
      })

      it("creates from gwei", () => {
        const money = MoneyClass.fromSubUnits(1000000000n, "gwei")
        expect(money.balance.amount.decimals).toBe(9n)
        expect(money.currency.code).toBe("ETH")
      })

      it("accepts 'shannon' alias for gwei", () => {
        const money = MoneyClass.fromSubUnits(1000000000n, "shannon")
        expect(money.balance.amount.decimals).toBe(9n)
      })
    })

    describe("Solana sub-units", () => {
      it("creates from lamports", () => {
        const money = MoneyClass.fromSubUnits(1000000000n, "lamport")
        expect(money.currency.code).toBe("SOL")
        expect(money.balance.amount.decimals).toBe(9n)
      })

      it("accepts 'lamports' alias", () => {
        const money = MoneyClass.fromSubUnits(1000000000n, "lamports")
        expect(money.currency.code).toBe("SOL")
      })
    })

    describe("Fiat sub-units", () => {
      it("creates from cents", () => {
        const money = MoneyClass.fromSubUnits(10050n, "cents")
        expect(money.toString()).toBe("$100.50")
      })

      it("creates from pence", () => {
        const money = MoneyClass.fromSubUnits(5025n, "pence")
        expect(money.currency.code).toBe("GBP")
      })
    })

    describe("error handling", () => {
      it("throws for unknown sub-unit", () => {
        expect(() => MoneyClass.fromSubUnits(100n, "unknown")).toThrow(/Unknown sub-unit/)
      })

      it("suggests known sub-units in error", () => {
        try {
          MoneyClass.fromSubUnits(100n, "foo")
          expect.fail("Should have thrown")
        } catch (e: unknown) {
          expect((e as { suggestion?: string }).suggestion).toMatch(/sat/)
        }
      })

      it("is case insensitive", () => {
        const money1 = MoneyClass.fromSubUnits(100n, "SAT")
        const money2 = MoneyClass.fromSubUnits(100n, "Sat")
        const money3 = MoneyClass.fromSubUnits(100n, "sat")

        expect(money1.balance.amount.amount).toBe(money2.balance.amount.amount)
        expect(money2.balance.amount.amount).toBe(money3.balance.amount.amount)
      })
    })
  })
})
