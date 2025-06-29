import { Money, Price } from '../src'
import { USD, BTC } from '../src/currencies'

describe('Money.convert()', () => {
  it('should convert USD to BTC using a price (example from requirements)', () => {
    const money = Money("$100")
    const price = new Price(Money("$104,000"), Money("1 BTC"))
    
    const result = money.convert(price)
    
    // $100 / $104,000 per BTC = 100/104,000 BTC ≈ 0.00096154 BTC
    expect(result.currency).toBe(BTC)
    expect(result.toString()).toContain('BTC')
    
    // Test that we get approximately the right amount
    // 100/104000 = 0.0009615384615...
    const decimalStr = result.toString()
    expect(decimalStr).toMatch(/0\.00096/)
  })

  it('should handle lossless conversion when price has factors of 2 and 5 only', () => {
    // Create a price where the USD amount only has factors of 2 and 5
    // $100 (= 2^2 * 5^2) to 1 BTC should be lossless
    const money = Money("$50")
    const price = new Price(Money("$100"), Money("1 BTC")) // Simple 2:1 ratio
    
    const result = money.convert(price)
    
    expect(result.currency).toBe(BTC)
    expect(result.toString()).toContain('0.5')
  })

  it('should use RationalNumber arithmetic for precision-preserving conversion', () => {
    // Use a price that can't be represented exactly in decimal
    const money = Money("$100")
    const price = new Price(Money("$300"), Money("1 BTC")) // 1/3 ratio
    
    const result = money.convert(price)
    
    expect(result.currency).toBe(BTC)
    // Should maintain precision via RationalNumber
    // 100/300 = 1/3 BTC = 0.333... BTC
    const decimalStr = result.toString()
    expect(decimalStr).toMatch(/0\.33/)
  })

  it('should work in both directions', () => {
    const btc = Money("1 BTC")
    const price = new Price(Money("$50,000"), Money("1 BTC"))
    
    const result = btc.convert(price)
    
    expect(result.currency).toBe(USD)
    expect(result.toString()).toContain('50,000') // Should include the comma formatting
  })

  it('should throw error for incompatible currencies', () => {
    const money = Money("€100")
    const price = new Price(Money("$50,000"), Money("1 BTC"))
    
    expect(() => money.convert(price)).toThrow('Cannot convert EUR')
  })
})