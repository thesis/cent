import {
  DecimalStringSchema,
  isDecimalString,
  toDecimalString
} from '../src/decimal-strings'
import { DecimalString } from '../src/types'

describe('DecimalString utilities', () => {
  describe('DecimalStringSchema', () => {
    it('should validate positive integers', () => {
      const validIntegers = ['0', '1', '123', '999999']
      
      validIntegers.forEach(str => {
        expect(DecimalStringSchema.safeParse(str).success).toBe(true)
      })
    })

    it('should validate negative integers', () => {
      const validNegatives = ['-1', '-123', '-999999']
      
      validNegatives.forEach(str => {
        expect(DecimalStringSchema.safeParse(str).success).toBe(true)
      })
    })

    it('should validate positive decimals', () => {
      const validDecimals = ['0.1', '123.45', '0.001', '.5', '.999']
      
      validDecimals.forEach(str => {
        expect(DecimalStringSchema.safeParse(str).success).toBe(true)
      })
    })

    it('should validate negative decimals', () => {
      const validNegatives = ['-0.1', '-123.45', '-0.001', '-.5', '-.999']
      
      validNegatives.forEach(str => {
        expect(DecimalStringSchema.safeParse(str).success).toBe(true)
      })
    })

    it('should reject invalid formats', () => {
      const invalidStrings = [
        'abc',        // non-numeric
        '123.',       // trailing decimal point
        '-.',         // just minus and decimal
        '.',          // just decimal point
        '12.34.56',   // multiple decimal points
        '1e5',        // scientific notation
        '12 34',      // spaces
        '+123',       // plus sign
        '',           // empty string
        '123,456',    // comma
        'NaN',        // NaN
        'Infinity',   // Infinity
      ]

      invalidStrings.forEach(str => {
        expect(DecimalStringSchema.safeParse(str).success).toBe(false)
      })
    })

    it('should reject non-string inputs', () => {
      const invalidInputs = [123, 123.45, null, undefined, {}, []]
      
      invalidInputs.forEach(input => {
        expect(DecimalStringSchema.safeParse(input).success).toBe(false)
      })
    })
  })

  describe('isDecimalString', () => {
    it('should return true for valid decimal strings', () => {
      expect(isDecimalString('123')).toBe(true)
      expect(isDecimalString('123.45')).toBe(true)
      expect(isDecimalString('-0.001')).toBe(true)
      expect(isDecimalString('.5')).toBe(true)
    })

    it('should return false for invalid decimal strings', () => {
      expect(isDecimalString('abc')).toBe(false)
      expect(isDecimalString('123.')).toBe(false)
      expect(isDecimalString('')).toBe(false)
    })

    it('should work as a type guard', () => {
      const value: string = '123.45'
      
      if (isDecimalString(value)) {
        const decimalStr: DecimalString = value
        expect(typeof decimalStr).toBe('string')
      }
    })
  })

  describe('toDecimalString', () => {
    it('should cast valid strings to DecimalString', () => {
      const str = '123.45'
      const decimalStr = toDecimalString(str)
      
      expect(decimalStr).toBe(str)
      const typed: DecimalString = decimalStr
      expect(typeof typed).toBe('string')
    })

    it('should throw error for invalid strings', () => {
      expect(() => toDecimalString('abc')).toThrow('Invalid decimal string')
      expect(() => toDecimalString('123.')).toThrow('Invalid decimal string')
      expect(() => toDecimalString('')).toThrow('Invalid decimal string')
    })
  })

})