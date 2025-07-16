import {
  Money,
  MoneyJSONSchema,
  formatMoney,
  shouldUseIsoFormatting,
  formatWithIntlCurrency,
  formatWithCustomFormatting,
  convertToPreferredUnit,
  findFractionalUnitInfo,
  getCurrencyDisplayPart,
  normalizeLocale,
  pluralizeFractionalUnit,
} from "../src/money"
import {
  Currency,
  AssetAmount,
  RoundingMode,
  HALF_EXPAND,
  HALF_EVEN,
  CEIL,
  FLOOR,
} from "../src/types"

describe("Money", () => {
  const usdCurrency: Currency = {
    name: "US Dollar",
    code: "USD",
    decimals: 2n,
    symbol: "$",
  }

  const eurCurrency: Currency = {
    name: "Euro",
    code: "EUR",
    decimals: 2n,
    symbol: "€",
  }

  const usdAmount: AssetAmount = {
    asset: usdCurrency,
    amount: { amount: 10050n, decimals: 2n }, // $100.50
  }

  const eurAmount: AssetAmount = {
    asset: eurCurrency,
    amount: { amount: 5025n, decimals: 2n }, // €50.25
  }

  describe("constructor", () => {
    it("should create a Money instance with the provided balance", () => {
      const money = new Money(usdAmount)
      expect(money.balance).toEqual(usdAmount)
    })

    // it('should have a readonly balance property', () => {
    //   const money = new Money(usdAmount)
    //   expect(() => {
    //     // @ts-expect-error - testing that balance is readonly
    //     money.balance = eurAmount
    //   }).toThrow()
    // })
  })

  describe("add", () => {
    it("should add two Money instances with the same asset", () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 2575n, decimals: 2n }, // $25.75
      })

      const result = money1.add(money2)

      expect(result.balance.asset).toEqual(usdCurrency)
      expect(result.balance.amount.amount).toBe(12625n) // $126.25
      expect(result.balance.amount.decimals).toBe(2n)
    })

    it("should add Money instance and AssetAmount with the same asset", () => {
      const money = new Money(usdAmount)
      const assetAmount: AssetAmount = {
        asset: usdCurrency,
        amount: { amount: 1500n, decimals: 2n }, // $15.00
      }

      const result = money.add(assetAmount)

      expect(result.balance.asset).toEqual(usdCurrency)
      expect(result.balance.amount.amount).toBe(11550n) // $115.50
      expect(result.balance.amount.decimals).toBe(2n)
    })

    it("should return a new Money instance (immutability)", () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 1000n, decimals: 2n },
      })

      const result = money1.add(money2)

      expect(result).not.toBe(money1)
      expect(result).not.toBe(money2)
      expect(money1.balance.amount.amount).toBe(10050n) // Original unchanged
    })

    it("should handle different decimal precision", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 100n, decimals: 1n }, // $10.0
      })
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 2525n, decimals: 3n }, // $2.525
      })

      const result = money1.add(money2)

      expect(result.balance.amount.amount).toBe(12525n) // $12.525
      expect(result.balance.amount.decimals).toBe(3n)
    })

    it("should throw error when adding Money with different assets", () => {
      const usdMoney = new Money(usdAmount)
      const eurMoney = new Money(eurAmount)

      expect(() => usdMoney.add(eurMoney)).toThrow(
        "Cannot add Money with different asset types",
      )
    })

    it("should throw error when adding AssetAmount with different asset", () => {
      const usdMoney = new Money(usdAmount)

      expect(() => usdMoney.add(eurAmount)).toThrow(
        "Cannot add Money with different asset types",
      )
    })
  })

  describe("subtract", () => {
    it("should subtract two Money instances with the same asset", () => {
      const money1 = new Money(usdAmount) // $100.50
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 2575n, decimals: 2n }, // $25.75
      })

      const result = money1.subtract(money2)

      expect(result.balance.asset).toEqual(usdCurrency)
      expect(result.balance.amount.amount).toBe(7475n) // $74.75
      expect(result.balance.amount.decimals).toBe(2n)
    })

    it("should subtract Money instance and AssetAmount with the same asset", () => {
      const money = new Money(usdAmount) // $100.50
      const assetAmount: AssetAmount = {
        asset: usdCurrency,
        amount: { amount: 1500n, decimals: 2n }, // $15.00
      }

      const result = money.subtract(assetAmount)

      expect(result.balance.asset).toEqual(usdCurrency)
      expect(result.balance.amount.amount).toBe(8550n) // $85.50
      expect(result.balance.amount.decimals).toBe(2n)
    })

    it("should return a new Money instance (immutability)", () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 1000n, decimals: 2n },
      })

      const result = money1.subtract(money2)

      expect(result).not.toBe(money1)
      expect(result).not.toBe(money2)
      expect(money1.balance.amount.amount).toBe(10050n) // Original unchanged
    })

    it("should handle different decimal precision", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 1000n, decimals: 2n }, // $10.00
      })
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 2525n, decimals: 3n }, // $2.525
      })

      const result = money1.subtract(money2)

      expect(result.balance.amount.amount).toBe(7475n) // $7.475
      expect(result.balance.amount.decimals).toBe(3n)
    })

    it("should throw error when subtracting Money with different assets", () => {
      const usdMoney = new Money(usdAmount)
      const eurMoney = new Money(eurAmount)

      expect(() => usdMoney.subtract(eurMoney)).toThrow(
        "Cannot subtract Money with different asset types",
      )
    })

    it("should throw error when subtracting AssetAmount with different asset", () => {
      const usdMoney = new Money(usdAmount)

      expect(() => usdMoney.subtract(eurAmount)).toThrow(
        "Cannot subtract Money with different asset types",
      )
    })
  })

  describe("concretize", () => {
    it("should split money with higher precision than asset decimals", () => {
      // Create money with 3 decimals but USD only has 2 decimals
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 12525n, decimals: 3n }, // $12.525
      })

      const [concrete, change] = money.concretize()

      // Concrete should be rounded down to asset precision
      expect(concrete.balance.amount.amount).toBe(1252n) // $12.52
      expect(concrete.balance.amount.decimals).toBe(2n)

      // Change should be the remainder
      expect(change.balance.amount.amount).toBe(5n) // $0.005
      expect(change.balance.amount.decimals).toBe(3n)

      // Adding them back should equal the original
      const reconstructed = concrete.add(change)
      expect(reconstructed.balance.amount.amount).toBe(12525n)
      expect(reconstructed.balance.amount.decimals).toBe(3n)
    })

    it("should return original and zero change when already at correct precision", () => {
      const money = new Money(usdAmount) // Already at 2 decimals for USD

      const [concrete, change] = money.concretize()

      expect(concrete).toBe(money) // Should be the same instance
      expect(change.balance.amount.amount).toBe(0n)
      expect(change.balance.amount.decimals).toBe(2n)
    })

    it("should handle scaling up precision", () => {
      // Create money with 1 decimal but USD has 2 decimals
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 125n, decimals: 1n }, // $12.5
      })

      const [concrete, change] = money.concretize()

      // Concrete should be scaled to asset precision
      expect(concrete.balance.amount.amount).toBe(1250n) // $12.50
      expect(concrete.balance.amount.decimals).toBe(2n)

      // Change should be zero since no precision was lost
      expect(change.balance.amount.amount).toBe(0n)
      expect(change.balance.amount.decimals).toBe(2n)

      // Adding them back should equal the original (but at higher precision)
      const reconstructed = concrete.add(change)
      expect(reconstructed.balance.amount.amount).toBe(1250n)
      expect(reconstructed.balance.amount.decimals).toBe(2n)
    })

    it("should throw error for non-fungible assets", () => {
      const basicAsset = { name: "Basic Asset" }
      const money = new Money({
        asset: basicAsset,
        amount: { amount: 1000n, decimals: 2n },
      })

      expect(() => money.concretize()).toThrow(
        "Cannot concretize Money with non-fungible asset",
      )
    })
  })

  describe("multiply", () => {
    it("should multiply Money by a bigint scalar", () => {
      const money = new Money(usdAmount) // $100.50

      const result = money.multiply(3n)

      expect(result.balance.asset).toEqual(usdCurrency)
      expect(result.balance.amount.amount).toBe(30150n) // $301.50
      expect(result.balance.amount.decimals).toBe(2n)
    })

    it("should multiply Money by a FixedPoint", () => {
      const money = new Money(usdAmount) // $100.50
      const multiplier = { amount: 25n, decimals: 1n } // 2.5

      const result = money.multiply(multiplier)

      expect(result.balance.asset).toEqual(usdCurrency)
      expect(result.balance.amount.amount).toBe(25125n) // $251.25
      expect(result.balance.amount.decimals).toBe(2n)
    })

    it("should return a new Money instance (immutability)", () => {
      const money = new Money(usdAmount)

      const result = money.multiply(2n)

      expect(result).not.toBe(money)
      expect(money.balance.amount.amount).toBe(10050n) // Original unchanged
    })

    it("should handle multiplication by zero", () => {
      const money = new Money(usdAmount)

      const result = money.multiply(0n)

      expect(result.balance.amount.amount).toBe(0n)
      expect(result.balance.amount.decimals).toBe(2n)
    })

    it("should handle fractional multiplication", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 1000n, decimals: 2n }, // $10.00
      })
      const multiplier = { amount: 5n, decimals: 1n } // 0.5

      const result = money.multiply(multiplier)

      expect(result.balance.amount.amount).toBe(500n) // $5.00
      expect(result.balance.amount.decimals).toBe(2n)
    })
  })

  describe("isZero", () => {
    it("should return true for zero amounts", () => {
      const zeroMoney = new Money({
        asset: usdCurrency,
        amount: { amount: 0n, decimals: 2n },
      })
      expect(zeroMoney.isZero()).toBe(true)
    })

    it("should return false for non-zero amounts", () => {
      const nonZeroMoney = new Money(usdAmount)
      expect(nonZeroMoney.isZero()).toBe(false)
    })

    it("should return true for zero regardless of decimals", () => {
      const zeroNoDecimals = new Money({
        asset: usdCurrency,
        amount: { amount: 0n, decimals: 0n },
      })
      const zeroWithDecimals = new Money({
        asset: usdCurrency,
        amount: { amount: 0n, decimals: 5n },
      })

      expect(zeroNoDecimals.isZero()).toBe(true)
      expect(zeroWithDecimals.isZero()).toBe(true)
    })
  })

  describe("lessThan", () => {
    it("should return true when this money is less than other Money with same asset", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n }, // $50.00
      })
      const money2 = new Money(usdAmount) // $100.50

      expect(money1.lessThan(money2)).toBe(true)
      expect(money2.lessThan(money1)).toBe(false)
    })

    it("should return false when amounts are equal", () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money(usdAmount)

      expect(money1.lessThan(money2)).toBe(false)
    })

    it("should work with AssetAmount", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n }, // $50.00
      })

      expect(money.lessThan(usdAmount)).toBe(true) // $50.00 < $100.50
    })

    it("should handle different decimal precision", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 100n, decimals: 1n }, // $10.0
      })
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 10500n, decimals: 3n }, // $10.500
      })

      expect(money1.lessThan(money2)).toBe(true)
    })

    it("should throw error when comparing different assets", () => {
      const usdMoney = new Money(usdAmount)
      const eurMoney = new Money(eurAmount)

      expect(() => usdMoney.lessThan(eurMoney)).toThrow(
        "Cannot compare Money with different asset types",
      )
    })
  })

  describe("lessThanOrEqual", () => {
    it("should return true when this money is less than other", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n },
      })
      const money2 = new Money(usdAmount)

      expect(money1.lessThanOrEqual(money2)).toBe(true)
    })

    it("should return true when amounts are equal", () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money(usdAmount)

      expect(money1.lessThanOrEqual(money2)).toBe(true)
    })

    it("should return false when this money is greater than other", () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n },
      })

      expect(money1.lessThanOrEqual(money2)).toBe(false)
    })

    it("should work with AssetAmount", () => {
      const money = new Money(usdAmount)

      expect(money.lessThanOrEqual(usdAmount)).toBe(true) // Equal amounts
    })

    it("should throw error when comparing different assets", () => {
      const usdMoney = new Money(usdAmount)
      const eurMoney = new Money(eurAmount)

      expect(() => usdMoney.lessThanOrEqual(eurMoney)).toThrow(
        "Cannot compare Money with different asset types",
      )
    })
  })

  describe("greaterThan", () => {
    it("should return true when this money is greater than other Money with same asset", () => {
      const money1 = new Money(usdAmount) // $100.50
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n }, // $50.00
      })

      expect(money1.greaterThan(money2)).toBe(true)
      expect(money2.greaterThan(money1)).toBe(false)
    })

    it("should return false when amounts are equal", () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money(usdAmount)

      expect(money1.greaterThan(money2)).toBe(false)
    })

    it("should work with AssetAmount", () => {
      const money = new Money(usdAmount) // $100.50
      const smallerAmount = {
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n }, // $50.00
      }

      expect(money.greaterThan(smallerAmount)).toBe(true)
    })

    it("should handle different decimal precision", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 10500n, decimals: 3n }, // $10.500
      })
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 100n, decimals: 1n }, // $10.0
      })

      expect(money1.greaterThan(money2)).toBe(true)
    })

    it("should throw error when comparing different assets", () => {
      const usdMoney = new Money(usdAmount)
      const eurMoney = new Money(eurAmount)

      expect(() => usdMoney.greaterThan(eurMoney)).toThrow(
        "Cannot compare Money with different asset types",
      )
    })
  })

  describe("greaterThanOrEqual", () => {
    it("should return true when this money is greater than other", () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n },
      })

      expect(money1.greaterThanOrEqual(money2)).toBe(true)
    })

    it("should return true when amounts are equal", () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money(usdAmount)

      expect(money1.greaterThanOrEqual(money2)).toBe(true)
    })

    it("should return false when this money is less than other", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n },
      })
      const money2 = new Money(usdAmount)

      expect(money1.greaterThanOrEqual(money2)).toBe(false)
    })

    it("should work with AssetAmount", () => {
      const money = new Money(usdAmount)

      expect(money.greaterThanOrEqual(usdAmount)).toBe(true) // Equal amounts
    })

    it("should throw error when comparing different assets", () => {
      const usdMoney = new Money(usdAmount)
      const eurMoney = new Money(eurAmount)

      expect(() => usdMoney.greaterThanOrEqual(eurMoney)).toThrow(
        "Cannot compare Money with different asset types",
      )
    })
  })

  describe("isPositive", () => {
    it("should return true for positive amounts", () => {
      const positiveMoney = new Money(usdAmount) // $100.50
      expect(positiveMoney.isPositive()).toBe(true)
    })

    it("should return false for zero amounts", () => {
      const zeroMoney = new Money({
        asset: usdCurrency,
        amount: { amount: 0n, decimals: 2n },
      })
      expect(zeroMoney.isPositive()).toBe(false)
    })

    it("should return false for negative amounts", () => {
      const negativeMoney = new Money({
        asset: usdCurrency,
        amount: { amount: -5000n, decimals: 2n }, // -$50.00
      })
      expect(negativeMoney.isPositive()).toBe(false)
    })
  })

  describe("isNegative", () => {
    it("should return true for negative amounts", () => {
      const negativeMoney = new Money({
        asset: usdCurrency,
        amount: { amount: -5000n, decimals: 2n }, // -$50.00
      })
      expect(negativeMoney.isNegative()).toBe(true)
    })

    it("should return false for zero amounts", () => {
      const zeroMoney = new Money({
        asset: usdCurrency,
        amount: { amount: 0n, decimals: 2n },
      })
      expect(zeroMoney.isNegative()).toBe(false)
    })

    it("should return false for positive amounts", () => {
      const positiveMoney = new Money(usdAmount) // $100.50
      expect(positiveMoney.isNegative()).toBe(false)
    })
  })

  describe("absolute", () => {
    it("should return the same instance for positive amounts", () => {
      const positiveMoney = new Money(usdAmount) // $100.50
      const result = positiveMoney.absolute()

      expect(result).toBe(positiveMoney) // Should be the same instance
      expect(result.balance.amount.amount).toBe(10050n)
    })

    it("should return the same instance for zero amounts", () => {
      const zeroMoney = new Money({
        asset: usdCurrency,
        amount: { amount: 0n, decimals: 2n },
      })
      const result = zeroMoney.absolute()

      expect(result).toBe(zeroMoney) // Should be the same instance
      expect(result.balance.amount.amount).toBe(0n)
    })

    it("should return positive amount for negative FixedPointNumber amounts", () => {
      const negativeMoney = new Money({
        asset: usdCurrency,
        amount: { amount: -5000n, decimals: 2n }, // -$50.00
      })
      const result = negativeMoney.absolute()

      expect(result).not.toBe(negativeMoney) // Should be a new instance
      expect(result.balance.amount.amount).toBe(5000n) // $50.00
      expect(result.balance.amount.decimals).toBe(2n)
      expect(result.balance.asset).toEqual(usdCurrency)
    })

    it("should work with RationalNumber amounts", () => {
      // Create a Money instance with RationalNumber (we'll use the new constructor)
      const rationalAmount = new (require("../src/rationals").RationalNumber)({
        p: -500n,
        q: 100n,
      }) // -5.00
      const negativeMoney = new Money(usdCurrency, rationalAmount)
      const result = negativeMoney.absolute()

      expect(result).not.toBe(negativeMoney) // Should be a new instance
      expect(result.isPositive()).toBe(true)
      expect(result.currency).toEqual(usdCurrency)
    })

    it("should preserve immutability", () => {
      const negativeMoney = new Money({
        asset: usdCurrency,
        amount: { amount: -2500n, decimals: 2n }, // -$25.00
      })
      const originalAmount = negativeMoney.balance.amount.amount

      const result = negativeMoney.absolute()

      // Original should be unchanged
      expect(negativeMoney.balance.amount.amount).toBe(originalAmount)
      expect(negativeMoney.isNegative()).toBe(true)

      // Result should be positive
      expect(result.balance.amount.amount).toBe(2500n)
      expect(result.isPositive()).toBe(true)
    })
  })

  describe("negate", () => {
    it("should flip positive amounts to negative", () => {
      const positiveMoney = new Money(usdAmount) // $100.50
      const result = positiveMoney.negate()

      expect(result).not.toBe(positiveMoney) // Should be a new instance
      expect(result.balance.amount.amount).toBe(-10050n) // -$100.50
      expect(result.balance.amount.decimals).toBe(2n)
      expect(result.balance.asset).toEqual(usdCurrency)
      expect(result.isNegative()).toBe(true)
    })

    it("should flip negative amounts to positive", () => {
      const negativeMoney = new Money({
        asset: usdCurrency,
        amount: { amount: -5000n, decimals: 2n }, // -$50.00
      })
      const result = negativeMoney.negate()

      expect(result).not.toBe(negativeMoney) // Should be a new instance
      expect(result.balance.amount.amount).toBe(5000n) // $50.00
      expect(result.balance.amount.decimals).toBe(2n)
      expect(result.balance.asset).toEqual(usdCurrency)
      expect(result.isPositive()).toBe(true)
    })

    it("should flip zero to zero (but new instance)", () => {
      const zeroMoney = new Money({
        asset: usdCurrency,
        amount: { amount: 0n, decimals: 2n },
      })
      const result = zeroMoney.negate()

      expect(result).not.toBe(zeroMoney) // Should be a new instance
      expect(result.balance.amount.amount).toBe(0n) // Still zero
      expect(result.balance.amount.decimals).toBe(2n)
      expect(result.isZero()).toBe(true)
    })

    it("should work with RationalNumber amounts", () => {
      // Create a Money instance with RationalNumber
      const rationalAmount = new (require("../src/rationals").RationalNumber)({
        p: 500n,
        q: 100n,
      }) // 5.00
      const positiveMoney = new Money(usdCurrency, rationalAmount)
      const result = positiveMoney.negate()

      expect(result).not.toBe(positiveMoney) // Should be a new instance
      expect(result.isNegative()).toBe(true)
      expect(result.currency).toEqual(usdCurrency)
    })

    it("should preserve immutability", () => {
      const originalMoney = new Money({
        asset: usdCurrency,
        amount: { amount: 7500n, decimals: 2n }, // $75.00
      })
      const originalAmount = originalMoney.balance.amount.amount

      const result = originalMoney.negate()

      // Original should be unchanged
      expect(originalMoney.balance.amount.amount).toBe(originalAmount)
      expect(originalMoney.isPositive()).toBe(true)

      // Result should be negated
      expect(result.balance.amount.amount).toBe(-7500n)
      expect(result.isNegative()).toBe(true)
    })

    it("should be reversible (double negation)", () => {
      const originalMoney = new Money(usdAmount) // $100.50
      const negated = originalMoney.negate()
      const doubleNegated = negated.negate()

      expect(doubleNegated.equals(originalMoney)).toBe(true)
      expect(doubleNegated.balance.amount.amount).toBe(
        originalMoney.balance.amount.amount,
      )
    })
  })

  describe("allocate", () => {
    it("should allocate money proportionally by ratios", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10000n, decimals: 2n }, // $100.00
      })

      const [first, second, third] = money.allocate([1, 2, 1])

      // Should split as $25, $50, $25
      expect(first.balance.amount.amount).toBe(2500n) // $25.00
      expect(second.balance.amount.amount).toBe(5000n) // $50.00
      expect(third.balance.amount.amount).toBe(2500n) // $25.00

      // All should have the same currency and decimals
      expect(first.currency).toEqual(usdCurrency)
      expect(second.currency).toEqual(usdCurrency)
      expect(third.currency).toEqual(usdCurrency)
      expect(first.balance.amount.decimals).toBe(2n)
      expect(second.balance.amount.decimals).toBe(2n)
      expect(third.balance.amount.decimals).toBe(2n)
    })

    it("should handle remainders using largest remainder method", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10001n, decimals: 2n }, // $100.01
      })

      const [first, second, third] = money.allocate([1, 1, 1])

      // Should split as $33.34, $33.34, $33.33 (remainders go to first recipients)
      const amounts = [first, second, third].map((m) => m.balance.amount.amount)
      const total = amounts.reduce((sum, amount) => sum + amount, 0n)

      expect(total).toBe(10001n) // Should equal original amount exactly
      expect(amounts.sort()).toEqual([3333n, 3334n, 3334n]) // Two get extra penny
    })

    it("should handle uneven ratios correctly", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10000n, decimals: 2n }, // $100.00
      })

      const [small, large] = money.allocate([1, 3])

      expect(small.balance.amount.amount).toBe(2500n) // $25.00 (1/4)
      expect(large.balance.amount.amount).toBe(7500n) // $75.00 (3/4)

      // Total should be preserved
      const total = small.add(large)
      expect(total.equals(money)).toBe(true)
    })

    it("should work with zero amounts", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 0n, decimals: 2n }, // $0.00
      })

      const [first, second] = money.allocate([1, 1])

      expect(first.balance.amount.amount).toBe(0n)
      expect(second.balance.amount.amount).toBe(0n)
      expect(first.isZero()).toBe(true)
      expect(second.isZero()).toBe(true)
    })

    it("should work with single ratio", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n }, // $50.00
      })

      const [only] = money.allocate([1])

      expect(only.equals(money)).toBe(true)
    })

    it("should handle zero ratios", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10000n, decimals: 2n }, // $100.00
      })

      const [first, second, third] = money.allocate([2, 0, 1])

      expect(first.balance.amount.amount).toBe(6667n) // $66.67 (2/3)
      expect(second.balance.amount.amount).toBe(0n) // $0.00 (0/3)
      expect(third.balance.amount.amount).toBe(3333n) // $33.33 (1/3)

      // Total should be preserved
      const total = first.add(second).add(third)
      expect(total.equals(money)).toBe(true)
    })

    it("should work with RationalNumber amounts", () => {
      const rationalAmount = new (require("../src/rationals").RationalNumber)({
        p: 10000n,
        q: 100n,
      }) // 100.00
      const money = new Money(usdCurrency, rationalAmount)

      const [first, second] = money.allocate([1, 1])

      // Should split evenly - check that total is preserved rather than specific amounts
      // since RationalNumber gets converted to FixedPointNumber with different precision
      const total = first.add(second)
      expect(total.equals(money)).toBe(true)

      // Both parts should be equal
      expect(first.equals(second)).toBe(true)
    })

    it("should throw error for empty ratios array", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10000n, decimals: 2n },
      })

      expect(() => money.allocate([])).toThrow(
        "Cannot allocate with empty ratios array",
      )
    })

    it("should throw error for negative ratios", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10000n, decimals: 2n },
      })

      expect(() => money.allocate([1, -1, 1])).toThrow(
        "Cannot allocate with negative ratios",
      )
    })

    it("should throw error for all zero ratios", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10000n, decimals: 2n },
      })

      expect(() => money.allocate([0, 0, 0])).toThrow(
        "Cannot allocate with all zero ratios",
      )
    })

    it("should preserve precision with small amounts", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 1n, decimals: 2n }, // $0.01
      })

      const [first, second, third] = money.allocate([1, 1, 1])

      // One should get the penny, others should get zero
      const amounts = [first, second, third].map((m) => m.balance.amount.amount)
      const total = amounts.reduce((sum, amount) => sum + amount, 0n)

      expect(total).toBe(1n)
      expect(amounts.filter((a) => a === 1n).length).toBe(1) // Exactly one gets the penny
      expect(amounts.filter((a) => a === 0n).length).toBe(2) // Two get nothing
    })

    describe("distributeFractionalUnits option", () => {
      it("should separate fractional units when distributeFractionalUnits is false", () => {
        const money = new Money({
          asset: usdCurrency,
          amount: { amount: 10000015n, decimals: 5n }, // $100.00015
        })

        const parts = money.allocate([1, 1, 1], {
          distributeFractionalUnits: false,
        })

        expect(parts.length).toBe(4) // 3 main parts + 1 change

        // Main parts should be in standard currency precision (2 decimals)
        expect(parts[0].balance.amount.decimals).toBe(2n)
        expect(parts[1].balance.amount.decimals).toBe(2n)
        expect(parts[2].balance.amount.decimals).toBe(2n)

        // Should distribute $100.00 evenly: first gets extra cent due to largest remainder method
        expect(parts[0].balance.amount.amount).toBe(3334n) // $33.34 (gets remainder)
        expect(parts[1].balance.amount.amount).toBe(3333n) // $33.33
        expect(parts[2].balance.amount.amount).toBe(3333n) // $33.33

        // Change should contain the fractional units beyond currency precision
        const change = parts[3]
        expect(change.balance.amount.amount).toBe(15n) // $0.00015
        expect(change.balance.amount.decimals).toBe(5n) // Original precision

        // Total of main parts + change should equal original
        const mainTotal = parts.slice(0, 3).reduce((sum, part) => sum.add(part))
        const grandTotal = mainTotal.add(change)
        expect(grandTotal.equals(money)).toBe(true)
      })

      it("should include fractional units in distribution when distributeFractionalUnits is true (default)", () => {
        const money = new Money({
          asset: usdCurrency,
          amount: { amount: 10000015n, decimals: 5n }, // $100.00015
        })

        const parts = money.allocate([1, 1, 1], {
          distributeFractionalUnits: true,
        })

        expect(parts.length).toBe(3) // Only 3 parts, no separate change

        // All parts should maintain original precision
        expect(parts[0].balance.amount.decimals).toBe(5n) // Original precision maintained
        expect(parts[1].balance.amount.decimals).toBe(5n)
        expect(parts[2].balance.amount.decimals).toBe(5n)

        // Total should equal original
        const total = parts.reduce((sum, part) => sum.add(part))
        expect(total.equals(money)).toBe(true)
      })

      it("should handle zero fractional change gracefully", () => {
        const money = new Money({
          asset: usdCurrency,
          amount: { amount: 10000000n, decimals: 5n }, // $100.00000 (no fractional units)
        })

        const parts = money.allocate([1, 1, 1], {
          distributeFractionalUnits: false,
        })

        expect(parts.length).toBe(3) // No change element since change is zero

        // Should distribute $100.00 evenly (first gets remainder due to largest remainder method)
        expect(parts[0].balance.amount.amount).toBe(3334n) // $33.34 (gets remainder)
        expect(parts[1].balance.amount.amount).toBe(3333n) // $33.33
        expect(parts[2].balance.amount.amount).toBe(3333n) // $33.33

        const total = parts.reduce((sum, part) => sum.add(part))
        expect(total.balance.amount.amount).toBe(10000n) // $100.00 in cents
      })

      it("should work with currencies that have high precision by default", () => {
        const btcCurrency = {
          name: "Bitcoin",
          code: "BTC",
          decimals: 8n,
          symbol: "₿",
        }

        const money = new Money({
          asset: btcCurrency,
          amount: { amount: 100000001n, decimals: 10n }, // 1.00000001 BTC with extra precision
        })

        const parts = money.allocate([1, 1], {
          distributeFractionalUnits: false,
        })

        expect(parts.length).toBe(3) // 2 main parts + 1 change

        // Main parts should be in BTC standard precision (8 decimals)
        expect(parts[0].balance.amount.decimals).toBe(8n)
        expect(parts[1].balance.amount.decimals).toBe(8n)

        // Change should contain the extra precision
        const change = parts[2]
        expect(change.balance.amount.decimals).toBe(10n)

        const total = parts.reduce((sum, part) => sum.add(part))
        expect(total.equals(money)).toBe(true)
      })

      it("should not separate when current precision equals currency precision", () => {
        const money = new Money({
          asset: usdCurrency,
          amount: { amount: 10050n, decimals: 2n }, // $100.50 - already at currency precision
        })

        const parts = money.allocate([1, 1, 1], {
          distributeFractionalUnits: false,
        })

        expect(parts.length).toBe(3) // No change element

        // Should distribute normally
        const total = parts.reduce((sum, part) => sum.add(part))
        expect(total.equals(money)).toBe(true)
      })

      it("should work with RationalNumber amounts", () => {
        const rationalAmount = new (require("../src/rationals").RationalNumber)(
          { p: 10000015n, q: 100000n },
        ) // 100.00015
        const money = new Money(usdCurrency, rationalAmount)

        const parts = money.allocate([1, 1, 1], {
          distributeFractionalUnits: false,
        })

        // Should have change if there are fractional units to separate
        expect(parts.length).toBeGreaterThanOrEqual(3) // At least 3 parts

        // Verify total preservation by comparing decimal string representations
        const total = parts.reduce((sum, part) => sum.add(part))
        const originalDecimal = money.amount.toDecimalString(10n)
        const totalDecimal = total.amount.toDecimalString
          ? total.amount.toDecimalString(10n)
          : total.amount.toString()
        expect(totalDecimal).toBe(originalDecimal)
      })
    })
  })

  describe("distribute", () => {
    it("should distribute money evenly", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10000n, decimals: 2n }, // $100.00
      })

      const [first, second] = money.distribute(2)

      expect(first.balance.amount.amount).toBe(5000n) // $50.00
      expect(second.balance.amount.amount).toBe(5000n) // $50.00

      const total = first.add(second)
      expect(total.equals(money)).toBe(true)
    })

    it("should handle remainders fairly", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10001n, decimals: 2n }, // $100.01
      })

      const parts = money.distribute(3)

      // Should split as evenly as possible
      const amounts = parts.map((m) => m.balance.amount.amount)
      const total = amounts.reduce((sum, amount) => sum + amount, 0n)

      expect(total).toBe(10001n) // Should equal original exactly
      expect(amounts.sort()).toEqual([3333n, 3334n, 3334n]) // As even as possible
    })

    it("should work with single part", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 7500n, decimals: 2n }, // $75.00
      })

      const [only] = money.distribute(1)

      expect(only.equals(money)).toBe(true)
    })

    it("should work with zero amounts", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 0n, decimals: 2n }, // $0.00
      })

      const parts = money.distribute(5)

      expect(parts.length).toBe(5)
      parts.forEach((part) => {
        expect(part.isZero()).toBe(true)
      })
    })

    it("should distribute large amounts correctly", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 1000000n, decimals: 2n }, // $10,000.00
      })

      const parts = money.distribute(7)

      const amounts = parts.map((m) => m.balance.amount.amount)
      const total = amounts.reduce((sum, amount) => sum + amount, 0n)

      expect(total).toBe(1000000n) // Should equal original exactly
      expect(parts.length).toBe(7)

      // All amounts should be close to 1000000/7 ≈ 142857.14
      amounts.forEach((amount) => {
        expect(amount >= 142857n && amount <= 142858n).toBe(true)
      })
    })

    it("should throw error for zero parts", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10000n, decimals: 2n },
      })

      expect(() => money.distribute(0)).toThrow(
        "Parts must be a positive integer",
      )
    })

    it("should throw error for negative parts", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10000n, decimals: 2n },
      })

      expect(() => money.distribute(-1)).toThrow(
        "Parts must be a positive integer",
      )
    })

    it("should throw error for non-integer parts", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10000n, decimals: 2n },
      })

      expect(() => money.distribute(2.5)).toThrow(
        "Parts must be a positive integer",
      )
    })

    it("should work with RationalNumber amounts", () => {
      const rationalAmount = new (require("../src/rationals").RationalNumber)({
        p: 15000n,
        q: 100n,
      }) // 150.00
      const money = new Money(usdCurrency, rationalAmount)

      const parts = money.distribute(4)

      const total = parts.reduce((sum, part) => sum.add(part))
      expect(total.equals(money)).toBe(true)
    })

    describe("distributeFractionalUnits option", () => {
      it("should separate fractional units when distributeFractionalUnits is false", () => {
        const money = new Money({
          asset: usdCurrency,
          amount: { amount: 10000015n, decimals: 5n }, // $100.00015
        })

        const parts = money.distribute(3, { distributeFractionalUnits: false })

        expect(parts.length).toBe(4) // 3 main parts + 1 change

        // Main parts should be distributed (first gets remainder due to largest remainder method)
        expect(parts[0].balance.amount.amount).toBe(3334n) // $33.34 (gets remainder)
        expect(parts[1].balance.amount.amount).toBe(3333n) // $33.33
        expect(parts[2].balance.amount.amount).toBe(3333n) // $33.33

        // Change should be the fractional part
        const change = parts[3]
        expect(change.balance.amount.amount).toBe(15n) // $0.00015
        expect(change.balance.amount.decimals).toBe(5n)

        // Verify totals
        const mainTotal = parts.slice(0, 3).reduce((sum, part) => sum.add(part))
        const grandTotal = mainTotal.add(change)
        expect(grandTotal.equals(money)).toBe(true)
      })

      it("should include fractional units in distribution when distributeFractionalUnits is true (default)", () => {
        const money = new Money({
          asset: usdCurrency,
          amount: { amount: 10000015n, decimals: 5n }, // $100.00015
        })

        const parts = money.distribute(3, { distributeFractionalUnits: true })

        expect(parts.length).toBe(3) // Only 3 parts, no separate change

        const total = parts.reduce((sum, part) => sum.add(part))
        expect(total.equals(money)).toBe(true)
      })

      it("should omit change element when fractional change is zero", () => {
        const money = new Money({
          asset: usdCurrency,
          amount: { amount: 10000000n, decimals: 5n }, // $100.00000 (no fractional part)
        })

        const parts = money.distribute(2, { distributeFractionalUnits: false })

        expect(parts.length).toBe(2) // No change element
        expect(parts[0].balance.amount.amount).toBe(5000n) // $50.00
        expect(parts[1].balance.amount.amount).toBe(5000n) // $50.00
      })

      it("should work with single part distribution", () => {
        const money = new Money({
          asset: usdCurrency,
          amount: { amount: 5000015n, decimals: 5n }, // $50.00015
        })

        const parts = money.distribute(1, { distributeFractionalUnits: false })

        expect(parts.length).toBe(2) // 1 main part + change
        expect(parts[0].balance.amount.amount).toBe(5000n) // $50.00
        expect(parts[1].balance.amount.amount).toBe(15n) // $0.00015
      })

      it("should respect the example from documentation", () => {
        const money = new Money({
          asset: usdCurrency,
          amount: { amount: 10000015n, decimals: 5n }, // $100.00015
        })

        const parts = money.distribute(3, { distributeFractionalUnits: false })

        // Should have 4 parts: 3 main + change (order may vary due to largest remainder method)
        expect(parts.length).toBe(4)

        // Verify the main parts sum to $100.00 in canonical precision
        const mainParts = parts.slice(0, 3)
        const mainTotal = mainParts.reduce((sum, part) => sum.add(part))
        expect(mainTotal.balance.amount.amount).toBe(10000n) // $100.00 in cents

        // Verify change is the fractional part
        const change = parts[3]
        expect(change.balance.amount.amount).toBe(15n) // $0.00015
        expect(change.balance.amount.decimals).toBe(5n)
      })
    })
  })

  describe("max", () => {
    it("should return the larger of two Money instances", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n }, // $50.00
      })
      const money2 = new Money(usdAmount) // $100.50

      expect(money1.max(money2)).toBe(money2)
      expect(money2.max(money1)).toBe(money2)
    })

    it("should return this when amounts are equal", () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money(usdAmount)

      expect(money1.max(money2)).toBe(money1)
    })

    it("should handle multiple Money instances in array", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n }, // $50.00
      })
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 15000n, decimals: 2n }, // $150.00
      })
      const money3 = new Money(usdAmount) // $100.50

      const result = money1.max([money2, money3])
      expect(result).toBe(money2)
    })

    it("should handle different decimal precision", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 1000n, decimals: 2n }, // $10.00
      })
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 10500n, decimals: 3n }, // $10.500
      })

      const result = money1.max(money2)
      expect(result).toBe(money2)
    })

    it("should throw error when comparing different assets", () => {
      const usdMoney = new Money(usdAmount)
      const eurMoney = new Money(eurAmount)

      expect(() => usdMoney.max(eurMoney)).toThrow(
        "Cannot compare Money with different asset types",
      )
    })

    it("should throw error when array contains different assets", () => {
      const usdMoney1 = new Money(usdAmount)
      const usdMoney2 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n },
      })
      const eurMoney = new Money(eurAmount)

      expect(() => usdMoney1.max([usdMoney2, eurMoney])).toThrow(
        "Cannot compare Money with different asset types",
      )
    })
  })

  describe("min", () => {
    it("should return the smaller of two Money instances", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n }, // $50.00
      })
      const money2 = new Money(usdAmount) // $100.50

      expect(money1.min(money2)).toBe(money1)
      expect(money2.min(money1)).toBe(money1)
    })

    it("should return this when amounts are equal", () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money(usdAmount)

      expect(money1.min(money2)).toBe(money1)
    })

    it("should handle multiple Money instances in array", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 15000n, decimals: 2n }, // $150.00
      })
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n }, // $50.00
      })
      const money3 = new Money(usdAmount) // $100.50

      const result = money1.min([money2, money3])
      expect(result).toBe(money2)
    })

    it("should handle different decimal precision", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 10500n, decimals: 3n }, // $10.500
      })
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 1000n, decimals: 2n }, // $10.00
      })

      const result = money1.min(money2)
      expect(result).toBe(money2)
    })

    it("should throw error when comparing different assets", () => {
      const usdMoney = new Money(usdAmount)
      const eurMoney = new Money(eurAmount)

      expect(() => usdMoney.min(eurMoney)).toThrow(
        "Cannot compare Money with different asset types",
      )
    })

    it("should throw error when array contains different assets", () => {
      const usdMoney1 = new Money(usdAmount)
      const usdMoney2 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n },
      })
      const eurMoney = new Money(eurAmount)

      expect(() => usdMoney1.min([usdMoney2, eurMoney])).toThrow(
        "Cannot compare Money with different asset types",
      )
    })
  })

  describe("hasSubUnits", () => {
    it("should return false for amounts with no fractional part", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10000n, decimals: 2n }, // $100.00
      })

      expect(money.hasSubUnits()).toBe(false)
    })

    it("should return false for amounts with fractional part within asset precision", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10150n, decimals: 2n }, // $101.50
      })

      expect(money.hasSubUnits()).toBe(false)
    })

    it("should return true for amounts with fractional part beyond asset precision", () => {
      const money = new Money({
        asset: usdCurrency, // 2 decimals
        amount: { amount: 101505n, decimals: 3n }, // $101.505
      })

      expect(money.hasSubUnits()).toBe(true)
    })

    it("should return false when amount precision equals asset precision", () => {
      const money = new Money({
        asset: usdCurrency, // 2 decimals
        amount: { amount: 10150n, decimals: 2n }, // $101.50
      })

      expect(money.hasSubUnits()).toBe(false)
    })

    it("should return false when amount precision is less than asset precision", () => {
      const money = new Money({
        asset: usdCurrency, // 2 decimals
        amount: { amount: 101n, decimals: 1n }, // $10.1
      })

      expect(money.hasSubUnits()).toBe(false)
    })

    it("should return false for zero sub-units beyond asset precision", () => {
      const money = new Money({
        asset: usdCurrency, // 2 decimals
        amount: { amount: 101500n, decimals: 3n }, // $101.500 (ends in zero)
      })

      expect(money.hasSubUnits()).toBe(false)
    })

    it("should return true for non-zero sub-units beyond asset precision", () => {
      const money = new Money({
        asset: usdCurrency, // 2 decimals
        amount: { amount: 101501n, decimals: 3n }, // $101.501
      })

      expect(money.hasSubUnits()).toBe(true)
    })

    it("should handle multiple extra decimal places", () => {
      const money = new Money({
        asset: usdCurrency, // 2 decimals
        amount: { amount: 1015001n, decimals: 4n }, // $101.5001
      })

      expect(money.hasSubUnits()).toBe(true)
    })

    it("should return false for multiple extra decimal places that are all zero", () => {
      const money = new Money({
        asset: usdCurrency, // 2 decimals
        amount: { amount: 1015000n, decimals: 4n }, // $101.5000
      })

      expect(money.hasSubUnits()).toBe(false)
    })

    it("should return false for non-fungible assets", () => {
      const basicAsset = { name: "Basic Asset" }
      const money = new Money({
        asset: basicAsset,
        amount: { amount: 1000n, decimals: 2n },
      })

      expect(money.hasSubUnits()).toBe(false)
    })
  })

  describe("hasChange", () => {
    it("should return false for whole number amounts with no decimals", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 100n, decimals: 0n }, // 100
      })

      expect(money.hasChange()).toBe(false)
    })

    it("should return false for amounts ending in zero with decimals", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10000n, decimals: 2n }, // $100.00
      })

      expect(money.hasChange()).toBe(false)
    })

    it("should return true for amounts with fractional part", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10150n, decimals: 2n }, // $101.50
      })

      expect(money.hasChange()).toBe(true)
    })

    it("should return true for amounts with single digit fractional part", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 101n, decimals: 1n }, // $10.1
      })

      expect(money.hasChange()).toBe(true)
    })

    it("should return true for small fractional amounts", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 10001n, decimals: 2n }, // $100.01
      })

      expect(money.hasChange()).toBe(true)
    })

    it("should return false for zero amounts", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 0n, decimals: 2n }, // $0.00
      })

      expect(money.hasChange()).toBe(false)
    })

    it("should return true for fractional amounts with many decimal places", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 1000001n, decimals: 4n }, // $100.0001
      })

      expect(money.hasChange()).toBe(true)
    })

    it("should return false for amounts with trailing zeros in many decimal places", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 1000000n, decimals: 4n }, // $100.0000
      })

      expect(money.hasChange()).toBe(false)
    })

    it("should work with negative amounts - return true for fractional part", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: -10150n, decimals: 2n }, // -$101.50
      })

      expect(money.hasChange()).toBe(true)
    })

    it("should work with negative amounts - return false for whole numbers", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: -10100n, decimals: 2n }, // -$101.00
      })

      expect(money.hasChange()).toBe(false)
    })

    it("should return false for non-fungible assets", () => {
      const basicAsset = { name: "Basic Asset" }
      const money = new Money({
        asset: basicAsset,
        amount: { amount: 1050n, decimals: 2n }, // 10.50
      })

      expect(money.hasChange()).toBe(false)
    })
  })

  describe("toJSON", () => {
    it("should serialize a simple Currency Money instance", () => {
      const money = new Money(usdAmount) // $100.50
      const json = money.toJSON()

      expect(json).toEqual({
        currency: {
          name: "US Dollar",
          code: "USD",
          decimals: "2",
          symbol: "$",
        },
        amount: "100.50",
      })
    })

    it("should serialize FungibleAsset with fractionalUnit string", () => {
      const btcAsset = {
        name: "Bitcoin",
        code: "BTC",
        decimals: 8n,
        fractionalUnit: "satoshi",
      }
      const money = new Money({
        asset: btcAsset,
        amount: { amount: 100000000n, decimals: 8n }, // 1.00000000 BTC
      })

      const json = money.toJSON()

      expect(json).toEqual({
        currency: {
          name: "Bitcoin",
          code: "BTC",
          decimals: "8",
          fractionalUnit: "satoshi",
        },
        amount: "1.00000000",
      })
    })

    it("should serialize FungibleAsset with fractionalUnit array", () => {
      const btcAsset = {
        name: "Bitcoin",
        code: "BTC",
        decimals: 8n,
        fractionalUnit: ["satoshi", "sat"],
      }
      const money = new Money({
        asset: btcAsset,
        amount: { amount: 50000000n, decimals: 8n }, // 0.50000000 BTC
      })

      const json = money.toJSON()

      expect(json).toEqual({
        currency: {
          name: "Bitcoin",
          code: "BTC",
          decimals: "8",
          fractionalUnit: ["satoshi", "sat"],
        },
        amount: "0.50000000",
      })
    })

    it("should serialize FungibleAsset with fractionalUnit Record", () => {
      const btcAsset = {
        name: "Bitcoin",
        code: "BTC",
        decimals: 8n,
        fractionalUnit: {
          8: ["satoshi", "sat"],
          12: ["millisatoshi", "millisat"],
        },
      }
      const money = new Money({
        asset: btcAsset,
        amount: { amount: 21000000n, decimals: 8n }, // 0.21000000 BTC
      })

      const json = money.toJSON()

      expect(json).toEqual({
        currency: {
          name: "Bitcoin",
          code: "BTC",
          decimals: "8",
          fractionalUnit: {
            8: ["satoshi", "sat"],
            12: ["millisatoshi", "millisat"],
          },
        },
        amount: "0.21000000",
      })
    })

    it("should serialize basic Asset (no decimals)", () => {
      const basicAsset = { name: "Basic Asset" }
      const money = new Money({
        asset: basicAsset,
        amount: { amount: 1000n, decimals: 0n },
      })

      const json = money.toJSON()

      expect(json).toEqual({
        currency: {
          name: "Basic Asset",
        },
        amount: "1000",
      })
    })

    it("should handle zero amounts", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 0n, decimals: 2n },
      })

      const json = money.toJSON()

      expect(json.amount).toBe("0.00")
    })

    it("should handle negative amounts", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: -5000n, decimals: 2n }, // -$50.00
      })

      const json = money.toJSON()

      expect(json.amount).toBe("-50.00")
    })

    it("should work with JSON.stringify", () => {
      const money = new Money({
        asset: { name: "Test", code: "TST", decimals: 2n },
        amount: { amount: 100n, decimals: 2n },
      })

      const jsonString = JSON.stringify(money)
      const parsed = JSON.parse(jsonString)

      expect(parsed.currency.decimals).toBe("2")
      expect(parsed.amount).toBe("1.00")
    })
  })

  describe("compare", () => {
    it("should return -1 when this money is less than other", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n }, // $50.00
      })
      const money2 = new Money(usdAmount) // $100.50

      expect(money1.compare(money2)).toBe(-1)
    })

    it("should return 1 when this money is greater than other", () => {
      const money1 = new Money(usdAmount) // $100.50
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n }, // $50.00
      })

      expect(money1.compare(money2)).toBe(1)
    })

    it("should return 0 when money instances are equal", () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money(usdAmount)

      expect(money1.compare(money2)).toBe(0)
    })

    it("should return 0 for equivalent amounts with different precision", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 1000n, decimals: 2n }, // $10.00
      })
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 10000n, decimals: 3n }, // $10.000
      })

      expect(money1.compare(money2)).toBe(0)
    })

    it("should work with string representations", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n }, // $50.00
      })

      expect(money.compare("$100.00")).toBe(-1)
      expect(money.compare("$25.00")).toBe(1)
      expect(money.compare("$50.00")).toBe(0)
    })

    it("should work with AssetAmount", () => {
      const money = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n }, // $50.00
      })
      const assetAmount: AssetAmount = {
        asset: usdCurrency,
        amount: { amount: 7500n, decimals: 2n }, // $75.00
      }

      expect(money.compare(assetAmount)).toBe(-1)
    })

    it("should throw error when comparing different currencies", () => {
      const usdMoney = new Money(usdAmount)
      const eurMoney = new Money(eurAmount)

      expect(() => usdMoney.compare(eurMoney)).toThrow(
        "Cannot compare Money with different asset types"
      )
    })

    it("should work for sorting arrays", () => {
      const amounts = [
        new Money({ asset: usdCurrency, amount: { amount: 10000n, decimals: 2n } }), // $100.00
        new Money({ asset: usdCurrency, amount: { amount: 5000n, decimals: 2n } }),  // $50.00
        new Money({ asset: usdCurrency, amount: { amount: 7500n, decimals: 2n } }),  // $75.00
      ]

      const sorted = amounts.sort((a, b) => a.compare(b))

      expect(sorted[0].balance.amount.amount).toBe(5000n)  // $50.00
      expect(sorted[1].balance.amount.amount).toBe(7500n)  // $75.00
      expect(sorted[2].balance.amount.amount).toBe(10000n) // $100.00
    })
  })

  describe("equals", () => {
    it("should return true for Money instances with same asset and amount", () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money(usdAmount)

      expect(money1.equals(money2)).toBe(true)
    })

    it("should return false for Money instances with different assets", () => {
      const usdMoney = new Money(usdAmount)
      const eurMoney = new Money(eurAmount)

      expect(usdMoney.equals(eurMoney)).toBe(false)
    })

    it("should return false for Money instances with different amounts", () => {
      const money1 = new Money(usdAmount) // $100.50
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 5000n, decimals: 2n }, // $50.00
      })

      expect(money1.equals(money2)).toBe(false)
    })

    it("should return true for equivalent amounts with different precision", () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 1000n, decimals: 2n }, // $10.00
      })
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 10000n, decimals: 3n }, // $10.000
      })

      expect(money1.equals(money2)).toBe(true)
    })
  })

  describe("fromJSON", () => {
    it("should round-trip correctly with Currency", () => {
      const original = new Money(usdAmount) // $100.50
      const json = original.toJSON()
      const restored = Money.fromJSON(json)

      expect(restored.equals(original)).toBe(true)
    })

    it("should round-trip correctly with FungibleAsset", () => {
      const btcAsset = {
        name: "Bitcoin",
        code: "BTC",
        decimals: 8n,
        fractionalUnit: "satoshi",
      }
      const original = new Money({
        asset: btcAsset,
        amount: { amount: 100000000n, decimals: 8n }, // 1.00000000 BTC
      })

      const json = original.toJSON()
      const restored = Money.fromJSON(json)

      expect(restored.equals(original)).toBe(true)
    })

    it("should round-trip correctly with basic Asset", () => {
      const basicAsset = { name: "Basic Asset" }
      const original = new Money({
        asset: basicAsset,
        amount: { amount: 1000n, decimals: 0n },
      })

      const json = original.toJSON()
      const restored = Money.fromJSON(json)

      expect(restored.equals(original)).toBe(true)
    })

    it("should handle FungibleAsset with fractionalUnit array", () => {
      const btcAsset = {
        name: "Bitcoin",
        code: "BTC",
        decimals: 8n,
        fractionalUnit: ["satoshi", "sat"],
      }
      const original = new Money({
        asset: btcAsset,
        amount: { amount: 50000000n, decimals: 8n },
      })

      const json = original.toJSON()
      const restored = Money.fromJSON(json)

      expect(restored.equals(original)).toBe(true)
    })

    it("should handle FungibleAsset with fractionalUnit Record", () => {
      const btcAsset = {
        name: "Bitcoin",
        code: "BTC",
        decimals: 8n,
        fractionalUnit: {
          8: ["satoshi", "sat"],
          12: ["millisatoshi", "millisat"],
        },
      }
      const original = new Money({
        asset: btcAsset,
        amount: { amount: 21000000n, decimals: 8n },
      })

      const json = original.toJSON()
      const restored = Money.fromJSON(json)

      expect(restored.equals(original)).toBe(true)
    })

    it("should work with JSON.stringify/parse round-trip", () => {
      const original = new Money(usdAmount)
      const jsonString = JSON.stringify(original)
      const parsed = JSON.parse(jsonString)
      const restored = Money.fromJSON(parsed)

      expect(restored.equals(original)).toBe(true)
    })

    it("should handle zero amounts", () => {
      const original = new Money({
        asset: usdCurrency,
        amount: { amount: 0n, decimals: 2n },
      })

      const json = original.toJSON()
      const restored = Money.fromJSON(json)

      expect(restored.equals(original)).toBe(true)
    })

    it("should handle negative amounts", () => {
      const original = new Money({
        asset: usdCurrency,
        amount: { amount: -5000n, decimals: 2n },
      })

      const json = original.toJSON()
      const restored = Money.fromJSON(json)

      expect(restored.equals(original)).toBe(true)
    })

    it("should throw error for missing asset field", () => {
      const json = {
        amount: { amount: "100", decimals: "2" },
      }

      expect(() => Money.fromJSON(json)).toThrow()
    })

    it("should throw error for missing amount field", () => {
      const json = {
        asset: { name: "Test", code: "TST", decimals: "2" },
      }

      expect(() => Money.fromJSON(json)).toThrow()
    })

    it("should throw error for invalid asset structure", () => {
      const json = {
        currency: { code: "TST", decimals: "2" }, // missing name
        amount: { amount: "100", decimals: "2" },
      }

      expect(() => Money.fromJSON(json)).toThrow()
    })

    it("should throw error for invalid amount structure", () => {
      const json = {
        currency: { name: "Test", code: "TST", decimals: "2" },
        amount: { amount: 100, decimals: "2" }, // amount should be string
      }

      expect(() => Money.fromJSON(json)).toThrow()
    })

    it("should throw error for null input", () => {
      expect(() => Money.fromJSON(null)).toThrow()
    })

    it("should throw error for undefined input", () => {
      expect(() => Money.fromJSON(undefined)).toThrow()
    })
  })

  describe("MoneyJSONSchema", () => {
    it("should be exported and usable independently", () => {
      const validData = {
        currency: { name: "Test", code: "TST", decimals: "2" },
        amount: "1.00",
      }
      const parsed = MoneyJSONSchema.parse(validData)

      expect(parsed).toEqual(validData)
    })

    it("should validate data independently of fromJSON", () => {
      const invalidData = {
        asset: { name: "Test" },
        amount: { amount: 100, decimals: "2" }, // amount should be string
      }

      expect(() => MoneyJSONSchema.parse(invalidData)).toThrow()
    })
  })

  describe("toString", () => {
    // Test currencies
    const usd: Currency = {
      name: "US Dollar",
      code: "USD",
      decimals: 2n,
      symbol: "$",
      fractionalUnit: "cent",
      iso4217Support: true,
    }

    const btc: Currency = {
      name: "Bitcoin",
      code: "BTC",
      decimals: 8n,
      symbol: "₿",
      fractionalUnit: {
        8: ["satoshi", "sat"],
        11: ["millisatoshi", "msat"],
      },
      iso4217Support: false,
    }

    describe("basic functionality", () => {
      it("should format USD using ISO 4217 by default", () => {
        const money = new Money({
          asset: usd,
          amount: { amount: 100n, decimals: 1n }, // $10.0
        })

        const result = money.toString()
        expect(result).toBe("$10.00") // Should default to asset decimals (2) and en-US locale
      })

      it("should format BTC using custom formatting by default", () => {
        const money = new Money({
          asset: btc,
          amount: { amount: 10n, decimals: 1n }, // 1.0 BTC
        })

        const result = money.toString()
        expect(result).toBe("1 BTC") // Should use custom formatting
      })
    })

    describe("locale options", () => {
      it("should handle different locales for ISO currencies", () => {
        const money = new Money({
          asset: usd,
          amount: { amount: 123456n, decimals: 2n }, // $1234.56
        })

        expect(money.toString({ locale: "en-US" })).toBe("$1,234.56")
        expect(money.toString({ locale: "de-DE" })).toBe("1.234,56\u00A0$")
      })

      it("should handle underscore locale format", () => {
        const money = new Money({
          asset: usd,
          amount: { amount: 123456n, decimals: 2n },
        })

        // Should convert en_US to en-US internally
        expect(money.toString({ locale: "en_US" })).toBe("$1,234.56")
      })
    })

    describe("compact notation", () => {
      it("should format large amounts compactly for ISO currencies", () => {
        const money = new Money({
          asset: usd,
          amount: { amount: 100000000n, decimals: 2n }, // $1,000,000.00
        })

        expect(money.toString({ compact: true })).toBe("$1M")
      })

      it("should format large amounts compactly for non-ISO currencies", () => {
        const money = new Money({
          asset: btc,
          amount: { amount: 100000000n, decimals: 8n }, // 1.0 BTC
        })

        expect(money.toString({ compact: true })).toBe("1 BTC")
      })
    })

    describe("maxDecimals option", () => {
      it("should limit decimal places for ISO currencies", () => {
        const money = new Money({
          asset: usd,
          amount: { amount: 12345n, decimals: 2n }, // $123.45
        })

        expect(money.toString({ maxDecimals: 1 })).toBe("$123.5")
        expect(money.toString({ maxDecimals: 0 })).toBe("$123")
      })

      it("should limit decimal places for non-ISO currencies", () => {
        const money = new Money({
          asset: btc,
          amount: { amount: 12345678n, decimals: 8n }, // 0.12345678 BTC
        })

        expect(money.toString({ maxDecimals: 4 })).toBe("0.1235 BTC")
        expect(money.toString({ maxDecimals: 2 })).toBe("0.12 BTC")
      })
    })

    describe("preferredUnit option", () => {
      it("should convert to satoshis when requested", () => {
        const money = new Money({
          asset: btc,
          amount: { amount: 100000000n, decimals: 8n }, // 1.0 BTC
        })

        expect(money.toString({ preferredUnit: "satoshi" })).toBe(
          "100,000,000 satoshis",
        )
        expect(money.toString({ preferredUnit: "sat" })).toBe(
          "100,000,000 sats",
        )
      })

      it("should convert to millisatoshis when requested", () => {
        const money = new Money({
          asset: btc,
          amount: { amount: 100000000n, decimals: 8n }, // 1.0 BTC
        })

        expect(money.toString({ preferredUnit: "msat" })).toBe(
          "100,000,000,000 msats",
        )
      })

      it("should use singular unit name when amount is exactly 1", () => {
        const money = new Money({
          asset: btc,
          amount: { amount: 1n, decimals: 8n }, // 1 satoshi
        })

        expect(money.toString({ preferredUnit: "satoshi" })).toBe("1 satoshi")
      })

      it("should ignore preferredUnit for ISO currencies", () => {
        const money = new Money({
          asset: usd,
          amount: { amount: 10050n, decimals: 2n }, // $100.50
        })

        // preferredUnit should be ignored for ISO currencies
        expect(money.toString({ preferredUnit: "cent" })).toBe("$100.50")
      })
    })

    describe("preferSymbol option", () => {
      it("should not affect ISO currencies", () => {
        const money = new Money({
          asset: usd,
          amount: { amount: 10050n, decimals: 2n }, // $100.50
        })

        // ISO currencies already use proper symbol formatting
        expect(money.toString({ preferSymbol: true })).toBe("$100.50")
        expect(money.toString({ preferSymbol: false })).toBe("$100.50")
      })

      it("should prefer symbol over code for non-ISO currencies", () => {
        const money = new Money({
          asset: btc,
          amount: { amount: 10n, decimals: 1n }, // 1.0 BTC
        })

        expect(money.toString({ preferSymbol: true })).toBe("₿1")
        expect(money.toString({ preferSymbol: false })).toBe("1 BTC")
      })

      it("should not use symbol when preferredUnit is specified", () => {
        const money = new Money({
          asset: btc,
          amount: { amount: 100000000n, decimals: 8n }, // 1.0 BTC
        })

        // When using preferredUnit, symbol should not be used
        expect(
          money.toString({ preferSymbol: true, preferredUnit: "sat" }),
        ).toBe("100,000,000 sats")
      })
    })

    describe("roundingMode option", () => {
      it("should use different rounding modes for ISO currencies", () => {
        const money = new Money({
          asset: usd,
          amount: { amount: 12567n, decimals: 2n }, // $125.67
        })

        // Test with maxDecimals to force rounding
        expect(
          money.toString({ maxDecimals: 1, roundingMode: HALF_EXPAND }),
        ).toBe("$125.7")
        expect(
          money.toString({ maxDecimals: 1, roundingMode: HALF_EVEN }),
        ).toBe("$125.7")
        expect(money.toString({ maxDecimals: 1, roundingMode: CEIL })).toBe(
          "$125.7",
        )
        expect(money.toString({ maxDecimals: 1, roundingMode: FLOOR })).toBe(
          "$125.6",
        )
      })

      it("should use different rounding modes for non-ISO currencies", () => {
        const money = new Money({
          asset: btc,
          amount: { amount: 12567n, decimals: 4n }, // 1.2567 BTC (using 4 decimals for easier testing)
        })

        // Test with maxDecimals to force rounding
        expect(
          money.toString({ maxDecimals: 3, roundingMode: HALF_EXPAND }),
        ).toBe("1.257 BTC")
        expect(
          money.toString({ maxDecimals: 3, roundingMode: HALF_EVEN }),
        ).toBe("1.257 BTC")
        expect(money.toString({ maxDecimals: 3, roundingMode: CEIL })).toBe(
          "1.257 BTC",
        )
        expect(money.toString({ maxDecimals: 3, roundingMode: FLOOR })).toBe(
          "1.256 BTC",
        )
      })

      it("should work with enum values", () => {
        const money = new Money({
          asset: usd,
          amount: { amount: 12565n, decimals: 2n }, // $125.65
        })

        expect(
          money.toString({
            maxDecimals: 1,
            roundingMode: RoundingMode.HALF_EXPAND,
          }),
        ).toBe("$125.7")
        expect(
          money.toString({
            maxDecimals: 1,
            roundingMode: RoundingMode.HALF_EVEN,
          }),
        ).toBe("$125.6")
      })

      it("should work without roundingMode (using default)", () => {
        const money = new Money({
          asset: usd,
          amount: { amount: 12565n, decimals: 2n }, // $125.65
        })

        // Should work without specifying roundingMode
        expect(money.toString({ maxDecimals: 1 })).toBe("$125.7") // Default behavior
      })
    })

    describe("minDecimals option", () => {
      it("should preserve current default behavior when minDecimals is not specified", () => {
        const usdMoney = new Money({
          asset: usd,
          amount: { amount: 1n, decimals: 0n }, // $1
        })
        const btcMoney = new Money({
          asset: btc,
          amount: { amount: 100000000n, decimals: 8n }, // 1.00000000 BTC
        })

        // Default behavior should be unchanged
        expect(usdMoney.toString()).toBe("$1.00") // ISO currency shows currency default decimals
        expect(btcMoney.toString()).toBe("1 BTC") // Non-ISO currency shows minimal decimals
      })

      it("should force trailing zeros for ISO currencies when minDecimals is specified", () => {
        const money = new Money({
          asset: usd,
          amount: { amount: 1n, decimals: 0n }, // $1
        })

        expect(money.toString({ minDecimals: 0 })).toBe("$1")
        expect(money.toString({ minDecimals: 1 })).toBe("$1.0")
        expect(money.toString({ minDecimals: 2 })).toBe("$1.00")
        expect(money.toString({ minDecimals: 3 })).toBe("$1.000")
      })

      it("should force trailing zeros for non-ISO currencies when minDecimals is specified", () => {
        const money = new Money({
          asset: btc,
          amount: { amount: 100000000n, decimals: 8n }, // 1.00000000 BTC
        })

        expect(money.toString({ minDecimals: 0 })).toBe("1 BTC")
        expect(money.toString({ minDecimals: 2 })).toBe("1.00 BTC")
        expect(money.toString({ minDecimals: 4 })).toBe("1.0000 BTC")
        expect(money.toString({ minDecimals: 8 })).toBe("1.00000000 BTC")
      })

      it("should work with amounts that already have sufficient decimals", () => {
        const money = new Money({
          asset: usd,
          amount: { amount: 12345n, decimals: 2n }, // $123.45
        })

        expect(money.toString({ minDecimals: 0 })).toBe("$123.45")
        expect(money.toString({ minDecimals: 1 })).toBe("$123.45")
        expect(money.toString({ minDecimals: 2 })).toBe("$123.45")
        expect(money.toString({ minDecimals: 3 })).toBe("$123.450")
      })

      it("should work in combination with maxDecimals", () => {
        const money = new Money({
          asset: btc,
          amount: { amount: 123456789n, decimals: 8n }, // 1.23456789 BTC
        })

        // minDecimals forces trailing zeros, maxDecimals limits precision
        expect(money.toString({ minDecimals: 2, maxDecimals: 4 })).toBe("1.2346 BTC")
        expect(money.toString({ minDecimals: 6, maxDecimals: 4 })).toBe("1.2346 BTC") // maxDecimals takes precedence
        expect(money.toString({ minDecimals: 2, maxDecimals: 8 })).toBe("1.23456789 BTC")
      })

      it("should handle zero amounts with minDecimals", () => {
        const usdMoney = new Money({
          asset: usd,
          amount: { amount: 0n, decimals: 2n }, // $0.00
        })
        const btcMoney = new Money({
          asset: btc,
          amount: { amount: 0n, decimals: 8n }, // 0.00000000 BTC
        })

        expect(usdMoney.toString({ minDecimals: 3 })).toBe("$0.000")
        expect(btcMoney.toString({ minDecimals: 4 })).toBe("0.0000 BTC")
      })

      it("should work with negative amounts", () => {
        const money = new Money({
          asset: usd,
          amount: { amount: -1n, decimals: 0n }, // -$1
        })

        expect(money.toString({ minDecimals: 2 })).toBe("-$1.00")
        expect(money.toString({ minDecimals: 3 })).toBe("-$1.000")
      })

      it("should work with preferredUnit option for cryptocurrencies", () => {
        const money = new Money({
          asset: btc,
          amount: { amount: 100000000n, decimals: 8n }, // 1.00000000 BTC
        })

        expect(money.toString({ minDecimals: 0, preferredUnit: "satoshi" })).toBe("100,000,000 satoshis")
        expect(money.toString({ minDecimals: 2, preferredUnit: "satoshi" })).toBe("100,000,000.00 satoshis")
      })
    })
  })

  describe("formatting utility functions", () => {
    describe("shouldUseIsoFormatting", () => {
      it("should return true for currencies with iso4217Support: true", () => {
        expect(shouldUseIsoFormatting({ iso4217Support: true })).toBe(true)
      })

      it("should return false for currencies with iso4217Support: false", () => {
        expect(shouldUseIsoFormatting({ iso4217Support: false })).toBe(false)
      })

      it("should return false for currencies without iso4217Support", () => {
        expect(shouldUseIsoFormatting({})).toBe(false)
        expect(shouldUseIsoFormatting({ code: "XYZ" })).toBe(false)
      })
    })

    describe("normalizeLocale", () => {
      it("should convert underscore to hyphen", () => {
        expect(normalizeLocale("en_US")).toBe("en-US")
        expect(normalizeLocale("de_DE")).toBe("de-DE")
      })

      it("should leave valid locales unchanged", () => {
        expect(normalizeLocale("en-US")).toBe("en-US")
        expect(normalizeLocale("fr-FR")).toBe("fr-FR")
      })
    })

    describe("findFractionalUnitInfo", () => {
      it("should find unit in string format", () => {
        const result = findFractionalUnitInfo("satoshi", "satoshi", 8)
        expect(result).toEqual({ decimals: 8, name: "satoshi" })
      })

      it("should find unit in array format", () => {
        const result = findFractionalUnitInfo(["satoshi", "sat"], "sat", 8)
        expect(result).toEqual({ decimals: 8, name: "satoshi" })
      })

      it("should find unit in record format", () => {
        const fractionalUnit = {
          8: ["satoshi", "sat"],
          11: ["millisatoshi", "msat"],
        }

        const result1 = findFractionalUnitInfo(fractionalUnit, "sat", 8)
        expect(result1).toEqual({ decimals: 8, name: "satoshi" })

        const result2 = findFractionalUnitInfo(fractionalUnit, "msat", 8)
        expect(result2).toEqual({ decimals: 11, name: "millisatoshi" })
      })

      it("should return null for unknown units", () => {
        expect(findFractionalUnitInfo("satoshi", "unknown", 8)).toBeNull()
        expect(
          findFractionalUnitInfo(["satoshi", "sat"], "unknown", 8),
        ).toBeNull()
      })
    })

    describe("getCurrencyDisplayPart", () => {
      it("should return unit suffix when provided", () => {
        expect(getCurrencyDisplayPart({ code: "BTC" }, false, "sat")).toBe(
          " sat",
        )
      })

      it("should return empty string for preferSymbol when no unitSuffix", () => {
        expect(getCurrencyDisplayPart({ symbol: "₿" }, true)).toBe("")
      })

      it("should return currency code when available", () => {
        expect(getCurrencyDisplayPart({ code: "BTC" }, false)).toBe(" BTC")
      })

      it("should return empty string when no code available", () => {
        expect(getCurrencyDisplayPart({}, false)).toBe("")
      })
    })

    describe("pluralizeFractionalUnit", () => {
      it("should return singular for amount of 1", () => {
        // This is handled in convertToPreferredUnit, but let's test the pluralize function directly
        expect(pluralizeFractionalUnit("satoshi")).toBe("satoshis")
        expect(pluralizeFractionalUnit("cent")).toBe("cents")
      })

      it("should handle irregular plurals", () => {
        expect(pluralizeFractionalUnit("penny")).toBe("pence")
        expect(pluralizeFractionalUnit("kopek")).toBe("kopeks")
        expect(pluralizeFractionalUnit("grosz")).toBe("groszy")
        expect(pluralizeFractionalUnit("fils")).toBe("fils") // Already plural
        expect(pluralizeFractionalUnit("sen")).toBe("sen") // Already plural
      })

      it("should handle words ending in y", () => {
        expect(pluralizeFractionalUnit("penny")).toBe("pence") // Irregular, handled above
        expect(pluralizeFractionalUnit("currency")).toBe("currencies")
      })

      it("should handle words ending in s, sh, ch, x, z", () => {
        expect(pluralizeFractionalUnit("piastres")).toBe("piastreses")
        expect(pluralizeFractionalUnit("bash")).toBe("bashes")
        expect(pluralizeFractionalUnit("inch")).toBe("inches")
        expect(pluralizeFractionalUnit("box")).toBe("boxes")
        expect(pluralizeFractionalUnit("quiz")).toBe("quizzes")
      })

      it("should handle regular plurals", () => {
        expect(pluralizeFractionalUnit("satoshi")).toBe("satoshis")
        expect(pluralizeFractionalUnit("cent")).toBe("cents")
        expect(pluralizeFractionalUnit("dollar")).toBe("dollars")
        expect(pluralizeFractionalUnit("euro")).toBe("euros")
      })
    })
  })

  describe("String argument support", () => {
    const usd100 = new Money({
      asset: usdCurrency,
      amount: { amount: 10000n, decimals: 2n }, // $100.00
    })

    const usd25 = new Money({
      asset: usdCurrency,
      amount: { amount: 2500n, decimals: 2n }, // $25.00
    })

    describe("add", () => {
      it("should add string currency amounts", () => {
        const result = usd100.add("$25.00")
        expect(
          result.equals(
            new Money({
              asset: usdCurrency,
              amount: { amount: 12500n, decimals: 2n }, // $125.00
            }),
          ),
        ).toBe(true)
      })

      it("should add string amounts with different formats", () => {
        const result = usd100.add("USD 25")
        expect(
          result.equals(
            new Money({
              asset: usdCurrency,
              amount: { amount: 12500n, decimals: 2n }, // $125.00
            }),
          ),
        ).toBe(true)
      })

      it("should throw on currency mismatch", () => {
        expect(() => usd100.add("€25.00")).toThrow("Currency mismatch")
      })

      it("should handle negative string amounts", () => {
        const result = usd100.add("-$25.00")
        expect(
          result.equals(
            new Money({
              asset: usdCurrency,
              amount: { amount: 7500n, decimals: 2n }, // $75.00
            }),
          ),
        ).toBe(true)
      })
    })

    describe("subtract", () => {
      it("should subtract string currency amounts", () => {
        const result = usd100.subtract("$25.00")
        expect(
          result.equals(
            new Money({
              asset: usdCurrency,
              amount: { amount: 7500n, decimals: 2n }, // $75.00
            }),
          ),
        ).toBe(true)
      })

      it("should subtract string amounts with currency codes", () => {
        const result = usd100.subtract("USD 25")
        expect(
          result.equals(
            new Money({
              asset: usdCurrency,
              amount: { amount: 7500n, decimals: 2n }, // $75.00
            }),
          ),
        ).toBe(true)
      })

      it("should throw on currency mismatch", () => {
        expect(() => usd100.subtract("€25.00")).toThrow("Currency mismatch")
      })
    })

    describe("equals", () => {
      it("should compare with string amounts", () => {
        expect(usd100.equals("$100.00")).toBe(true)
        expect(usd100.equals("USD 100")).toBe(true)
        expect(usd100.equals("$100.01")).toBe(false)
      })

      it("should handle high precision comparisons", () => {
        const precise = new Money({
          asset: usdCurrency,
          amount: { amount: 10012345n, decimals: 5n }, // $100.12345
        })
        expect(precise.equals("$100.12345")).toBe(true)
        expect(precise.equals("$100.12346")).toBe(false)
      })

      it("should throw on currency mismatch", () => {
        expect(() => usd100.equals("€100.00")).toThrow("Currency mismatch")
      })
    })

    describe("lessThan", () => {
      it("should compare with string amounts", () => {
        expect(usd25.lessThan("$100.00")).toBe(true)
        expect(usd100.lessThan("$25.00")).toBe(false)
        expect(usd100.lessThan("$100.00")).toBe(false)
      })

      it("should throw on currency mismatch", () => {
        expect(() => usd100.lessThan("€100.00")).toThrow("Currency mismatch")
      })
    })

    describe("lessThanOrEqual", () => {
      it("should compare with string amounts", () => {
        expect(usd25.lessThanOrEqual("$100.00")).toBe(true)
        expect(usd100.lessThanOrEqual("$100.00")).toBe(true)
        expect(usd100.lessThanOrEqual("$25.00")).toBe(false)
      })

      it("should throw on currency mismatch", () => {
        expect(() => usd100.lessThanOrEqual("€100.00")).toThrow(
          "Currency mismatch",
        )
      })
    })

    describe("greaterThan", () => {
      it("should compare with string amounts", () => {
        expect(usd100.greaterThan("$25.00")).toBe(true)
        expect(usd25.greaterThan("$100.00")).toBe(false)
        expect(usd100.greaterThan("$100.00")).toBe(false)
      })

      it("should throw on currency mismatch", () => {
        expect(() => usd100.greaterThan("€25.00")).toThrow("Currency mismatch")
      })
    })

    describe("greaterThanOrEqual", () => {
      it("should compare with string amounts", () => {
        expect(usd100.greaterThanOrEqual("$25.00")).toBe(true)
        expect(usd100.greaterThanOrEqual("$100.00")).toBe(true)
        expect(usd25.greaterThanOrEqual("$100.00")).toBe(false)
      })

      it("should throw on currency mismatch", () => {
        expect(() => usd100.greaterThanOrEqual("€25.00")).toThrow(
          "Currency mismatch",
        )
      })
    })

    describe("max", () => {
      it("should handle string arguments", () => {
        const result = usd25.max("$100.00")
        expect(result.equals(usd100)).toBe(true)
      })

      it("should handle array of strings", () => {
        const result = usd25.max(["$50.00", "$100.00", "$75.00"])
        expect(result.equals(usd100)).toBe(true)
      })

      it("should handle mixed string and Money arguments", () => {
        const result = usd25.max([usd100, "$75.00"])
        expect(result.equals(usd100)).toBe(true)
      })

      it("should throw on currency mismatch", () => {
        expect(() => usd100.max("€100.00")).toThrow("Currency mismatch")
      })
    })

    describe("min", () => {
      it("should handle string arguments", () => {
        const result = usd100.min("$25.00")
        expect(result.equals(usd25)).toBe(true)
      })

      it("should handle array of strings", () => {
        const result = usd100.min(["$50.00", "$25.00", "$75.00"])
        expect(result.equals(usd25)).toBe(true)
      })

      it("should handle mixed string and Money arguments", () => {
        const result = usd100.min([usd25, "$75.00"])
        expect(result.equals(usd25)).toBe(true)
      })

      it("should throw on currency mismatch", () => {
        expect(() => usd100.min("€25.00")).toThrow("Currency mismatch")
      })
    })

    describe("Edge cases and error handling", () => {
      it("should preserve Money instance when passed instead of string", () => {
        const result = usd100.add(usd25)
        expect(
          result.equals(
            new Money({
              asset: usdCurrency,
              amount: { amount: 12500n, decimals: 2n }, // $125.00
            }),
          ),
        ).toBe(true)
      })

      it("should handle invalid string formats", () => {
        expect(() => usd100.add("invalid string")).toThrow(
          "Invalid money string format",
        )
      })

      it("should handle unknown currency codes", () => {
        expect(() => usd100.add("INVALID 100")).toThrow(
          "Invalid money string format",
        )
      })

      it("should handle cryptocurrency strings", () => {
        // This would need BTC currency setup - placeholder for now
        // expect(() => usd100.add('1000 sat')).toThrow('Currency mismatch')
      })
    })
  })
})
