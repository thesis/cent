import { FixedPoint, Rational, FixedPointNumber, RationalNumber } from '../src/index'

describe('Factory Functions Integration', () => {
  describe('FixedPoint factory', () => {
    it('should be exported and work with string input', () => {
      const fp = FixedPoint('1.234098')
      expect(fp).toBeInstanceOf(FixedPointNumber)
      expect(fp.toString()).toBe('1.234098')
    })

    it('should be exported and work with bigint input', () => {
      const fp = FixedPoint(12345n, 3n)
      expect(fp).toBeInstanceOf(FixedPointNumber)
      expect(fp.amount).toBe(12345n)
      expect(fp.decimals).toBe(3n)
    })

    it('should be exported and work with FixedPoint object input', () => {
      const original = { amount: 67890n, decimals: 4n }
      const fp = FixedPoint(original)
      expect(fp).toBeInstanceOf(FixedPointNumber)
      expect(fp.amount).toBe(67890n)
      expect(fp.decimals).toBe(4n)
    })
  })

  describe('Rational factory', () => {
    it('should be exported and work with fraction string input', () => {
      const r = Rational('1234/97328')
      expect(r).toBeInstanceOf(RationalNumber)
      expect(r.p).toBe(1234n)
      expect(r.q).toBe(97328n)
    })

    it('should be exported and work with decimal string input', () => {
      const r = Rational('12234.352453')
      expect(r).toBeInstanceOf(RationalNumber)
      expect(r.p).toBe(12234352453n)
      expect(r.q).toBe(1000000n)
    })

    it('should be exported and work with Ratio object input', () => {
      const r = Rational({ p: 22n, q: 7n })
      expect(r).toBeInstanceOf(RationalNumber)
      expect(r.p).toBe(22n)
      expect(r.q).toBe(7n)
    })

    it('should be exported and work with bigint p, q arguments', () => {
      const r = Rational(22n, 7n)
      expect(r).toBeInstanceOf(RationalNumber)
      expect(r.p).toBe(22n)
      expect(r.q).toBe(7n)
    })

    it('should throw error when q is missing with bigint p', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime error for missing q parameter
        Rational(22n)
      }).toThrow('q parameter is required when creating Rational with bigint p')
    })
  })

  describe('Developer Experience Examples', () => {
    it('should support the desired usage patterns', () => {
      // These are the patterns the user wanted to support
      const fixed = FixedPoint('1.234098')
      const rational1 = Rational('1234/97328')
      const rational2 = Rational('12234.352453')

      expect(fixed.toString()).toBe('1.234098')
      expect(rational1.toString()).toBe('617/48664') // Simplified from 1234/97328
      expect(rational2.toDecimalString()).toBe('12234.352453')
    })

    it('should work seamlessly with existing APIs', () => {
      // Factory functions should integrate with existing methods
      const fp1 = FixedPoint('123.45')
      const fp2 = new FixedPointNumber(67890n, 2n)
      
      expect(fp1.add(fp2).toString()).toBe('802.35')
      
      // FixedPoint factory can also accept FixedPoint objects
      const fp3 = FixedPoint(fp2) // Copy/clone existing FixedPoint
      expect(fp3.equals(fp2)).toBe(true)
      expect(fp3).not.toBe(fp2) // Different instance
      
      const r1 = Rational('1/2')
      const r2 = new RationalNumber({ p: 1n, q: 4n })
      const r3 = Rational(1n, 8n) // Using bigint signature
      
      expect(r1.add(r2).toString()).toBe('3/4')
      expect(r1.add(r3).toString()).toBe('5/8')
    })
  })
})