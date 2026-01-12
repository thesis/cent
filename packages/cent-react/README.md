# @thesis-co/cent-react

React components and hooks for [`@thesis-co/cent`](https://www.npmjs.com/package/@thesis-co/cent) - display, input, and manage money values.

## Installation

```bash
npm install @thesis-co/cent @thesis-co/cent-react
```

## Quick Example

```tsx
import { MoneyDisplay, MoneyInput, MoneyProvider } from '@thesis-co/cent-react';
import { Money } from '@thesis-co/cent';

function App() {
  const [amount, setAmount] = useState<Money | null>(null);

  return (
    <MoneyProvider locale="en-US" defaultCurrency="USD">
      <MoneyInput
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        currency="USD"
      />
      <MoneyDisplay value={amount} />
    </MoneyProvider>
  );
}
```

## Documentation

See the [full documentation](https://cent.thesis.co/docs/react) for all components (`MoneyDisplay`, `MoneyInput`, `MoneyDiff`) and hooks (`useMoney`, `useExchangeRate`).
