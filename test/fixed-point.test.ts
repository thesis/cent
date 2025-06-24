import { FixedPointNumber } from '../src/fixed-point'

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
})
