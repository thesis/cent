import { render, screen } from '@testing-library/react'
import { Money } from '@thesis-co/cent'
import { MoneyDisplay } from '../../src/components/MoneyDisplay'

describe('MoneyDisplay', () => {
  describe('basic rendering', () => {
    it('renders formatted money value', () => {
      render(<MoneyDisplay value={Money('$100.50')} />)
      expect(screen.getByText('$100.50')).toBeInTheDocument()
    })

    it('renders with string value', () => {
      render(<MoneyDisplay value="$200.00" />)
      expect(screen.getByText('$200.00')).toBeInTheDocument()
    })

    it('renders nothing for null value without placeholder', () => {
      const { container } = render(<MoneyDisplay value={null} />)
      expect(container).toBeEmptyDOMElement()
    })

    it('renders placeholder for null value', () => {
      render(<MoneyDisplay value={null} placeholder="—" />)
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('renders placeholder for undefined value', () => {
      render(<MoneyDisplay value={undefined} placeholder="N/A" />)
      expect(screen.getByText('N/A')).toBeInTheDocument()
    })
  })

  describe('formatting options', () => {
    it('applies compact notation', () => {
      render(<MoneyDisplay value={Money('$1500000')} compact />)
      // Compact notation varies by browser, just check it renders
      expect(screen.getByText(/\$1\.5M|\$1,500K/)).toBeInTheDocument()
    })

    it('applies maxDecimals', () => {
      render(<MoneyDisplay value={Money('$100.999')} maxDecimals={2} />)
      expect(screen.getByText('$101.00')).toBeInTheDocument()
    })

    it('excludes currency when requested', () => {
      render(<MoneyDisplay value={Money('$100.00')} excludeCurrency />)
      expect(screen.getByText('100.00')).toBeInTheDocument()
    })
  })

  describe('showSign prop', () => {
    it('shows negative sign by default for negative values', () => {
      render(<MoneyDisplay value={Money('-$50.00')} />)
      expect(screen.getByText(/-\$50\.00|-50\.00/)).toBeInTheDocument()
    })

    it('shows positive sign when showSign is always', () => {
      render(<MoneyDisplay value={Money('$50.00')} showSign="always" />)
      expect(screen.getByText(/\+\$50\.00/)).toBeInTheDocument()
    })

    it('hides sign when showSign is never', () => {
      render(<MoneyDisplay value={Money('-$50.00')} showSign="never" />)
      expect(screen.getByText('$50.00')).toBeInTheDocument()
    })
  })

  describe('custom rendering', () => {
    it('passes parts to children function', () => {
      render(
        <MoneyDisplay value={Money('$99.99')}>
          {({ formatted, isNegative, isZero }) => (
            <span data-testid="custom">
              {formatted} - neg:{String(isNegative)} - zero:{String(isZero)}
            </span>
          )}
        </MoneyDisplay>
      )

      const element = screen.getByTestId('custom')
      expect(element).toHaveTextContent('$99.99')
      expect(element).toHaveTextContent('neg:false')
      expect(element).toHaveTextContent('zero:false')
    })

    it('provides money instance in parts', () => {
      let receivedMoney: Money | null = null

      render(
        <MoneyDisplay value={Money('$100.00')}>
          {({ money }) => {
            receivedMoney = money
            return <span>test</span>
          }}
        </MoneyDisplay>
      )

      expect(receivedMoney).not.toBeNull()
      expect(receivedMoney!.toString()).toBe('$100.00')
    })
  })

  describe('styling', () => {
    it('applies className', () => {
      render(<MoneyDisplay value={Money('$100')} className="my-class" />)
      expect(screen.getByText('$100.00')).toHaveClass('my-class')
    })

    it('applies style', () => {
      render(<MoneyDisplay value={Money('$100')} style={{ color: 'red' }} />)
      expect(screen.getByText('$100.00')).toHaveStyle({ color: 'red' })
    })

    it('renders as different element type', () => {
      render(<MoneyDisplay value={Money('$100')} as="div" data-testid="money" />)
      const element = screen.getByTestId('money')
      expect(element.tagName).toBe('DIV')
    })
  })
})
