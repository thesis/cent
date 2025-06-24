import { Money } from '../src/money'
import { Currency, AssetAmount } from '../src/types'

describe('Money', () => {
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

  const usdAmount: AssetAmount = {
    asset: usdCurrency,
    amount: { amount: 10050n, decimals: 2n } // $100.50
  }

  const eurAmount: AssetAmount = {
    asset: eurCurrency,
    amount: { amount: 5025n, decimals: 2n } // €50.25
  }

  describe('constructor', () => {
    it('should create a Money instance with the provided balance', () => {
      const money = new Money(usdAmount)
      expect(money.balance).toEqual(usdAmount)
    })

    // it('should have a readonly balance property', () => {
    //   const money = new Money(usdAmount)
    //   expect(() => {
    //     // @ts-expect-error - testing that balance is readonly
    //     money.balance = eurAmount
    //   }).toThrow()
    // })
  })

  describe('add', () => {
    it('should add two Money instances with the same asset', () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 2575n, decimals: 2n } // $25.75
      })

      const result = money1.add(money2)

      expect(result.balance.asset).toEqual(usdCurrency)
      expect(result.balance.amount.amount).toBe(12625n) // $126.25
      expect(result.balance.amount.decimals).toBe(2n)
    })

    it('should add Money instance and AssetAmount with the same asset', () => {
      const money = new Money(usdAmount)
      const assetAmount: AssetAmount = {
        asset: usdCurrency,
        amount: { amount: 1500n, decimals: 2n } // $15.00
      }

      const result = money.add(assetAmount)

      expect(result.balance.asset).toEqual(usdCurrency)
      expect(result.balance.amount.amount).toBe(11550n) // $115.50
      expect(result.balance.amount.decimals).toBe(2n)
    })

    it('should return a new Money instance (immutability)', () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 1000n, decimals: 2n }
      })

      const result = money1.add(money2)

      expect(result).not.toBe(money1)
      expect(result).not.toBe(money2)
      expect(money1.balance.amount.amount).toBe(10050n) // Original unchanged
    })

    it('should handle different decimal precision', () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 100n, decimals: 1n } // $10.0
      })
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 2525n, decimals: 3n } // $2.525
      })

      const result = money1.add(money2)

      expect(result.balance.amount.amount).toBe(12525n) // $12.525
      expect(result.balance.amount.decimals).toBe(3n)
    })

    it('should throw error when adding Money with different assets', () => {
      const usdMoney = new Money(usdAmount)
      const eurMoney = new Money(eurAmount)

      expect(() => usdMoney.add(eurMoney)).toThrow('Cannot add Money with different asset types')
    })

    it('should throw error when adding AssetAmount with different asset', () => {
      const usdMoney = new Money(usdAmount)

      expect(() => usdMoney.add(eurAmount)).toThrow('Cannot add Money with different asset types')
    })
  })

  describe('subtract', () => {
    it('should subtract two Money instances with the same asset', () => {
      const money1 = new Money(usdAmount) // $100.50
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 2575n, decimals: 2n } // $25.75
      })

      const result = money1.subtract(money2)

      expect(result.balance.asset).toEqual(usdCurrency)
      expect(result.balance.amount.amount).toBe(7475n) // $74.75
      expect(result.balance.amount.decimals).toBe(2n)
    })

    it('should subtract Money instance and AssetAmount with the same asset', () => {
      const money = new Money(usdAmount) // $100.50
      const assetAmount: AssetAmount = {
        asset: usdCurrency,
        amount: { amount: 1500n, decimals: 2n } // $15.00
      }

      const result = money.subtract(assetAmount)

      expect(result.balance.asset).toEqual(usdCurrency)
      expect(result.balance.amount.amount).toBe(8550n) // $85.50
      expect(result.balance.amount.decimals).toBe(2n)
    })

    it('should return a new Money instance (immutability)', () => {
      const money1 = new Money(usdAmount)
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 1000n, decimals: 2n }
      })

      const result = money1.subtract(money2)

      expect(result).not.toBe(money1)
      expect(result).not.toBe(money2)
      expect(money1.balance.amount.amount).toBe(10050n) // Original unchanged
    })

    it('should handle different decimal precision', () => {
      const money1 = new Money({
        asset: usdCurrency,
        amount: { amount: 1000n, decimals: 2n } // $10.00
      })
      const money2 = new Money({
        asset: usdCurrency,
        amount: { amount: 2525n, decimals: 3n } // $2.525
      })

      const result = money1.subtract(money2)

      expect(result.balance.amount.amount).toBe(7475n) // $7.475
      expect(result.balance.amount.decimals).toBe(3n)
    })

    it('should throw error when subtracting Money with different assets', () => {
      const usdMoney = new Money(usdAmount)
      const eurMoney = new Money(eurAmount)

      expect(() => usdMoney.subtract(eurMoney)).toThrow('Cannot subtract Money with different asset types')
    })

    it('should throw error when subtracting AssetAmount with different asset', () => {
      const usdMoney = new Money(usdAmount)

      expect(() => usdMoney.subtract(eurAmount)).toThrow('Cannot subtract Money with different asset types')
    })
  })
})
