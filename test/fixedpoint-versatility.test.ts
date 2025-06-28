import { FixedPoint, FixedPointNumber } from '../src/index'

describe('FixedPoint Factory Versatility', () => {
  it('should support all input types and produce equivalent results', () => {
    // The same value (123.45) created in different ways
    const fromString = FixedPoint('123.45')
    const fromBigInt = FixedPoint(12345n, 2n)
    const fromObject = FixedPoint({ amount: 12345n, decimals: 2n })
    const fromClass = FixedPoint(new FixedPointNumber(12345n, 2n))
    
    // All should be equivalent
    expect(fromString.equals(fromBigInt)).toBe(true)
    expect(fromString.equals(fromObject)).toBe(true)
    expect(fromString.equals(fromClass)).toBe(true)
    
    // All should have the same string representation
    expect(fromString.toString()).toBe('123.45')
    expect(fromBigInt.toString()).toBe('123.45')
    expect(fromObject.toString()).toBe('123.45')
    expect(fromClass.toString()).toBe('123.45')
  })

  it('should handle different precisions correctly', () => {
    // High precision from string
    const precise = FixedPoint('123.456789')
    expect(precise.decimals).toBe(6n)
    expect(precise.toString()).toBe('123.456789')
    
    // Copy with same precision
    const copy = FixedPoint(precise)
    expect(copy.decimals).toBe(6n)
    expect(copy.equals(precise)).toBe(true)
  })

  it('should work well in practical scenarios', () => {
    // Start with a string for easy input
    const price = FixedPoint('99.99')
    
    // Create quantity from another format
    const quantity = FixedPoint(5n, 0n) // 5 units
    
    // Calculate total
    const total = price.multiply(quantity)
    expect(total.toString()).toBe('499.95')
    
    // Apply discount using FixedPoint object
    const discountRate = { amount: 1n, decimals: 1n } // 0.1 = 10%
    const discount = FixedPoint(discountRate)
    const discountAmount = total.multiply(discount)
    const finalPrice = total.subtract(discountAmount)
    
    expect(finalPrice.toString()).toBe('449.96')
  })

  it('should be useful for cloning/copying with modifications', () => {
    const original = FixedPoint('100.00')
    
    // Clone the original
    const copy = FixedPoint(original)
    expect(copy.equals(original)).toBe(true)
    expect(copy).not.toBe(original) // Different instances
    
    // Modify the copy
    const modified = copy.multiply(2n)
    expect(modified.toString()).toBe('200.00')
    expect(original.toString()).toBe('100.00') // Original unchanged
  })
})