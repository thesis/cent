# @thesis-co/cent-react

React bindings for [@thesis-co/cent](https://www.npmjs.com/package/@thesis-co/cent) - display, input, and manage money values with ease.

## Installation

```bash
npm install @thesis-co/cent @thesis-co/cent-react
```

## Quick Start

### Display Money

```tsx
import { MoneyDisplay } from '@thesis-co/cent-react';
import { Money } from '@thesis-co/cent';

// Basic usage
<MoneyDisplay value={Money("$1234.56")} />
// → "$1,234.56"

// Compact notation
<MoneyDisplay value={Money("$1500000")} compact />
// → "$1.5M"

// Crypto with satoshis
<MoneyDisplay value={Money("0.001 BTC")} preferredUnit="sat" />
// → "100,000 sats"

// Locale formatting
<MoneyDisplay value={Money("€1234.56")} locale="de-DE" />
// → "1.234,56 €"

// Null handling with placeholder
<MoneyDisplay value={null} placeholder="—" />
// → "—"
```

### Custom Parts Rendering

```tsx
<MoneyDisplay value={Money("$99.99")}>
  {({ parts, isNegative }) => (
    <span className={isNegative ? 'text-red-500' : ''}>
      {parts.map((part, i) => (
        <span key={i} className={part.type}>
          {part.value}
        </span>
      ))}
    </span>
  )}
</MoneyDisplay>
```

### Money Input

```tsx
import { MoneyInput } from '@thesis-co/cent-react';
import { Money } from '@thesis-co/cent';

function PaymentForm() {
  const [amount, setAmount] = useState<Money | null>(null);

  return (
    <MoneyInput
      name="amount"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      currency="USD"
      min="$1"
      max="$10000"
      placeholder="Enter amount"
    />
  );
}
```

### With react-hook-form

```tsx
import { Controller, useForm } from 'react-hook-form';
import { MoneyInput } from '@thesis-co/cent-react';

function CheckoutForm() {
  const { control, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="amount"
        control={control}
        render={({ field }) => (
          <MoneyInput {...field} currency="USD" />
        )}
      />
    </form>
  );
}
```

### useMoney Hook

```tsx
import { useMoney, MoneyDisplay } from '@thesis-co/cent-react';

function TipCalculator() {
  const bill = useMoney({ currency: 'USD' });
  const tip = bill.money?.multiply(0.18) ?? null;

  return (
    <div>
      <input {...bill.inputProps} placeholder="Bill amount" />
      {bill.error && <span className="error">{bill.error.message}</span>}

      <p>Tip (18%): <MoneyDisplay value={tip} /></p>
      <p>Total: <MoneyDisplay value={bill.money?.add(tip ?? Money.zero('USD'))} /></p>
    </div>
  );
}
```

### MoneyProvider

Set default configuration for all descendant components:

```tsx
import { MoneyProvider } from '@thesis-co/cent-react';

function App() {
  return (
    <MoneyProvider locale="de-DE" defaultCurrency="EUR">
      <YourApp />
    </MoneyProvider>
  );
}
```

### useExchangeRate Hook

```tsx
import { useExchangeRate, MoneyDisplay } from '@thesis-co/cent-react';
import { Money } from '@thesis-co/cent';

function CurrencyConverter() {
  const [usd, setUsd] = useState(Money.zero('USD'));

  const { convert, isLoading, isStale, refetch } = useExchangeRate({
    from: 'USD',
    to: 'EUR',
    pollInterval: 60000, // Refresh every minute
    staleThreshold: 300000, // Stale after 5 minutes
  });

  const eur = convert(usd);

  return (
    <div>
      <MoneyInput value={usd} onChange={(e) => setUsd(e.target.value)} currency="USD" />

      {isLoading ? (
        <span>Loading...</span>
      ) : (
        <MoneyDisplay value={eur} />
      )}

      {isStale && (
        <button onClick={refetch}>Rate may be outdated. Refresh?</button>
      )}
    </div>
  );
}
```

**Note:** `useExchangeRate` requires an `exchangeRateResolver` to be provided via `MoneyProvider`:

```tsx
<MoneyProvider
  exchangeRateResolver={async (from, to) => {
    const response = await fetch(`/api/rates/${from}/${to}`);
    const data = await response.json();
    return new ExchangeRate(from, to, data.rate);
  }}
>
  <App />
</MoneyProvider>
```

### MoneyDiff

Display the difference between two money values:

```tsx
import { MoneyDiff } from '@thesis-co/cent-react';
import { Money } from '@thesis-co/cent';

// Basic difference
<MoneyDiff value={Money("$120")} compareTo={Money("$100")} />
// → "+$20.00"

// With percentage change
<MoneyDiff
  value={Money("$120")}
  compareTo={Money("$100")}
  showPercentage
/>
// → "+$20.00 (+20.00%)"

// Custom rendering
<MoneyDiff value={newPrice} compareTo={oldPrice}>
  {({ direction, formatted }) => (
    <span className={direction === 'increase' ? 'text-green-500' : 'text-red-500'}>
      {formatted.difference}
    </span>
  )}
</MoneyDiff>
```

## API Reference

### Components

| Component | Description |
|-----------|-------------|
| `MoneyDisplay` | Display formatted money values |
| `MoneyInput` | Controlled input for money values |
| `MoneyDiff` | Display difference between two values |
| `MoneyProvider` | Context provider for default configuration |

### Hooks

| Hook | Description |
|------|-------------|
| `useMoney` | Manage money state with validation |
| `useExchangeRate` | Fetch and manage exchange rates |
| `useMoneyConfig` | Access MoneyProvider context |

## Requirements

- React 17.0.0 or later
- @thesis-co/cent 0.0.5 or later
