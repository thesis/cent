import { RationalNumber, Rational } from '../src/rationals'
import { Ratio } from '../src/types'

describe('RationalNumber', () => {
  const oneHalf: Ratio = { p: 1n, q: 2n } // 1/2
  const oneThird: Ratio = { p: 1n, q: 3n } // 1/3
  const twoFifths: Ratio = { p: 2n, q: 5n } // 2/5
  const threeFourths: Ratio = { p: 3n, q: 4n } // 3/4
  const negativeOneHalf: Ratio = { p: -1n, q: 2n } // -1/2
  const zero: Ratio = { p: 0n, q: 1n } // 0/1

  describe('constructor', () => {
    it('should create a RationalNumber with the provided ratio', () => {
      const rational = new RationalNumber(oneHalf)
      expect(rational.p).toBe(1n)
      expect(rational.q).toBe(2n)
    })

    it('should implement Ratio interface', () => {
      const rational = new RationalNumber(oneHalf)
      expect(rational).toHaveProperty('p')
      expect(rational).toHaveProperty('q')
      expect(typeof rational.p).toBe('bigint')
      expect(typeof rational.q).toBe('bigint')
    })
  })

  describe('multiply', () => {
    it('should multiply two positive rationals correctly', () => {
      // (1/2) * (1/3) = 1/6
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.multiply(oneThird)
      expect(result.p).toBe(1n)
      expect(result.q).toBe(6n)
    })

    it('should multiply with negative rationals correctly', () => {
      // (1/2) * (-1/2) = -1/4
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.multiply(negativeOneHalf)
      expect(result.p).toBe(-1n)
      expect(result.q).toBe(4n)
    })

    it('should multiply by zero to get zero', () => {
      // (1/2) * (0/1) = 0/2
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.multiply(zero)
      expect(result.p).toBe(0n)
      expect(result.q).toBe(2n)
    })

    it('should return a new RationalNumber instance', () => {
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.multiply(oneThird)
      expect(result).toBeInstanceOf(RationalNumber)
      expect(result).not.toBe(rational1)
    })
  })

  describe('divide', () => {
    it('should divide two positive rationals correctly', () => {
      // (1/2) / (1/3) = (1/2) * (3/1) = 3/2
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.divide(oneThird)
      expect(result.p).toBe(3n)
      expect(result.q).toBe(2n)
    })

    it('should divide with negative rationals correctly', () => {
      // (1/2) / (-1/2) = (1/2) * (2/-1) = 2/-2 = -1
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.divide(negativeOneHalf)
      expect(result.p).toBe(2n)
      expect(result.q).toBe(-2n)
    })

    it('should throw error when dividing by zero', () => {
      const rational1 = new RationalNumber(oneHalf)
      expect(() => rational1.divide(zero)).toThrow('Cannot divide by zero')
    })

    it('should return a new RationalNumber instance', () => {
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.divide(oneThird)
      expect(result).toBeInstanceOf(RationalNumber)
      expect(result).not.toBe(rational1)
    })
  })

  describe('add', () => {
    it('should add two positive rationals correctly', () => {
      // (1/2) + (1/3) = (3 + 2)/6 = 5/6
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.add(oneThird)
      expect(result.p).toBe(5n)
      expect(result.q).toBe(6n)
    })

    it('should add positive and negative rationals correctly', () => {
      // (1/2) + (-1/2) = (1 - 1)/2 = 0/2
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.add(negativeOneHalf)
      expect(result.p).toBe(0n)
      expect(result.q).toBe(4n)
    })

    it('should add with zero correctly', () => {
      // (1/2) + (0/1) = (1 + 0)/2 = 1/2
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.add(zero)
      expect(result.p).toBe(1n)
      expect(result.q).toBe(2n)
    })

    it('should add rationals with different denominators', () => {
      // (2/5) + (3/4) = (8 + 15)/20 = 23/20
      const rational1 = new RationalNumber(twoFifths)
      const result = rational1.add(threeFourths)
      expect(result.p).toBe(23n)
      expect(result.q).toBe(20n)
    })

    it('should return a new RationalNumber instance', () => {
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.add(oneThird)
      expect(result).toBeInstanceOf(RationalNumber)
      expect(result).not.toBe(rational1)
    })
  })

  describe('subtract', () => {
    it('should subtract two positive rationals correctly', () => {
      // (1/2) - (1/3) = (3 - 2)/6 = 1/6
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.subtract(oneThird)
      expect(result.p).toBe(1n)
      expect(result.q).toBe(6n)
    })

    it('should subtract to get negative result', () => {
      // (1/3) - (1/2) = (2 - 3)/6 = -1/6
      const rational1 = new RationalNumber(oneThird)
      const result = rational1.subtract(oneHalf)
      expect(result.p).toBe(-1n)
      expect(result.q).toBe(6n)
    })

    it('should subtract negative rationals correctly', () => {
      // (1/2) - (-1/2) = (1*2 - 2*(-1))/(2*2) = (2 + 2)/4 = 4/4
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.subtract(negativeOneHalf)
      expect(result.p).toBe(4n)
      expect(result.q).toBe(4n)
    })

    it('should subtract zero correctly', () => {
      // (1/2) - (0/1) = (1 - 0)/2 = 1/2
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.subtract(zero)
      expect(result.p).toBe(1n)
      expect(result.q).toBe(2n)
    })

    it('should subtract rationals with different denominators', () => {
      // (3/4) - (2/5) = (15 - 8)/20 = 7/20
      const rational1 = new RationalNumber(threeFourths)
      const result = rational1.subtract(twoFifths)
      expect(result.p).toBe(7n)
      expect(result.q).toBe(20n)
    })

    it('should return a new RationalNumber instance', () => {
      const rational1 = new RationalNumber(oneHalf)
      const result = rational1.subtract(oneThird)
      expect(result).toBeInstanceOf(RationalNumber)
      expect(result).not.toBe(rational1)
    })
  })

  describe('toString', () => {
    it('should return simplified ratio in p/q format', () => {
      const rational = new RationalNumber({ p: 6n, q: 9n })
      expect(rational.toString()).toBe('2/3') // Simplified from 6/9
    })

    it('should handle negative ratios correctly', () => {
      const rational = new RationalNumber({ p: -3n, q: 4n })
      expect(rational.toString()).toBe('-3/4')
    })

    it('should handle zero numerator', () => {
      const rational = new RationalNumber({ p: 0n, q: 5n })
      expect(rational.toString()).toBe('0/1') // Simplified
    })

    it('should handle whole numbers', () => {
      const rational = new RationalNumber({ p: 10n, q: 2n })
      expect(rational.toString()).toBe('5/1') // Simplified
    })

    it('should handle negative denominator by moving sign to numerator', () => {
      const rational = new RationalNumber({ p: 3n, q: -4n })
      expect(rational.toString()).toBe('-3/4') // Sign moved to numerator
    })
  })

  describe('toDecimalString', () => {
    it('should convert simple fractions to decimal strings', () => {
      const half = new RationalNumber({ p: 1n, q: 2n })
      expect(half.toDecimalString()).toBe('0.5')
      
      const quarter = new RationalNumber({ p: 1n, q: 4n })
      expect(quarter.toDecimalString()).toBe('0.25')
    })

    it('should handle whole numbers without decimals', () => {
      const whole = new RationalNumber({ p: 10n, q: 2n })
      expect(whole.toDecimalString()).toBe('5')
    })

    it('should handle negative ratios', () => {
      const negativeHalf = new RationalNumber({ p: -1n, q: 2n })
      expect(negativeHalf.toDecimalString()).toBe('-0.5')
      
      const negativeWhole = new RationalNumber({ p: -10n, q: 2n })
      expect(negativeWhole.toDecimalString()).toBe('-5')
    })

    it('should handle repeating decimals up to precision limit', () => {
      const oneThird = new RationalNumber({ p: 1n, q: 3n })
      const result = oneThird.toDecimalString(10n)
      expect(result).toBe('0.3333333333')
    })

    it('should remove trailing zeros', () => {
      const tenths = new RationalNumber({ p: 1n, q: 10n })
      expect(tenths.toDecimalString()).toBe('0.1')
      
      const hundredths = new RationalNumber({ p: 5n, q: 100n })
      expect(hundredths.toDecimalString()).toBe('0.05')
    })

    it('should use default precision of 50', () => {
      const oneThird = new RationalNumber({ p: 1n, q: 3n })
      const result = oneThird.toDecimalString()
      expect(result.length).toBe(52) // "0." + 50 3's
      expect(result.startsWith('0.333333333333333333333333333333333333333333333333')).toBe(true)
    })

    it('should throw error for zero denominator', () => {
      const invalid = new RationalNumber({ p: 1n, q: 0n })
      expect(() => invalid.toDecimalString()).toThrow('Division by zero')
    })

    it('should handle zero numerator', () => {
      const zero = new RationalNumber({ p: 0n, q: 5n })
      expect(zero.toDecimalString()).toBe('0')
    })

    it('should handle negative denominators by normalizing sign', () => {
      const ratio = new RationalNumber({ p: 1n, q: -2n })
      expect(ratio.toDecimalString()).toBe('-0.5')
    })

    it('should terminate when remainder becomes zero', () => {
      const eighth = new RationalNumber({ p: 1n, q: 8n })
      expect(eighth.toDecimalString()).toBe('0.125')
    })

    it('should handle large numbers correctly', () => {
      const large = new RationalNumber({ p: 123456789n, q: 100000000n })
      expect(large.toDecimalString()).toBe('1.23456789')
    })
  })

  describe('equivalence with FixedPointNumber', () => {
    it('should match FixedPointNumber.toString() for equivalent values', () => {
      // Import FixedPointNumber for comparison
      const { FixedPointNumber } = require('../src/fixed-point')
      
      // Test 1/2 = 0.5
      const half = new RationalNumber({ p: 1n, q: 2n })
      const halfFixed = new FixedPointNumber(5n, 1n) // 0.5
      expect(half.toDecimalString()).toBe(halfFixed.toString())
      
      // Test 1/4 = 0.25
      const quarter = new RationalNumber({ p: 1n, q: 4n })
      const quarterFixed = new FixedPointNumber(25n, 2n) // 0.25
      expect(quarter.toDecimalString()).toBe(quarterFixed.toString())
      
      // Test 3/4 = 0.75
      const threeQuarters = new RationalNumber({ p: 3n, q: 4n })
      const threeQuartersFixed = new FixedPointNumber(75n, 2n) // 0.75
      expect(threeQuarters.toDecimalString()).toBe(threeQuartersFixed.toString())
      
      // Test 1/10 = 0.1
      const tenth = new RationalNumber({ p: 1n, q: 10n })
      const tenthFixed = new FixedPointNumber(1n, 1n) // 0.1
      expect(tenth.toDecimalString()).toBe(tenthFixed.toString())
    })

    it('should handle negative values equivalently', () => {
      const { FixedPointNumber } = require('../src/fixed-point')
      
      const negativeHalf = new RationalNumber({ p: -1n, q: 2n })
      expect(negativeHalf.toDecimalString()).toBe('-0.5')
      
      // Now that FixedPointNumber.toString() is fixed, we can compare directly
      const negativeHalfFixed = new FixedPointNumber(-5n, 1n) // -0.5
      expect(negativeHalfFixed.toString()).toBe('-0.5')
      expect(negativeHalf.toDecimalString()).toBe(negativeHalfFixed.toString())
    })

    it('should handle whole numbers equivalently', () => {
      const { FixedPointNumber } = require('../src/fixed-point')
      
      const five = new RationalNumber({ p: 10n, q: 2n })
      const fiveFixed = new FixedPointNumber(5n, 0n) // 5
      expect(five.toDecimalString()).toBe(fiveFixed.toString())
    })
  })
})

describe('Rational factory function', () => {
  describe('fraction string parsing mode', () => {
    it('should parse simple fractions', () => {
      const r = Rational('1234/97328')
      expect(r).toBeInstanceOf(RationalNumber)
      expect(r.p).toBe(1234n)
      expect(r.q).toBe(97328n)
    })

    it('should parse negative fractions', () => {
      const r = Rational('-3/4')
      expect(r.p).toBe(-3n)
      expect(r.q).toBe(4n)
    })

    it('should parse fractions with spaces', () => {
      const r = Rational(' 123 / 456 ')
      expect(r.p).toBe(123n)
      expect(r.q).toBe(456n)
    })

    it('should parse whole numbers as fractions', () => {
      const r = Rational('5/1')
      expect(r.p).toBe(5n)
      expect(r.q).toBe(1n)
    })

    it('should throw for zero denominator', () => {
      expect(() => Rational('1/0')).toThrow('Denominator cannot be zero')
    })

    it('should throw for invalid fraction format', () => {
      expect(() => Rational('1/2/3')).toThrow('Invalid fraction format')
      expect(() => Rational('1/')).toThrow()
      expect(() => Rational('/2')).toThrow()
      expect(() => Rational('abc/def')).toThrow()
    })
  })

  describe('decimal string parsing mode', () => {
    it('should parse decimal numbers and convert to fractions', () => {
      const r = Rational('12234.352453')
      expect(r).toBeInstanceOf(RationalNumber)
      // Should be equivalent to 12234352453/1000000 (6 decimal places)
      expect(r.p).toBe(12234352453n)
      expect(r.q).toBe(1000000n)
    })

    it('should parse simple decimals', () => {
      const r = Rational('0.5')
      expect(r.p).toBe(5n)
      expect(r.q).toBe(10n)
    })

    it('should parse whole numbers as decimals', () => {
      const r = Rational('123')
      expect(r.p).toBe(123n)
      expect(r.q).toBe(1n)
    })

    it('should parse negative decimals', () => {
      const r = Rational('-1.25')
      expect(r.p).toBe(-125n)
      expect(r.q).toBe(100n)
    })

    it('should parse zero', () => {
      const r = Rational('0')
      expect(r.p).toBe(0n)
      expect(r.q).toBe(1n)
    })

    it('should parse zero with decimals', () => {
      const r = Rational('0.000')
      expect(r.p).toBe(0n)
      expect(r.q).toBe(1000n)
    })

    it('should work with DecimalString type', () => {
      const decimalStr = '0.75' as any // Simulating DecimalString
      const r = Rational(decimalStr)
      expect(r.p).toBe(75n)
      expect(r.q).toBe(100n)
    })
  })

  describe('original constructor mode', () => {
    it('should work with Ratio objects', () => {
      const ratio: Ratio = { p: 3n, q: 8n }
      const r = Rational(ratio)
      expect(r).toBeInstanceOf(RationalNumber)
      expect(r.p).toBe(3n)
      expect(r.q).toBe(8n)
    })

    it('should work with negative ratios', () => {
      const ratio: Ratio = { p: -7n, q: 12n }
      const r = Rational(ratio)
      expect(r.p).toBe(-7n)
      expect(r.q).toBe(12n)
    })

    it('should work with zero numerator', () => {
      const ratio: Ratio = { p: 0n, q: 5n }
      const r = Rational(ratio)
      expect(r.p).toBe(0n)
      expect(r.q).toBe(5n)
    })
  })

  describe('equivalence with constructor', () => {
    it('should produce same results as constructor for Ratio mode', () => {
      const ratio: Ratio = { p: 22n, q: 7n }
      const factory = Rational(ratio)
      const constructor = new RationalNumber(ratio)
      expect(factory.p).toBe(constructor.p)
      expect(factory.q).toBe(constructor.q)
    })

    it('should produce equivalent results for fraction strings', () => {
      const factory = Rational('22/7')
      const constructor = new RationalNumber({ p: 22n, q: 7n })
      expect(factory.p).toBe(constructor.p)
      expect(factory.q).toBe(constructor.q)
    })

    it('should round-trip with toString for fractions', () => {
      const original = new RationalNumber({ p: 355n, q: 113n })
      const str = original.toString() // "355/113"
      const parsed = Rational(str)
      expect(parsed.p).toBe(original.p)
      expect(parsed.q).toBe(original.q)
    })

    it('should round-trip with toDecimalString for simple decimals', () => {
      const original = new RationalNumber({ p: 1n, q: 4n })
      const str = original.toDecimalString() // "0.25"
      const parsed = Rational(str)
      // Should be equivalent but might not have exact same p/q due to decimal conversion
      expect(parsed.toDecimalString()).toBe(original.toDecimalString())
    })

    it('should support bigint p, q arguments', () => {
      const r = Rational(22n, 7n)
      expect(r.p).toBe(22n)
      expect(r.q).toBe(7n)
      expect(r.toString()).toBe('22/7')
    })

    it('should throw error when q is missing with bigint p', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime error for missing q parameter
        Rational(22n)
      }).toThrow('q parameter is required when creating Rational with bigint p')
    })
  })
})