import { describe, expect, it, beforeEach, jest } from "@jest/globals"
import {
  configure,
  getConfig,
  getDefaultConfig,
  resetConfig,
  withConfig,
  runWithConfigFallback,
  __resetBrowserAsyncWarning,
} from "../src/config"
import { HALF_EXPAND } from "../src/types"
import {
  Money,
  MoneyClass,
  Round,
  DivisionError,
  PrecisionLossError,
} from "../src"

describe("Configuration System", () => {
  beforeEach(() => {
    resetConfig()
  })

  describe("getDefaultConfig", () => {
    it("returns default configuration values", () => {
      const defaults = getDefaultConfig()

      expect(defaults.numberInputMode).toBe("warn")
      expect(defaults.precisionWarningThreshold).toBe(15)
      expect(defaults.defaultRoundingMode).toBe("none")
      expect(defaults.defaultCurrency).toBe("USD")
      expect(defaults.defaultLocale).toBe("en-US")
      expect(defaults.strictPrecision).toBe(false)
    })

    it("returns a copy, not the original", () => {
      const defaults1 = getDefaultConfig()
      const defaults2 = getDefaultConfig()

      expect(defaults1).not.toBe(defaults2)
      expect(defaults1).toEqual(defaults2)
    })
  })

  describe("getConfig", () => {
    it("returns current configuration", () => {
      const config = getConfig()

      expect(config.numberInputMode).toBe("warn")
      expect(config.defaultCurrency).toBe("USD")
    })

    it("returns a copy, not the original", () => {
      const config1 = getConfig()
      const config2 = getConfig()

      expect(config1).not.toBe(config2)
      expect(config1).toEqual(config2)
    })
  })

  describe("configure", () => {
    it("updates specific configuration options", () => {
      configure({ numberInputMode: "error" })

      const config = getConfig()
      expect(config.numberInputMode).toBe("error")
      // Other options remain at default
      expect(config.defaultCurrency).toBe("USD")
    })

    it("supports partial configuration", () => {
      configure({ strictPrecision: true })
      configure({ defaultCurrency: "EUR" })

      const config = getConfig()
      expect(config.strictPrecision).toBe(true)
      expect(config.defaultCurrency).toBe("EUR")
    })

    it("overwrites previous values", () => {
      configure({ numberInputMode: "error" })
      configure({ numberInputMode: "silent" })

      expect(getConfig().numberInputMode).toBe("silent")
    })

    it("accepts rounding mode", () => {
      configure({ defaultRoundingMode: HALF_EXPAND })

      expect(getConfig().defaultRoundingMode).toBe(HALF_EXPAND)
    })

    it("accepts 'none' for rounding mode", () => {
      configure({ defaultRoundingMode: "none" })

      expect(getConfig().defaultRoundingMode).toBe("none")
    })
  })

  describe("resetConfig", () => {
    it("restores default values", () => {
      configure({
        numberInputMode: "error",
        strictPrecision: true,
        defaultCurrency: "EUR",
      })

      resetConfig()

      const config = getConfig()
      expect(config.numberInputMode).toBe("warn")
      expect(config.strictPrecision).toBe(false)
      expect(config.defaultCurrency).toBe("USD")
    })
  })

  describe("withConfig", () => {
    it("applies temporary configuration", () => {
      const result = withConfig({ strictPrecision: true }, () => {
        return getConfig().strictPrecision
      })

      expect(result).toBe(true)
    })

    it("restores previous configuration after execution", () => {
      configure({ strictPrecision: false })

      withConfig({ strictPrecision: true }, () => {
        expect(getConfig().strictPrecision).toBe(true)
      })

      expect(getConfig().strictPrecision).toBe(false)
    })

    it("restores configuration even if function throws", () => {
      configure({ strictPrecision: false })

      expect(() => {
        withConfig({ strictPrecision: true }, () => {
          throw new Error("Test error")
        })
      }).toThrow("Test error")

      expect(getConfig().strictPrecision).toBe(false)
    })

    it("returns the function's return value", () => {
      const result = withConfig({ defaultCurrency: "EUR" }, () => {
        return `Currency: ${getConfig().defaultCurrency}`
      })

      expect(result).toBe("Currency: EUR")
    })

    it("can be nested", () => {
      configure({ defaultCurrency: "USD" })

      withConfig({ defaultCurrency: "EUR" }, () => {
        expect(getConfig().defaultCurrency).toBe("EUR")

        withConfig({ defaultCurrency: "GBP" }, () => {
          expect(getConfig().defaultCurrency).toBe("GBP")
        })

        expect(getConfig().defaultCurrency).toBe("EUR")
      })

      expect(getConfig().defaultCurrency).toBe("USD")
    })

    it("only overrides specified options", () => {
      configure({
        numberInputMode: "error",
        defaultCurrency: "EUR",
      })

      withConfig({ strictPrecision: true }, () => {
        const config = getConfig()
        expect(config.strictPrecision).toBe(true)
        expect(config.numberInputMode).toBe("error")
        expect(config.defaultCurrency).toBe("EUR")
      })
    })
  })

  describe("defaultRoundingMode integration", () => {
    it("divide works without explicit mode when defaultRoundingMode is set", () => {
      configure({ defaultRoundingMode: "halfExpand" })
      const result = Money("$100").divide(3)
      expect(result.toString()).toBe("$33.33")
    })

    it("divide still throws when defaultRoundingMode is none", () => {
      configure({ defaultRoundingMode: "none" })
      expect(() => Money("$100").divide(3)).toThrow(DivisionError)
    })
  })

  describe("defaultCurrency integration", () => {
    it("Money(number) uses defaultCurrency when no currency specified", () => {
      configure({ defaultCurrency: "EUR" })
      const result = Money(100, undefined as unknown as string)
      expect(result.currency.code).toBe("EUR")
    })

    it("Money.zero() with no args uses defaultCurrency", () => {
      configure({ defaultCurrency: "EUR" })
      const result = MoneyClass.zero()
      expect(result.currency.code).toBe("EUR")
      expect(result.toString()).toBe("€0.00")
    })
  })

  describe("defaultLocale integration", () => {
    it("toString uses configured defaultLocale", () => {
      configure({ defaultLocale: "de-DE" })
      const money = Money("€1234.56")
      const str = money.toString()
      // German locale uses period as thousands separator and comma as decimal
      expect(str).toContain("1.234,56")
    })
  })

  describe("strictPrecision integration", () => {
    it("throws on number input even with numberInputMode: silent", () => {
      configure({ strictPrecision: true, numberInputMode: "silent" })
      expect(() => Money(0.1, "USD")).toThrow(PrecisionLossError)
    })

    it("divide throws even when defaultRoundingMode is set", () => {
      configure({ strictPrecision: true, defaultRoundingMode: "halfExpand" })
      expect(() => Money("$100").divide(3)).toThrow(DivisionError)
    })

    it("divide with explicit rounding mode still works", () => {
      configure({ strictPrecision: true, defaultRoundingMode: "halfExpand" })
      const result = Money("$100").divide(3, Round.HALF_UP)
      expect(result.toString()).toBe("$33.33")
    })
  })

  describe("environment-based configuration pattern", () => {
    it("supports production-style configuration", () => {
      // Simulate production environment
      const isProd = true

      configure({
        numberInputMode: isProd ? "error" : "warn",
        strictPrecision: isProd,
      })

      const config = getConfig()
      expect(config.numberInputMode).toBe("error")
      expect(config.strictPrecision).toBe(true)
    })

    it("supports development-style configuration", () => {
      // Simulate development environment
      const isProd = false

      configure({
        numberInputMode: isProd ? "error" : "warn",
        strictPrecision: isProd,
      })

      const config = getConfig()
      expect(config.numberInputMode).toBe("warn")
      expect(config.strictPrecision).toBe(false)
    })
  })

  describe("withConfig async safety", () => {
    it("two concurrent async scopes don't interfere", async () => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms))

      const results = await Promise.all([
        withConfig({ defaultCurrency: "EUR" }, async () => {
          await delay(10)
          return getConfig().defaultCurrency
        }),
        withConfig({ defaultCurrency: "GBP" }, async () => {
          await delay(5)
          return getConfig().defaultCurrency
        }),
      ])

      expect(results[0]).toBe("EUR")
      expect(results[1]).toBe("GBP")
    })

    it("nested withConfig calls compose correctly", () => {
      const result = withConfig({ defaultCurrency: "EUR" }, () => {
        const outer = getConfig().defaultCurrency
        const inner = withConfig({ defaultLocale: "fr-FR" }, () => {
          const config = getConfig()
          return { currency: config.defaultCurrency, locale: config.defaultLocale }
        })
        return { outer, inner, afterInner: getConfig().defaultLocale }
      })

      expect(result.outer).toBe("EUR")
      expect(result.inner.currency).toBe("EUR")
      expect(result.inner.locale).toBe("fr-FR")
      // After inner withConfig, locale should be restored
      expect(result.afterInner).toBe("en-US")
    })

    it("withConfig with async callback preserves config through await", async () => {
      const result = await withConfig(
        { defaultCurrency: "JPY" },
        async () => {
          const before = getConfig().defaultCurrency
          await new Promise((resolve) => setTimeout(resolve, 10))
          const after = getConfig().defaultCurrency
          return { before, after }
        }
      )

      expect(result.before).toBe("JPY")
      expect(result.after).toBe("JPY")
    })
  })

  describe("browser fallback async warning", () => {
    beforeEach(() => {
      __resetBrowserAsyncWarning()
    })

    it("warns once when an async function is passed in the browser fallback path", async () => {
      const warnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {})
      try {
        const merged = { ...getDefaultConfig() }
        const promise = runWithConfigFallback(merged, async () => {
          return "ok"
        })
        // Returned value is a Promise — caller still awaits as normal
        expect(promise).toBeInstanceOf(Promise)
        await promise

        expect(warnSpy).toHaveBeenCalledTimes(1)
        const message = warnSpy.mock.calls[0][0] as string
        expect(message).toContain("[cent]")
        expect(message).toContain("withConfig")
        expect(message).toContain("AsyncLocalStorage")

        // Second call must NOT warn again
        await runWithConfigFallback(merged, async () => "ok2")
        expect(warnSpy).toHaveBeenCalledTimes(1)
      } finally {
        warnSpy.mockRestore()
      }
    })

    it("does not warn for synchronous callbacks", () => {
      const warnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {})
      try {
        const merged = { ...getDefaultConfig() }
        const result = runWithConfigFallback(merged, () => 42)
        expect(result).toBe(42)
        expect(warnSpy).not.toHaveBeenCalled()
      } finally {
        warnSpy.mockRestore()
      }
    })

    it("still returns the Promise to the caller (behavior unchanged)", async () => {
      const warnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {})
      try {
        const merged = { ...getDefaultConfig(), defaultCurrency: "EUR" }
        const result = await runWithConfigFallback(merged, async () => {
          return "value"
        })
        expect(result).toBe("value")
      } finally {
        warnSpy.mockRestore()
      }
    })
  })
})
