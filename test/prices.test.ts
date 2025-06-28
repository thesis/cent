import { Price } from '../src/prices'
import { ExchangeRate } from '../src/exchange-rates'
import { Currency, AssetAmount } from '../src/types'
import { RationalNumber } from '../src/rationals'
import { FixedPointNumber } from '../src/fixed-point'

describe('Price', () => {
  const usdCurrency: Currency = {
    name: 'US Dollar',
    code: 'USD',
    decimals: 2n,
    symbol: '$'
  }

  const eurCurrency: Currency = {
    name: 'Euro',
    code: 'EUR',
    decimals: 2n,
    symbol: '€'
  }

  const btcCurrency: Currency = {
    name: 'Bitcoin',
    code: 'BTC',
    decimals: 8n,
    symbol: '₿'
  }

  const usdAmount: AssetAmount = {
    asset: usdCurrency,
    amount: { amount: 10000n, decimals: 2n }  // $100.00
  }

  const eurAmount: AssetAmount = {
    asset: eurCurrency,
    amount: { amount: 8500n, decimals: 2n }   // €85.00
  }

  const btcAmount: AssetAmount = {
    asset: btcCurrency,
    amount: { amount: 100000000n, decimals: 8n }  // 1.00000000 BTC
  }

  const appleCurrency: Currency = {
    name: 'Apple',
    code: 'APPLE',
    decimals: 0n,
    symbol: '🍎'
  }

  const orangeCurrency: Currency = {
    name: 'Orange', 
    code: 'ORANGE',
    decimals: 0n,
    symbol: '🍊'
  }

  const appleAmount: AssetAmount = {
    asset: appleCurrency,
    amount: { amount: 1n, decimals: 0n }  // 1 apple
  }

  const applesAmount: AssetAmount = {
    asset: appleCurrency,
    amount: { amount: 10000n, decimals: 0n }  // 10000 apples
  }

  const orangeAmount: AssetAmount = {
    asset: orangeCurrency,
    amount: { amount: 5000n, decimals: 0n }  // 5000 oranges
  }

  describe('constructor', () => {
    it('should create a Price instance with the provided amounts', () => {
      const price = new Price(usdAmount, eurAmount)
      expect(price.amounts).toEqual([usdAmount, eurAmount])
      expect(price.time).toBeDefined()
    })

    it('should accept a custom time parameter', () => {
      const customTime = '1609459200'  // 2021-01-01 00:00:00 UTC
      const price = new Price(usdAmount, eurAmount, customTime)
      expect(price.time).toBe(customTime)
    })
  })

  describe('asRatio', () => {
    it('should return the ratio of amounts[0] / amounts[1]', () => {
      const price = new Price(usdAmount, eurAmount)
      const ratio = price.asRatio()
      
      expect(ratio).toBeInstanceOf(RationalNumber)
      expect(ratio.p).toBe(usdAmount.amount.amount)
      expect(ratio.q).toBe(eurAmount.amount.amount)
    })

    it('should work with different asset types', () => {
      const price = new Price(btcAmount, usdAmount)
      const ratio = price.asRatio()
      
      expect(ratio.p).toBe(btcAmount.amount.amount)  // 100000000n
      expect(ratio.q).toBe(usdAmount.amount.amount)  // 10000n
    })
  })

  describe('multiply', () => {
    it('should multiply by a bigint scalar', () => {
      const price = new Price(usdAmount, eurAmount)
      const multiplied = price.multiply(2n)
      
      expect(multiplied.amounts[0].amount.amount).toBe(20000n)  // 200.00 USD
      expect(multiplied.amounts[1].amount.amount).toBe(8500n)   // 85.00 EUR (unchanged)
      expect(multiplied.amounts[0].asset).toBe(usdCurrency)
      expect(multiplied.amounts[1].asset).toBe(eurCurrency)
      expect(multiplied.time).toBe(price.time)
    })

    it('should multiply by a FixedPoint', () => {
      const price = new Price(usdAmount, eurAmount)
      const fixedPoint = new FixedPointNumber(150n, 2n)  // 1.50
      const multiplied = price.multiply(fixedPoint)
      
      expect(multiplied.amounts[0].amount.amount).toBe(15000n)  // 150.00 USD
      expect(multiplied.amounts[1].amount.amount).toBe(8500n)   // 85.00 EUR (unchanged)
    })

    it('should multiply by a Ratio', () => {
      const price = new Price(usdAmount, eurAmount)
      const ratio = { p: 3n, q: 2n }  // 1.5
      const multiplied = price.multiply(ratio)
      
      expect(multiplied.amounts[0].amount.amount).toBe(15000n)  // 150.00 USD
      expect(multiplied.amounts[1].amount.amount).toBe(8500n)   // 85.00 EUR (unchanged)
    })
  })

  describe('divide', () => {
    it('should divide by a bigint scalar', () => {
      const price = new Price(usdAmount, eurAmount)
      const divided = price.divide(2n)
      
      expect(divided.amounts[0].amount.amount).toBe(5000n)   // 50.00 USD
      expect(divided.amounts[1].amount.amount).toBe(8500n)   // 85.00 EUR (unchanged)
      expect(divided.time).toBe(price.time)
    })

    it('should divide by a FixedPoint', () => {
      const price = new Price(usdAmount, eurAmount)
      const fixedPoint = new FixedPointNumber(200n, 2n)  // 2.00
      const divided = price.divide(fixedPoint)
      
      expect(divided.amounts[0].amount.amount).toBe(5000n)   // 50.00 USD
      expect(divided.amounts[1].amount.amount).toBe(8500n)   // 85.00 EUR (unchanged)
    })

    it('should divide by a Ratio', () => {
      const price = new Price(usdAmount, eurAmount)
      const ratio = { p: 4n, q: 2n }  // 2.0
      const divided = price.divide(ratio)
      
      expect(divided.amounts[0].amount.amount).toBe(5000n)   // 50.00 USD
      expect(divided.amounts[1].amount.amount).toBe(8500n)   // 85.00 EUR (unchanged)
    })

    it('should throw error when dividing by zero bigint', () => {
      const price = new Price(usdAmount, eurAmount)
      expect(() => price.divide(0n)).toThrow('Cannot divide by zero')
    })

    it('should throw error when dividing by zero FixedPoint', () => {
      const price = new Price(usdAmount, eurAmount)
      const zeroFixedPoint = new FixedPointNumber(0n, 2n)
      expect(() => price.divide(zeroFixedPoint)).toThrow('Cannot divide by zero')
    })

    it('should throw error when dividing by zero Ratio', () => {
      const price = new Price(usdAmount, eurAmount)
      const zeroRatio = { p: 0n, q: 1n }
      expect(() => price.divide(zeroRatio)).toThrow('Cannot divide by zero')
    })
  })

  describe('invert', () => {
    it('should swap the order of amounts', () => {
      const price = new Price(usdAmount, eurAmount)
      const inverted = price.invert()
      
      expect(inverted.amounts[0]).toEqual(eurAmount)
      expect(inverted.amounts[1]).toEqual(usdAmount)
      expect(inverted.time).toBe(price.time)
    })
  })

  describe('equals', () => {
    it('should return true for prices with same amounts and time', () => {
      const time = '1609459200'
      const price1 = new Price(usdAmount, eurAmount, time)
      const price2 = new Price(usdAmount, eurAmount, time)
      
      expect(price1.equals(price2)).toBe(true)
    })

    it('should return true for prices with inverted amounts and same time', () => {
      const time = '1609459200'
      const price1 = new Price(usdAmount, eurAmount, time)
      const price2 = new Price(eurAmount, usdAmount, time)
      
      expect(price1.equals(price2)).toBe(true)
    })

    it('should return false for prices with different times', () => {
      const price1 = new Price(usdAmount, eurAmount, '1609459200')
      const price2 = new Price(usdAmount, eurAmount, '1609545600')
      
      expect(price1.equals(price2)).toBe(false)
    })

    it('should return false for prices with different amounts', () => {
      const time = '1609459200'
      const price1 = new Price(usdAmount, eurAmount, time)
      const price2 = new Price(btcAmount, eurAmount, time)
      
      expect(price1.equals(price2)).toBe(false)
    })
  })

  describe('Price-to-Price multiplication', () => {
    it('should multiply prices with shared assets (A/B * B/C = A/C)', () => {
      // $5 / 1 apple
      const usdPerApple = new Price(
        { asset: usdCurrency, amount: { amount: 500n, decimals: 2n } },
        appleAmount
      )
      
      // 10000 apples / 1 BTC
      const applesPerBtc = new Price(
        applesAmount,
        btcAmount
      )
      
      // Should give us $50,000 / 1 BTC (500 * 10000 / 100)
      const usdPerBtc = usdPerApple.multiply(applesPerBtc)
      
      expect(usdPerBtc.amounts[0].asset).toBe(usdCurrency)
      expect(usdPerBtc.amounts[1].asset).toBe(btcCurrency)
      expect(usdPerBtc.amounts[0].amount.amount).toBe(5000000n)  // $50,000.00
      expect(usdPerBtc.amounts[1].amount.amount).toBe(100000000n) // 1.00000000 BTC
    })

    it('should multiply prices with shared assets (A/B * C/A = C/B)', () => {
      // 1 BTC / $50,000
      const btcPerUsd = new Price(
        btcAmount,
        { asset: usdCurrency, amount: { amount: 5000000n, decimals: 2n } }
      )
      
      // $5 / 1 apple  
      const usdPerApple = new Price(
        { asset: usdCurrency, amount: { amount: 500n, decimals: 2n } },
        appleAmount
      )
      
      // Should give us BTC/apple (not apple/BTC)  
      const result = btcPerUsd.multiply(usdPerApple)
      
      expect(result.amounts[0].asset).toBe(btcCurrency)
      expect(result.amounts[1].asset).toBe(appleCurrency)
    })

    it('should throw error when multiplying prices without shared assets', () => {
      // $5 / 1 apple
      const usdPerApple = new Price(
        { asset: usdCurrency, amount: { amount: 500n, decimals: 2n } },
        appleAmount
      )
      
      // 5000 oranges / 1 BTC (no shared asset with apples)
      const orangesPerBtc = new Price(
        orangeAmount,
        btcAmount
      )
      
      expect(() => usdPerApple.multiply(orangesPerBtc)).toThrow(
        'Cannot multiply prices: no shared asset found between US Dollar/Apple and Orange/Bitcoin'
      )
    })
  })

  describe('Price-to-Price division', () => {
    it('should divide prices with shared assets', () => {
      // $50,000 / 1 BTC
      const usdPerBtc = new Price(
        { asset: usdCurrency, amount: { amount: 5000000n, decimals: 2n } },
        btcAmount
      )
      
      // $5 / 1 apple
      const usdPerApple = new Price(
        { asset: usdCurrency, amount: { amount: 500n, decimals: 2n } },
        appleAmount
      )
      
      // Should give us 10000 apples / 1 BTC
      const applesPerBtc = usdPerBtc.divide(usdPerApple)
      
      expect(applesPerBtc.amounts[0].asset).toBe(appleCurrency)
      expect(applesPerBtc.amounts[1].asset).toBe(btcCurrency)
      expect(applesPerBtc.amounts[0].amount.amount).toBe(10000n)     // 10000 apples
      expect(applesPerBtc.amounts[1].amount.amount).toBe(100000000n) // 1.00000000 BTC
    })

    it('should throw error when dividing prices without shared assets', () => {
      // $5 / 1 apple
      const usdPerApple = new Price(
        { asset: usdCurrency, amount: { amount: 500n, decimals: 2n } },
        appleAmount
      )
      
      // 5000 oranges / 1 BTC
      const orangesPerBtc = new Price(
        orangeAmount,
        btcAmount
      )
      
      expect(() => usdPerApple.divide(orangesPerBtc)).toThrow(
        'Cannot multiply prices: no shared asset found'
      )
    })
  })
})