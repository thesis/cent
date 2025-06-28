import { Money, FixedPointNumber } from '../src'
import { BTC, ETH, USD } from '../src/currencies'

describe('Precision Safety', () => {
  describe('Large amount formatting', () => {
    it('should handle very large Bitcoin amounts without precision loss in computation', () => {
      // 21 million BTC with full satoshi precision
      const largeBtc = new Money({
        asset: BTC,
        amount: { amount: 2100000000000000n, decimals: 8n } // 21,000,000.00000000 BTC
      })

      // The underlying math should be exact
      const doubled = largeBtc.multiply(2n)
      expect(doubled.balance.amount.amount).toBe(4200000000000000n)
      
      // Formatting should not throw errors
      expect(() => largeBtc.toString()).not.toThrow()
      expect(() => largeBtc.toString({ preferredUnit: 'satoshi' })).not.toThrow()
    })

    it('should handle high-precision Ethereum amounts', () => {
      // 1000 ETH with full wei precision (18 decimals)  
      const largeEth = new Money({
        asset: ETH,
        amount: { amount: 1000000000000000000000n, decimals: 18n } // 1000.000000000000000000 ETH
      })

      // Math should remain exact
      const half = largeEth.multiply({ amount: 5n, decimals: 1n }) // multiply by 0.5
      expect(half.balance.amount.amount).toBe(500000000000000000000n)

      // Formatting should work
      expect(() => largeEth.toString()).not.toThrow()
    })

    it('should handle amounts at Number.MAX_SAFE_INTEGER boundary', () => {
      // Create an amount that would lose precision in regular Number arithmetic
      const bigAmount = new Money({
        asset: USD,
        amount: { amount: BigInt(Number.MAX_SAFE_INTEGER) + 100n, decimals: 2n }
      })

      // Math operations should remain exact
      const doubled = bigAmount.multiply(2n)
      expect(doubled.balance.amount.amount).toBe((BigInt(Number.MAX_SAFE_INTEGER) + 100n) * 2n)

      // Should format without throwing (though may warn)
      expect(() => bigAmount.toString()).not.toThrow()
    })
  })

  describe('Decimal precision safety', () => {
    it('should reject currencies with excessive decimal places', () => {
      const invalidCurrency = {
        name: 'Invalid Currency',
        code: 'INV',
        decimals: BigInt(Number.MAX_SAFE_INTEGER) + 1n, // Too large
        symbol: 'X'
      }

      const money = new Money({
        asset: invalidCurrency,
        amount: { amount: 100n, decimals: 2n }
      })

      // Should throw when trying to format with unsafe decimal count
      expect(() => money.toString()).toThrow('Asset decimal places')
    })

    it('should reject maxDecimals that exceed safe integer range', () => {
      const btcMoney = new Money({
        asset: BTC,
        amount: { amount: 100000000n, decimals: 8n } // 1.0 BTC
      })

      // Should throw for unsafe maxDecimals
      expect(() => btcMoney.toString({ 
        maxDecimals: BigInt(Number.MAX_SAFE_INTEGER) + 1n 
      })).toThrow('Max decimal places')
    })

    it('should accept reasonable decimal values safely', () => {
      const currency = {
        name: 'Test Currency',
        code: 'TST',
        decimals: 18n, // Reasonable like Ethereum
        symbol: 'T'
      }

      const money = new Money({
        asset: currency,
        amount: { amount: 1000000000000000000n, decimals: 18n }
      })

      // Should work fine with reasonable values
      expect(() => money.toString()).not.toThrow()
      expect(() => money.toString({ maxDecimals: 8 })).not.toThrow()
      expect(() => money.toString({ maxDecimals: 8n })).not.toThrow()
    })
  })

  describe('FixedPointNumber precision', () => {
    it('should maintain precision in string representation for large numbers', () => {
      // Very large number with many decimal places
      const large = new FixedPointNumber(
        123456789012345678901234567890n,
        10n
      )

      const str = large.toString()
      expect(str).toBe('12345678901234567890.1234567890')
      
      // Should be able to parse it back exactly
      const parsed = FixedPointNumber.parseString(str, 10n)
      expect(parsed.amount).toBe(large.amount)
      expect(parsed.decimals).toBe(large.decimals)
    })

    it('should handle arithmetic on very large fixed-point numbers', () => {
      const large1 = new FixedPointNumber(999999999999999999n, 8n)
      const large2 = new FixedPointNumber(999999999999999999n, 8n)
      
      const sum = large1.add(large2)
      expect(sum.amount).toBe(1999999999999999998n)
      expect(sum.decimals).toBe(8n)
      
      // Should still format correctly
      expect(() => sum.toString()).not.toThrow()
    })
  })

})