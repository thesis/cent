# @thesis-co/cent-supabase

Supabase integration for [`@thesis-co/cent`](https://www.npmjs.com/package/@thesis-co/cent) - store and query money values without precision loss.

## Installation

```bash
npm install @thesis-co/cent-supabase @thesis-co/cent @supabase/supabase-js
```

## Quick Example

```typescript
import { createCentSupabaseClient } from '@thesis-co/cent-supabase'

const supabase = createCentSupabaseClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    tables: {
      products: {
        money: { price: { currencyCode: 'USD' } }
      }
    }
  }
)

// SELECT returns Money objects
const { data } = await supabase.from('products').select('*')
console.log(data[0].price.toString()) // "$29.99"
```

## Documentation

See the [full documentation](https://cent.thesis.co/docs/supabase) for static/dynamic currencies, minor units, realtime subscriptions, and helper functions.
