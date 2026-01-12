# @thesis-co/cent-zod

Zod schemas for parsing and validating `@thesis-co/cent` types.

```bash
pnpm add @thesis-co/cent-zod
```

## Schemas

### zMoney

```ts
import { zMoney, zMoneyString } from "@thesis-co/cent-zod"

zMoneyString.parse("$100.50") // MoneyClass

// With constraints
zMoney({
  currency: "USD",
  min: "$0.50",
  max: "$10000",
  positive: true,
})
```

### zPrice

```ts
import { zPrice } from "@thesis-co/cent-zod"

zPrice().parse({ numerator: "$50,000", denominator: "1 BTC" })
zPrice().parse(["$50,000", "1 BTC"])

// Currency constraints
zPrice("USD", "BTC")
```

### zExchangeRate

```ts
import { zExchangeRate } from "@thesis-co/cent-zod"

zExchangeRate("USD", "EUR").parse({ base: "USD", quote: "EUR", rate: "0.92" })

// With staleness check
zExchangeRate({ base: "BTC", quote: "USD", maxAge: 60000 })
```

### zPriceRange

```ts
import { zPriceRange } from "@thesis-co/cent-zod"

zPriceRange().parse("$50 - $100")
zPriceRange().parse({ min: "$50", max: "$100" })

// With constraints
zPriceRange({
  currency: "USD",
  bounds: { min: "$0", max: "$10000" },
  minSpan: "$10",
})
```

### zCurrency

```ts
import { zCurrency } from "@thesis-co/cent-zod"

zCurrency().parse("USD") // Currency object
zCurrency({ allowed: ["USD", "EUR", "GBP"] })
zCurrency({ type: "crypto" })
```

## Type Inference

```ts
import { z } from "zod"
import { zMoney } from "@thesis-co/cent-zod"

const schema = zMoney("USD")
type USDMoney = z.infer<typeof schema> // MoneyClass
```
