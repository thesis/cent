import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Money } from '@thesis-co/cent'
import { MoneyInput } from '../../src/components/MoneyInput'

describe('MoneyInput', () => {
  describe('basic rendering', () => {
    it('renders an input element', () => {
      render(<MoneyInput name="amount" currency="USD" />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('displays controlled value', () => {
      render(<MoneyInput name="amount" currency="USD" value={Money('$100.00')} />)
      expect(screen.getByRole('textbox')).toHaveValue('100.00')
    })

    it('displays placeholder', () => {
      render(<MoneyInput name="amount" currency="USD" placeholder="Enter amount" />)
      expect(screen.getByPlaceholderText('Enter amount')).toBeInTheDocument()
    })
  })

  describe('user input', () => {
    it('calls onChange with parsed Money value', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(<MoneyInput name="amount" currency="USD" onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '50.00')

      expect(onChange).toHaveBeenCalled()
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(lastCall.target.name).toBe('amount')
      expect(lastCall.target.value).not.toBeNull()
    })

    it('calls onValueChange with Money value', async () => {
      const user = userEvent.setup()
      const onValueChange = jest.fn()

      render(<MoneyInput name="amount" currency="USD" onValueChange={onValueChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '75')

      expect(onValueChange).toHaveBeenCalled()
    })

    it('handles clearing input', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(<MoneyInput name="amount" currency="USD" value={Money('$100')} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.clear(input)

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(lastCall.target.value).toBeNull()
    })
  })

  describe('formatting', () => {
    it('formats value on blur when formatOnBlur is true with controlled value', () => {
      const value = Money('$1234.50')
      render(
        <MoneyInput name="amount" currency="USD" value={value} formatOnBlur={true} />
      )

      const input = screen.getByRole('textbox')
      // Controlled value should display formatted (without currency since excludeCurrency)
      expect(input).toHaveValue('1,234.50')
    })

    it('displays unformatted value when controlled value is set', () => {
      const value = Money('$100')
      render(
        <MoneyInput name="amount" currency="USD" value={value} formatOnBlur={true} />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('100.00')
    })
  })

  describe('validation', () => {
    it('allows negative values by default', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(<MoneyInput name="amount" currency="USD" onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '-50')

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(lastCall.target.value?.isNegative()).toBe(true)
    })

    it('converts negative to positive when allowNegative is false', async () => {
      const user = userEvent.setup()
      const onChange = jest.fn()

      render(<MoneyInput name="amount" currency="USD" onChange={onChange} allowNegative={false} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '-50')

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(lastCall.target.value?.isNegative()).toBe(false)
    })
  })

  describe('props passthrough', () => {
    it('passes disabled prop', () => {
      render(<MoneyInput name="amount" currency="USD" disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('passes className', () => {
      render(<MoneyInput name="amount" currency="USD" className="my-input" />)
      expect(screen.getByRole('textbox')).toHaveClass('my-input')
    })

    it('sets inputMode to decimal', () => {
      render(<MoneyInput name="amount" currency="USD" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('inputMode', 'decimal')
    })
  })

  describe('ref forwarding', () => {
    it('forwards ref to input element', () => {
      const ref = { current: null as HTMLInputElement | null }
      render(<MoneyInput name="amount" currency="USD" ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })
  })
})
