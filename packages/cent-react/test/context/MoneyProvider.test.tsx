import { render, screen } from '@testing-library/react'
import { MoneyProvider, useMoneyContext } from '../../src/context/MoneyProvider'

// Test component that displays context values
function ContextDisplay() {
  const { locale, defaultCurrency } = useMoneyContext()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="currency">{defaultCurrency ?? 'none'}</span>
    </div>
  )
}

describe('MoneyProvider', () => {
  describe('default values', () => {
    it('provides default locale without provider', () => {
      render(<ContextDisplay />)
      expect(screen.getByTestId('locale')).toHaveTextContent('en-US')
    })

    it('provides null defaultCurrency without provider', () => {
      render(<ContextDisplay />)
      expect(screen.getByTestId('currency')).toHaveTextContent('none')
    })
  })

  describe('with provider', () => {
    it('provides custom locale', () => {
      render(
        <MoneyProvider locale="de-DE">
          <ContextDisplay />
        </MoneyProvider>
      )
      expect(screen.getByTestId('locale')).toHaveTextContent('de-DE')
    })

    it('provides custom defaultCurrency', () => {
      render(
        <MoneyProvider defaultCurrency="EUR">
          <ContextDisplay />
        </MoneyProvider>
      )
      expect(screen.getByTestId('currency')).toHaveTextContent('EUR')
    })

    it('provides multiple values', () => {
      render(
        <MoneyProvider locale="fr-FR" defaultCurrency="CHF">
          <ContextDisplay />
        </MoneyProvider>
      )
      expect(screen.getByTestId('locale')).toHaveTextContent('fr-FR')
      expect(screen.getByTestId('currency')).toHaveTextContent('CHF')
    })
  })

  describe('nesting', () => {
    it('nested provider overrides parent values', () => {
      render(
        <MoneyProvider locale="en-US" defaultCurrency="USD">
          <MoneyProvider locale="de-DE" defaultCurrency="EUR">
            <ContextDisplay />
          </MoneyProvider>
        </MoneyProvider>
      )
      expect(screen.getByTestId('locale')).toHaveTextContent('de-DE')
      expect(screen.getByTestId('currency')).toHaveTextContent('EUR')
    })

    it('nested provider inherits unspecified values from parent', () => {
      render(
        <MoneyProvider locale="en-GB" defaultCurrency="GBP">
          <MoneyProvider locale="de-DE">
            <ContextDisplay />
          </MoneyProvider>
        </MoneyProvider>
      )
      expect(screen.getByTestId('locale')).toHaveTextContent('de-DE')
      expect(screen.getByTestId('currency')).toHaveTextContent('GBP')
    })
  })

  describe('exchangeRateResolver', () => {
    it('provides resolver to context', () => {
      const mockResolver = jest.fn()
      let receivedResolver: typeof mockResolver | null = null

      function ResolverCapture() {
        const { exchangeRateResolver } = useMoneyContext()
        receivedResolver = exchangeRateResolver
        return null
      }

      render(
        <MoneyProvider exchangeRateResolver={mockResolver}>
          <ResolverCapture />
        </MoneyProvider>
      )

      expect(receivedResolver).toBe(mockResolver)
    })

    it('inherits resolver from parent when not specified', () => {
      const mockResolver = jest.fn()
      let receivedResolver: typeof mockResolver | null = null

      function ResolverCapture() {
        const { exchangeRateResolver } = useMoneyContext()
        receivedResolver = exchangeRateResolver
        return null
      }

      render(
        <MoneyProvider exchangeRateResolver={mockResolver}>
          <MoneyProvider locale="de-DE">
            <ResolverCapture />
          </MoneyProvider>
        </MoneyProvider>
      )

      expect(receivedResolver).toBe(mockResolver)
    })
  })
})
