import { renderHook, act, waitFor } from '@testing-library/react'
import { ExchangeRate, Money } from '@thesis-co/cent'
import type { ReactNode } from 'react'
import { MoneyProvider } from '../../src/context/MoneyProvider'
import { useExchangeRate } from '../../src/hooks/useExchangeRate'

describe('useExchangeRate', () => {
  const mockResolver = jest.fn()

  const wrapper = ({ children }: { children: ReactNode }) => (
    <MoneyProvider exchangeRateResolver={mockResolver}>{children}</MoneyProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initial state', () => {
    it('starts with null rate', () => {
      mockResolver.mockResolvedValue(null)

      const { result } = renderHook(
        () => useExchangeRate({ from: 'USD', to: 'EUR', enabled: false }),
        { wrapper }
      )

      expect(result.current.rate).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('returns error when no resolver configured', () => {
      const { result } = renderHook(() => useExchangeRate({ from: 'USD', to: 'EUR' }))

      // Should have error since no provider
      expect(result.current.error).not.toBeNull()
      expect(result.current.error?.message).toContain('No exchange rate resolver')
    })
  })

  describe('fetching', () => {
    it('does not fetch when enabled is false', () => {
      const { result } = renderHook(
        () => useExchangeRate({ from: 'USD', to: 'EUR', enabled: false }),
        { wrapper }
      )

      expect(mockResolver).not.toHaveBeenCalled()
      expect(result.current.rate).toBeNull()
    })

    it('calls resolver with correct currencies', async () => {
      mockResolver.mockResolvedValue(null)

      renderHook(
        () => useExchangeRate({ from: 'USD', to: 'EUR' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(mockResolver).toHaveBeenCalledWith('USD', 'EUR')
      })
    })
  })

  describe('staleness', () => {
    it('isStale is false initially when no rate fetched', () => {
      const { result } = renderHook(
        () => useExchangeRate({ from: 'USD', to: 'EUR', enabled: false, staleThreshold: 1000 }),
        { wrapper }
      )

      expect(result.current.isStale).toBe(false)
    })
  })

  describe('convert', () => {
    it('returns null when no rate available', () => {
      const { result } = renderHook(
        () => useExchangeRate({ from: 'USD', to: 'EUR', enabled: false }),
        { wrapper }
      )

      const usd = Money('$100')
      expect(result.current.convert(usd)).toBeNull()
    })
  })

  describe('options', () => {
    it('respects enabled option', () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => useExchangeRate({ from: 'USD', to: 'EUR', enabled }),
        { wrapper, initialProps: { enabled: false } }
      )

      expect(mockResolver).not.toHaveBeenCalled()

      // Enable and check if it fetches
      rerender({ enabled: true })

      // Just verify the hook doesn't crash
      expect(result.current.rate).toBeNull()
    })

    it('provides refetch function', () => {
      const { result } = renderHook(
        () => useExchangeRate({ from: 'USD', to: 'EUR', enabled: false }),
        { wrapper }
      )

      expect(typeof result.current.refetch).toBe('function')
    })
  })
})
