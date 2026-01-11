import { describe, expect, it, beforeEach } from "@jest/globals"
import {
  configure,
  getConfig,
  getDefaultConfig,
  resetConfig,
  withConfig,
} from "../src/config"
import { HALF_EXPAND } from "../src/types"

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
})
