import { renderHook, act } from '@testing-library/react'
import { Money } from '@thesis-co/cent'
import { useMoney } from '../../src/hooks/useMoney'

describe('useMoney', () => {
  describe('initialization', () => {
    it('initializes with null when no initialValue provided', () => {
      const { result } = renderHook(() => useMoney({ currency: 'USD' }))
      expect(result.current.money).toBeNull()
    })

    it('initializes with Money from string initialValue', () => {
      const { result } = renderHook(() =>
        useMoney({ initialValue: '$100.00', currency: 'USD' })
      )
      expect(result.current.money).not.toBeNull()
      expect(result.current.money?.toString()).toBe('$100.00')
    })

    it('initializes with Money instance', () => {
      const initial = Money('$50.00')
      const { result } = renderHook(() => useMoney({ initialValue: initial }))
      expect(result.current.money?.toString()).toBe('$50.00')
    })
  })

  describe('setMoney', () => {
    it('sets money from string', () => {
      const { result } = renderHook(() => useMoney({ currency: 'USD' }))

      act(() => {
        result.current.setMoney('$200.00')
      })

      expect(result.current.money?.toString()).toBe('$200.00')
    })

    it('sets money from string with currency', () => {
      const { result } = renderHook(() => useMoney({ currency: 'USD' }))

      act(() => {
        result.current.setMoney('150')
      })

      expect(result.current.money?.toString()).toBe('$150.00')
    })

    it('sets money to null', () => {
      const { result } = renderHook(() =>
        useMoney({ initialValue: '$100', currency: 'USD' })
      )

      act(() => {
        result.current.setMoney(null)
      })

      expect(result.current.money).toBeNull()
    })

    it('sets money from Money instance', () => {
      const { result } = renderHook(() => useMoney({ currency: 'USD' }))

      act(() => {
        result.current.setMoney(Money('€50.00'))
      })

      expect(result.current.money?.toString()).toBe('€50.00')
    })
  })

  describe('validation', () => {
    it('returns isValid true when no constraints violated', () => {
      const { result } = renderHook(() =>
        useMoney({ initialValue: '$50', currency: 'USD', min: '$10', max: '$100' })
      )

      expect(result.current.isValid).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('returns error when value below min', () => {
      const { result } = renderHook(() =>
        useMoney({ initialValue: '$5', currency: 'USD', min: '$10' })
      )

      expect(result.current.isValid).toBe(false)
      expect(result.current.error).not.toBeNull()
      expect(result.current.error?.message).toContain('at least')
    })

    it('returns error when value above max', () => {
      const { result } = renderHook(() =>
        useMoney({ initialValue: '$150', currency: 'USD', max: '$100' })
      )

      expect(result.current.isValid).toBe(false)
      expect(result.current.error).not.toBeNull()
      expect(result.current.error?.message).toContain('at most')
    })

    it('isValid is true for null value', () => {
      const { result } = renderHook(() =>
        useMoney({ currency: 'USD', min: '$10' })
      )

      expect(result.current.money).toBeNull()
      expect(result.current.isValid).toBe(true)
    })
  })

  describe('format', () => {
    it('formats money with default options', () => {
      const { result } = renderHook(() =>
        useMoney({ initialValue: '$1234.56', currency: 'USD' })
      )

      expect(result.current.format()).toBe('$1,234.56')
    })

    it('formats with custom options', () => {
      const { result } = renderHook(() =>
        useMoney({ initialValue: '$1500000', currency: 'USD' })
      )

      expect(result.current.format({ compact: true })).toMatch(/\$1\.5M|\$1,500K/)
    })

    it('returns empty string for null money', () => {
      const { result } = renderHook(() => useMoney({ currency: 'USD' }))

      expect(result.current.format()).toBe('')
    })
  })

  describe('reset and clear', () => {
    it('reset returns to initial value', () => {
      const { result } = renderHook(() =>
        useMoney({ initialValue: '$100', currency: 'USD' })
      )

      act(() => {
        result.current.setMoney('$500')
      })
      expect(result.current.money?.toString()).toBe('$500.00')

      act(() => {
        result.current.reset()
      })
      expect(result.current.money?.toString()).toBe('$100.00')
    })

    it('clear sets money to null', () => {
      const { result } = renderHook(() =>
        useMoney({ initialValue: '$100', currency: 'USD' })
      )

      act(() => {
        result.current.clear()
      })
      expect(result.current.money).toBeNull()
    })
  })

  describe('inputProps', () => {
    it('provides value as string', () => {
      const { result } = renderHook(() =>
        useMoney({ initialValue: '$100', currency: 'USD' })
      )

      expect(result.current.inputProps.value).toBe('100.00')
    })

    it('provides empty string for null money', () => {
      const { result } = renderHook(() => useMoney({ currency: 'USD' }))

      expect(result.current.inputProps.value).toBe('')
    })

    it('onChange updates money', () => {
      const { result } = renderHook(() => useMoney({ currency: 'USD' }))

      act(() => {
        result.current.inputProps.onChange({
          target: { value: '75.50' },
        } as React.ChangeEvent<HTMLInputElement>)
      })

      expect(result.current.money?.toString()).toBe('$75.50')
    })

    it('onBlur formats the display value', () => {
      const { result } = renderHook(() =>
        useMoney({ initialValue: '$1234.5', currency: 'USD' })
      )

      act(() => {
        result.current.inputProps.onBlur()
      })

      // After blur, should be formatted with proper decimals
      expect(result.current.inputProps.value).toBe('1,234.50')
    })
  })
})
