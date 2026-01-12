# @thesis-co/cent-zod

Zod schemas for parsing and validating [`@thesis-co/cent`](https://www.npmjs.com/package/@thesis-co/cent) types.

## Installation

```bash
npm install @thesis-co/cent-zod
```

## Quick Example

```ts
import { zMoney, zMoneyString } from "@thesis-co/cent-zod"

// Parse money strings
zMoneyString.parse("$100.50") // Money

// With validation constraints
const schema = zMoney({
  currency: "USD",
  min: "$0.50",
  max: "$10000",
  positive: true,
})
```

## Documentation

See the [full documentation](./docs/) for all schemas including `zPrice`, `zExchangeRate`, `zPriceRange`, and `zCurrency`.
