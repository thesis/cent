import { render, screen } from '@testing-library/react'
import { Money } from '@thesis-co/cent'
import { MoneyDiff } from '../../src/components/MoneyDiff'

describe('MoneyDiff', () => {
  describe('basic rendering', () => {
    it('renders positive difference with plus sign', () => {
      render(<MoneyDiff value={Money('$120')} compareTo={Money('$100')} />)
      expect(screen.getByText('+$20.00')).toBeInTheDocument()
    })

    it('renders negative difference with minus sign', () => {
      render(<MoneyDiff value={Money('$80')} compareTo={Money('$100')} />)
      expect(screen.getByText('-$20.00')).toBeInTheDocument()
    })

    it('renders zero difference without sign', () => {
      render(<MoneyDiff value={Money('$100')} compareTo={Money('$100')} />)
      expect(screen.getByText('$0.00')).toBeInTheDocument()
    })

    it('accepts string values', () => {
      render(<MoneyDiff value="$150" compareTo="$100" />)
      expect(screen.getByText('+$50.00')).toBeInTheDocument()
    })
  })

  describe('percentage display', () => {
    it('shows percentage when showPercentage is true', () => {
      render(<MoneyDiff value={Money('$120')} compareTo={Money('$100')} showPercentage />)
      expect(screen.getByText('+$20.00 (+20.00%)')).toBeInTheDocument()
    })

    it('shows negative percentage for decrease', () => {
      render(<MoneyDiff value={Money('$80')} compareTo={Money('$100')} showPercentage />)
      expect(screen.getByText('-$20.00 (-20.00%)')).toBeInTheDocument()
    })

    it('respects percentageDecimals option', () => {
      render(
        <MoneyDiff
          value={Money('$133.33')}
          compareTo={Money('$100')}
          showPercentage
          percentageDecimals={1}
        />
      )
      expect(screen.getByText(/33\.3%/)).toBeInTheDocument()
    })
  })

  describe('data-direction attribute', () => {
    it('sets data-direction to increase for positive diff', () => {
      render(<MoneyDiff value={Money('$120')} compareTo={Money('$100')} data-testid="diff" />)
      expect(screen.getByTestId('diff')).toHaveAttribute('data-direction', 'increase')
    })

    it('sets data-direction to decrease for negative diff', () => {
      render(<MoneyDiff value={Money('$80')} compareTo={Money('$100')} data-testid="diff" />)
      expect(screen.getByTestId('diff')).toHaveAttribute('data-direction', 'decrease')
    })

    it('sets data-direction to unchanged for zero diff', () => {
      render(<MoneyDiff value={Money('$100')} compareTo={Money('$100')} data-testid="diff" />)
      expect(screen.getByTestId('diff')).toHaveAttribute('data-direction', 'unchanged')
    })
  })

  describe('custom rendering', () => {
    it('passes render props to children function', () => {
      render(
        <MoneyDiff value={Money('$150')} compareTo={Money('$100')}>
          {({ direction, formatted, percentageChange }) => (
            <span data-testid="custom">
              {direction}: {formatted.difference} ({percentageChange}%)
            </span>
          )}
        </MoneyDiff>
      )

      expect(screen.getByTestId('custom')).toHaveTextContent('increase: +$50.00 (50.00%)')
    })

    it('provides Money instances in render props', () => {
      let receivedCurrent: Money | null = null
      let receivedDiff: Money | null = null

      render(
        <MoneyDiff value={Money('$120')} compareTo={Money('$100')}>
          {({ current, difference }) => {
            receivedCurrent = current
            receivedDiff = difference
            return <span>test</span>
          }}
        </MoneyDiff>
      )

      expect(receivedCurrent?.toString()).toBe('$120.00')
      expect(receivedDiff?.toString()).toBe('$20.00')
    })
  })

  describe('styling', () => {
    it('applies className', () => {
      render(
        <MoneyDiff
          value={Money('$120')}
          compareTo={Money('$100')}
          className="my-diff"
          data-testid="diff"
        />
      )
      expect(screen.getByTestId('diff')).toHaveClass('my-diff')
    })

    it('renders as different element type', () => {
      render(
        <MoneyDiff value={Money('$120')} compareTo={Money('$100')} as="div" data-testid="diff" />
      )
      expect(screen.getByTestId('diff').tagName).toBe('DIV')
    })
  })
})
