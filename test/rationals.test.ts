import { RationalNumber } from '../src/rationals'
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
})