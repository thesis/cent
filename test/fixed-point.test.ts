import { FixedPointNumber, FixedPointJSONSchema } from '../src/fixed-point'

describe('FixedPointNumber', () => {
  describe('constructor', () => {
    it('should create a FixedPointNumber with the provided values', () => {
      const fp = new FixedPointNumber(123n, 2n)
      expect(fp.amount).toBe(123n)
      expect(fp.decimals).toBe(2n)
    })

    it('should create a FixedPointNumber with default values when none are provided', () => {
      const fp = new FixedPointNumber()
      expect(fp.amount).toBe(0n)
      expect(fp.decimals).toBe(0n)
    })
  })

  describe('add', () => {
    it('should add two FixedPointNumbers with the same decimals', () => {
      const fp1 = new FixedPointNumber(123n, 2n)
      const fp2 = new FixedPointNumber(456n, 2n)
      const result = fp1.add(fp2)

      expect(result.amount).toBe(579n)
      expect(result.decimals).toBe(2n)
    })

    it('should add numbers with different decimals by normalizing to higher precision', () => {
      const fp1 = new FixedPointNumber(123n, 2n) // 1.23
      const fp2 = new FixedPointNumber(456n, 3n) // 0.456
      const result = fp1.add(fp2)

      expect(result.amount).toBe(1686n) // 1230 + 456 = 1686 (in 3 decimal places)
      expect(result.decimals).toBe(3n)
    })

    it('should handle adding zero', () => {
      const fp = new FixedPointNumber(123n, 2n)
      const zero = new FixedPointNumber(0n, 2n)
      const result = fp.add(zero)

      expect(result.amount).toBe(123n)
      expect(result.decimals).toBe(2n)
    })

    it('should add any FixedPoint-compatible object', () => {
      const fp = new FixedPointNumber()
      const result = fp.add({ amount: 2n, decimals: 0n })

      expect(result.amount).toBe(2n)
      expect(result.decimals).toBe(0n)
      expect(result.equals({ amount: 2n, decimals: 0n })).toBe(true)
    })
  })

  describe('subtract', () => {
    it('should subtract two FixedPointNumbers with the same decimals', () => {
      const fp1 = new FixedPointNumber(456n, 2n)
      const fp2 = new FixedPointNumber(123n, 2n)
      const result = fp1.subtract(fp2)

      expect(result.amount).toBe(333n)
      expect(result.decimals).toBe(2n)
    })

    it('should subtract numbers with different decimals by normalizing to higher precision', () => {
      const fp1 = new FixedPointNumber(456n, 2n) // 4.56
      const fp2 = new FixedPointNumber(123n, 3n) // 0.123
      const result = fp1.subtract(fp2)

      expect(result.amount).toBe(4437n) // 4560 - 123 = 4437 (in 3 decimal places)
      expect(result.decimals).toBe(3n)
    })
  })

  describe('multiply', () => {
    it('should multiply by a bigint', () => {
      const fp = new FixedPointNumber(123n, 2n)
      const result = fp.multiply(2n)

      expect(result.amount).toBe(246n)
      expect(result.decimals).toBe(2n)
    })

    it('should multiply two FixedPointNumbers with the same decimals', () => {
      const fp1 = new FixedPointNumber(123n, 2n) // 1.23
      const fp2 = new FixedPointNumber(234n, 2n) // 2.34
      const result = fp1.multiply(fp2)

      // 1.23 * 2.34 = 2.8782, which would be 287n with 2 decimals (rounded down)
      expect(result.amount).toBe(287n)
      expect(result.decimals).toBe(2n)
    })

    it('should multiply FixedPoints with different decimals by normalizing to higher precision', () => {
      const fp1 = new FixedPointNumber(123n, 2n) // 1.23
      const fp2 = new FixedPointNumber(234n, 3n) // 0.234
      const result = fp1.multiply(fp2)

      // 1.23 * 0.234 = 0.28782, normalized to 3 decimals = 287n (truncated)
      expect(result.amount).toBe(287n)
      expect(result.decimals).toBe(3n)
    })
  })

  describe('toString', () => {
    it('should convert a whole number to string', () => {
      const fp = new FixedPointNumber(123n, 0n)
      expect(fp.toString()).toBe('123')
    })

    it('should convert a decimal number to string', () => {
      const fp = new FixedPointNumber(12345n, 2n)
      expect(fp.toString()).toBe('123.45')
    })

    it('should handle zero', () => {
      const fp = new FixedPointNumber(0n, 2n)
      expect(fp.toString()).toBe('0.00')
    })

    it('should handle leading zeros in fractional part', () => {
      const fp = new FixedPointNumber(1005n, 3n)
      expect(fp.toString()).toBe('1.005')
    })
  })

  describe('parseString', () => {
    it('should parse a whole number', () => {
      const fp = FixedPointNumber.parseString('123', 0n)
      expect(fp.amount).toBe(123n)
      expect(fp.decimals).toBe(0n)
    })

    it('should parse a decimal number with exact decimal places', () => {
      const fp = FixedPointNumber.parseString('123.45', 2n)
      expect(fp.amount).toBe(12345n)
      expect(fp.decimals).toBe(2n)
    })

    it('should parse a decimal number with fewer decimal places than specified', () => {
      const fp = FixedPointNumber.parseString('123.4', 2n)
      expect(fp.amount).toBe(12340n)
      expect(fp.decimals).toBe(2n)
    })

    it('should parse a decimal number with more decimal places than specified (truncating)', () => {
      const fp = FixedPointNumber.parseString('123.456', 2n)
      expect(fp.amount).toBe(12345n) // Truncated to 2 decimal places
      expect(fp.decimals).toBe(2n)
    })

    it('should throw an error for invalid number format', () => {
      expect(() => FixedPointNumber.parseString('123.', 2n)).toThrow('Invalid number format')
      expect(() => FixedPointNumber.parseString('.123', 2n)).toThrow('Invalid number format')
      expect(() => FixedPointNumber.parseString('abc', 2n)).toThrow('Invalid number format')
    })
  })

  describe('equals', () => {
    it('should return true for identical FixedPointNumbers', () => {
      const fp1 = new FixedPointNumber(123n, 2n)
      const fp2 = new FixedPointNumber(123n, 2n)
      expect(fp1.equals(fp2)).toBe(true)
    })

    it('should return false for FixedPointNumbers with different amounts but same decimals', () => {
      const fp1 = new FixedPointNumber(123n, 2n)
      const fp2 = new FixedPointNumber(124n, 2n)
      expect(fp1.equals(fp2)).toBe(false)
    })

    it('should return true for equivalent FixedPointNumbers with different decimal places', () => {
      const fp1 = new FixedPointNumber(123n, 2n)  // 1.23
      const fp2 = new FixedPointNumber(1230n, 3n) // 1.230
      expect(fp1.equals(fp2)).toBe(true)
    })

    it('should return false for non-equivalent FixedPointNumbers with different decimal places', () => {
      const fp1 = new FixedPointNumber(123n, 2n)  // 1.23
      const fp2 = new FixedPointNumber(1231n, 3n) // 1.231
      expect(fp1.equals(fp2)).toBe(false)
    })

    it('should work with FixedPoint-compatible objects', () => {
      const fp = new FixedPointNumber(123n, 2n)
      expect(fp.equals({ amount: 123n, decimals: 2n })).toBe(true)
      expect(fp.equals({ amount: 1230n, decimals: 3n })).toBe(true)
      expect(fp.equals({ amount: 124n, decimals: 2n })).toBe(false)
    })
  })

  describe('normalize', () => {
    it('should return a copy when decimal places are the same', () => {
      const fp1 = new FixedPointNumber(123n, 2n)
      const fp2 = new FixedPointNumber(456n, 2n)
      const result = fp1.normalize(fp2)

      expect(result.amount).toBe(123n)
      expect(result.decimals).toBe(2n)
      expect(result).not.toBe(fp1) // Should be a new instance
    })

    it('should scale up when normalizing to higher decimal places', () => {
      const fp1 = new FixedPointNumber(10n, 1n) // 1.0
      const fp2 = new FixedPointNumber(0n, 2n)  // Target 2 decimals
      const result = fp1.normalize(fp2)

      expect(result.amount).toBe(100n) // 10 * 10^(2-1) = 100
      expect(result.decimals).toBe(2n)
    })

    it('should scale down when normalizing to lower decimal places', () => {
      const fp1 = new FixedPointNumber(1000n, 3n) // 1.000
      const fp2 = new FixedPointNumber(0n, 1n)    // Target 1 decimal
      const result = fp1.normalize(fp2)

      expect(result.amount).toBe(10n) // 1000 / 10^(3-1) = 10
      expect(result.decimals).toBe(1n)
    })

    it('should work with the example from the user request', () => {
      const fp = new FixedPointNumber(10n, 1n)
      const target = { amount: 0n, decimals: 2n }
      const result = fp.normalize(target)

      expect(result.amount).toBe(100n)
      expect(result.decimals).toBe(2n)
    })

    it('should work with FixedPoint-compatible objects', () => {
      const fp = new FixedPointNumber(123n, 2n)
      const result = fp.normalize({ amount: 456n, decimals: 3n })

      expect(result.amount).toBe(1230n) // 123 * 10^(3-2) = 1230
      expect(result.decimals).toBe(3n)
    })
  })

  describe('isZero', () => {
    it('should return true for zero amounts', () => {
      const zero = new FixedPointNumber(0n, 2n)
      expect(zero.isZero()).toBe(true)
    })

    it('should return false for non-zero amounts', () => {
      const nonZero = new FixedPointNumber(100n, 2n)
      expect(nonZero.isZero()).toBe(false)
    })

    it('should return true for zero regardless of decimals', () => {
      const zeroNoDecimals = new FixedPointNumber(0n, 0n)
      const zeroWithDecimals = new FixedPointNumber(0n, 5n)
      
      expect(zeroNoDecimals.isZero()).toBe(true)
      expect(zeroWithDecimals.isZero()).toBe(true)
    })
  })

  describe('lessThan', () => {
    it('should return true when this number is less than other with same decimals', () => {
      const fp1 = new FixedPointNumber(100n, 2n) // 1.00
      const fp2 = new FixedPointNumber(200n, 2n) // 2.00
      
      expect(fp1.lessThan(fp2)).toBe(true)
      expect(fp2.lessThan(fp1)).toBe(false)
    })

    it('should return false when numbers are equal', () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)
      
      expect(fp1.lessThan(fp2)).toBe(false)
    })

    it('should handle different decimal places', () => {
      const fp1 = new FixedPointNumber(100n, 2n)  // 1.00
      const fp2 = new FixedPointNumber(1500n, 3n) // 1.500
      
      expect(fp1.lessThan(fp2)).toBe(true)
      expect(fp2.lessThan(fp1)).toBe(false)
    })

    it('should work with FixedPoint-compatible objects', () => {
      const fp = new FixedPointNumber(100n, 2n)
      
      expect(fp.lessThan({ amount: 200n, decimals: 2n })).toBe(true)
      expect(fp.lessThan({ amount: 50n, decimals: 2n })).toBe(false)
    })
  })

  describe('lessThanOrEqual', () => {
    it('should return true when this number is less than other', () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(200n, 2n)
      
      expect(fp1.lessThanOrEqual(fp2)).toBe(true)
    })

    it('should return true when numbers are equal', () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)
      
      expect(fp1.lessThanOrEqual(fp2)).toBe(true)
    })

    it('should return false when this number is greater than other', () => {
      const fp1 = new FixedPointNumber(200n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)
      
      expect(fp1.lessThanOrEqual(fp2)).toBe(false)
    })

    it('should handle equivalent numbers with different decimal places', () => {
      const fp1 = new FixedPointNumber(100n, 2n)  // 1.00
      const fp2 = new FixedPointNumber(1000n, 3n) // 1.000
      
      expect(fp1.lessThanOrEqual(fp2)).toBe(true)
      expect(fp2.lessThanOrEqual(fp1)).toBe(true)
    })
  })

  describe('greaterThan', () => {
    it('should return true when this number is greater than other with same decimals', () => {
      const fp1 = new FixedPointNumber(200n, 2n) // 2.00
      const fp2 = new FixedPointNumber(100n, 2n) // 1.00
      
      expect(fp1.greaterThan(fp2)).toBe(true)
      expect(fp2.greaterThan(fp1)).toBe(false)
    })

    it('should return false when numbers are equal', () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)
      
      expect(fp1.greaterThan(fp2)).toBe(false)
    })

    it('should handle different decimal places', () => {
      const fp1 = new FixedPointNumber(1500n, 3n) // 1.500
      const fp2 = new FixedPointNumber(100n, 2n)  // 1.00
      
      expect(fp1.greaterThan(fp2)).toBe(true)
      expect(fp2.greaterThan(fp1)).toBe(false)
    })

    it('should work with FixedPoint-compatible objects', () => {
      const fp = new FixedPointNumber(200n, 2n)
      
      expect(fp.greaterThan({ amount: 100n, decimals: 2n })).toBe(true)
      expect(fp.greaterThan({ amount: 300n, decimals: 2n })).toBe(false)
    })
  })

  describe('greaterThanOrEqual', () => {
    it('should return true when this number is greater than other', () => {
      const fp1 = new FixedPointNumber(200n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)
      
      expect(fp1.greaterThanOrEqual(fp2)).toBe(true)
    })

    it('should return true when numbers are equal', () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)
      
      expect(fp1.greaterThanOrEqual(fp2)).toBe(true)
    })

    it('should return false when this number is less than other', () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(200n, 2n)
      
      expect(fp1.greaterThanOrEqual(fp2)).toBe(false)
    })

    it('should handle equivalent numbers with different decimal places', () => {
      const fp1 = new FixedPointNumber(100n, 2n)  // 1.00
      const fp2 = new FixedPointNumber(1000n, 3n) // 1.000
      
      expect(fp1.greaterThanOrEqual(fp2)).toBe(true)
      expect(fp2.greaterThanOrEqual(fp1)).toBe(true)
    })
  })

  describe('isPositive', () => {
    it('should return true for positive amounts', () => {
      const positive = new FixedPointNumber(100n, 2n)
      expect(positive.isPositive()).toBe(true)
    })

    it('should return false for zero amounts', () => {
      const zero = new FixedPointNumber(0n, 2n)
      expect(zero.isPositive()).toBe(false)
    })

    it('should return false for negative amounts', () => {
      const negative = new FixedPointNumber(-100n, 2n)
      expect(negative.isPositive()).toBe(false)
    })
  })

  describe('isNegative', () => {
    it('should return true for negative amounts', () => {
      const negative = new FixedPointNumber(-100n, 2n)
      expect(negative.isNegative()).toBe(true)
    })

    it('should return false for zero amounts', () => {
      const zero = new FixedPointNumber(0n, 2n)
      expect(zero.isNegative()).toBe(false)
    })

    it('should return false for positive amounts', () => {
      const positive = new FixedPointNumber(100n, 2n)
      expect(positive.isNegative()).toBe(false)
    })
  })

  describe('max', () => {
    it('should return the larger of two numbers', () => {
      const fp1 = new FixedPointNumber(100n, 2n) // 1.00
      const fp2 = new FixedPointNumber(200n, 2n) // 2.00
      
      expect(fp1.max(fp2).equals(fp2)).toBe(true)
      expect(fp2.max(fp1).equals(fp2)).toBe(true)
    })

    it('should return this when equal', () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)
      
      expect(fp1.max(fp2)).toBe(fp1)
    })

    it('should handle multiple values in array', () => {
      const fp1 = new FixedPointNumber(100n, 2n) // 1.00
      const fp2 = new FixedPointNumber(300n, 2n) // 3.00
      const fp3 = new FixedPointNumber(200n, 2n) // 2.00
      
      const result = fp1.max([fp2, fp3])
      expect(result.equals(fp2)).toBe(true)
    })

    it('should handle different decimal places', () => {
      const fp1 = new FixedPointNumber(100n, 2n)  // 1.00
      const fp2 = new FixedPointNumber(1500n, 3n) // 1.500
      
      const result = fp1.max(fp2)
      expect(result.equals(fp2)).toBe(true)
    })

    it('should work with FixedPoint-compatible objects', () => {
      const fp = new FixedPointNumber(100n, 2n)
      const result = fp.max({ amount: 200n, decimals: 2n })
      
      expect(result.amount).toBe(200n)
      expect(result.decimals).toBe(2n)
    })
  })

  describe('min', () => {
    it('should return the smaller of two numbers', () => {
      const fp1 = new FixedPointNumber(100n, 2n) // 1.00
      const fp2 = new FixedPointNumber(200n, 2n) // 2.00
      
      expect(fp1.min(fp2).equals(fp1)).toBe(true)
      expect(fp2.min(fp1).equals(fp1)).toBe(true)
    })

    it('should return this when equal', () => {
      const fp1 = new FixedPointNumber(100n, 2n)
      const fp2 = new FixedPointNumber(100n, 2n)
      
      expect(fp1.min(fp2)).toBe(fp1)
    })

    it('should handle multiple values in array', () => {
      const fp1 = new FixedPointNumber(300n, 2n) // 3.00
      const fp2 = new FixedPointNumber(100n, 2n) // 1.00
      const fp3 = new FixedPointNumber(200n, 2n) // 2.00
      
      const result = fp1.min([fp2, fp3])
      expect(result.equals(fp2)).toBe(true)
    })

    it('should handle different decimal places', () => {
      const fp1 = new FixedPointNumber(1500n, 3n) // 1.500
      const fp2 = new FixedPointNumber(100n, 2n)  // 1.00
      
      const result = fp1.min(fp2)
      expect(result.equals(fp2)).toBe(true)
    })

    it('should work with FixedPoint-compatible objects', () => {
      const fp = new FixedPointNumber(200n, 2n)
      const result = fp.min({ amount: 100n, decimals: 2n })
      
      expect(result.amount).toBe(100n)
      expect(result.decimals).toBe(2n)
    })
  })

  describe('toJSON', () => {
    it('should serialize amount and decimals as strings', () => {
      const fp = new FixedPointNumber(10050n, 2n) // 100.50
      const json = fp.toJSON()
      
      expect(json).toEqual({
        amount: "10050",
        decimals: "2"
      })
    })

    it('should handle zero values', () => {
      const fp = new FixedPointNumber(0n, 0n)
      const json = fp.toJSON()
      
      expect(json).toEqual({
        amount: "0",
        decimals: "0"
      })
    })

    it('should handle large numbers', () => {
      const fp = new FixedPointNumber(12345678901234567890n, 8n)
      const json = fp.toJSON()
      
      expect(json).toEqual({
        amount: "12345678901234567890",
        decimals: "8"
      })
    })

    it('should handle negative amounts', () => {
      const fp = new FixedPointNumber(-10050n, 2n) // -100.50
      const json = fp.toJSON()
      
      expect(json).toEqual({
        amount: "-10050",
        decimals: "2"
      })
    })

    it('should work with JSON.stringify', () => {
      const fp = new FixedPointNumber(10050n, 2n)
      const jsonString = JSON.stringify(fp)
      
      expect(jsonString).toBe('{"amount":"10050","decimals":"2"}')
    })
  })

  describe('fromJSON', () => {
    it('should deserialize valid JSON back to FixedPointNumber', () => {
      const json = { amount: "10050", decimals: "2" }
      const fp = FixedPointNumber.fromJSON(json)
      
      expect(fp.amount).toBe(10050n)
      expect(fp.decimals).toBe(2n)
    })

    it('should handle zero values', () => {
      const json = { amount: "0", decimals: "0" }
      const fp = FixedPointNumber.fromJSON(json)
      
      expect(fp.amount).toBe(0n)
      expect(fp.decimals).toBe(0n)
    })

    it('should handle large numbers', () => {
      const json = { amount: "12345678901234567890", decimals: "8" }
      const fp = FixedPointNumber.fromJSON(json)
      
      expect(fp.amount).toBe(12345678901234567890n)
      expect(fp.decimals).toBe(8n)
    })

    it('should handle negative amounts', () => {
      const json = { amount: "-10050", decimals: "2" }
      const fp = FixedPointNumber.fromJSON(json)
      
      expect(fp.amount).toBe(-10050n)
      expect(fp.decimals).toBe(2n)
    })

    it('should round-trip correctly with toJSON', () => {
      const original = new FixedPointNumber(12345n, 3n)
      const json = original.toJSON()
      const restored = FixedPointNumber.fromJSON(json)
      
      expect(restored.amount).toBe(original.amount)
      expect(restored.decimals).toBe(original.decimals)
      expect(restored.equals(original)).toBe(true)
    })

    it('should work with JSON.stringify/parse round-trip', () => {
      const original = new FixedPointNumber(54321n, 4n)
      const jsonString = JSON.stringify(original)
      const parsed = JSON.parse(jsonString)
      const restored = FixedPointNumber.fromJSON(parsed)
      
      expect(restored.equals(original)).toBe(true)
    })

    it('should throw error for missing amount field', () => {
      const json = { decimals: "2" }
      
      expect(() => FixedPointNumber.fromJSON(json)).toThrow()
    })

    it('should throw error for missing decimals field', () => {
      const json = { amount: "100" }
      
      expect(() => FixedPointNumber.fromJSON(json)).toThrow()
    })

    it('should throw error for non-string amount', () => {
      const json = { amount: 100, decimals: "2" }
      
      expect(() => FixedPointNumber.fromJSON(json)).toThrow()
    })

    it('should throw error for non-string decimals', () => {
      const json = { amount: "100", decimals: 2 }
      
      expect(() => FixedPointNumber.fromJSON(json)).toThrow()
    })

    it('should throw error for invalid amount format', () => {
      const json = { amount: "100.5", decimals: "2" }
      
      expect(() => FixedPointNumber.fromJSON(json)).toThrow()
    })

    it('should throw error for invalid decimals format', () => {
      const json = { amount: "100", decimals: "2.5" }
      
      expect(() => FixedPointNumber.fromJSON(json)).toThrow()
    })

    it('should throw error for negative decimals', () => {
      const json = { amount: "100", decimals: "-2" }
      
      expect(() => FixedPointNumber.fromJSON(json)).toThrow()
    })

    it('should throw error for non-numeric strings', () => {
      const json = { amount: "abc", decimals: "2" }
      
      expect(() => FixedPointNumber.fromJSON(json)).toThrow()
    })

    it('should throw error for null input', () => {
      expect(() => FixedPointNumber.fromJSON(null)).toThrow()
    })

    it('should throw error for undefined input', () => {
      expect(() => FixedPointNumber.fromJSON(undefined)).toThrow()
    })

    it('should ignore extra fields', () => {
      const json = { amount: "100", decimals: "2", extraField: "ignored" }
      const fp = FixedPointNumber.fromJSON(json)
      
      expect(fp.amount).toBe(100n)
      expect(fp.decimals).toBe(2n)
    })
  })

  describe('FixedPointJSONSchema', () => {
    it('should be exported and usable independently', () => {
      const validData = { amount: "100", decimals: "2" }
      const parsed = FixedPointJSONSchema.parse(validData)
      
      expect(parsed).toEqual(validData)
    })

    it('should validate data independently of fromJSON', () => {
      const invalidData = { amount: 100, decimals: "2" }
      
      expect(() => FixedPointJSONSchema.parse(invalidData)).toThrow()
    })

    it('should provide the same validation as fromJSON', () => {
      const testData = { amount: "abc", decimals: "2" }
      
      // Both should throw for the same invalid data
      expect(() => FixedPointJSONSchema.parse(testData)).toThrow()
      expect(() => FixedPointNumber.fromJSON(testData)).toThrow()
    })
  })
})
