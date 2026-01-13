# @thesis-co/cent-supabase

Integration for `@thesis-co/cent` for easy storage and querying in
Supabase.

## The problem

The Supabase client returns `DECIMAL` columns as JSON numbers, losing
precision:

```typescript
// Database stores: 19.99
const { data } = await supabase.from('products').select('price').single()
console.log(data.price)  // 19.990000000000002
```

This package wraps the Supabase client to cast money columns to text on the wire, then converts them to `Money` objects in your app.

## Installation

```bash
npm install @thesis-co/cent-supabase @thesis-co/cent @supabase/supabase-js
```

## Quick start

```typescript
import { createCentSupabaseClient } from '@thesis-co/cent-supabase'
import { Money } from '@thesis-co/cent'

const supabase = createCentSupabaseClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    tables: {
      products: {
        money: {
          // statically defined currencies (every price is in USD)
          price: { currencyCode: 'USD' },
          cost: { currencyCode: 'USD' }
        }
      },
      orders: {
        money: {
          // for dynamic currencies (each row has a
          // total and total_currency)
          total: { currencyColumn: 'total_currency' },
          tax: { currencyColumn: 'tax_currency' }
        }
      }
    }
  }
)

// SELECT — returns Money objects
const { data } = await supabase.from('products').select('*')
console.log(data[0].price.toString()) // "$29.99"

// INSERT — accepts Money objects
await supabase.from('orders').insert({
  total: Money('€150.00'),
  tax: Money('€15.00')
  // 'currency' column auto-populated as 'EUR'
})

// Aggregates work too
const { data: stats } = await supabase.from('orders').select('sum(total)').single()
console.log(stats.sum.toString()) // "$1,234.56"
```

## Configuration

### Static currency

When all rows use the same currency:

```typescript
products: {
  money: {
    price: { currencyCode: 'USD' }
  }
}
```

### Dynamic currency

When currency varies per row (stored in another column):

```typescript
orders: {
  money: {
    total: { currencyColumn: 'currency' }
  }
}
```

On insert, the currency column is auto-populated from the Money object.

### Minor units

When storing cents, satoshis, or wei as integers:

```typescript
transactions: {
  money: {
    amount_sats: { currencyCode: 'BTC', minorUnits: true }
  }
}
// Database: 150000000 → Money("1.5 BTC")
```

## Realtime

Subscriptions automatically transform payloads:

```typescript
supabase
  .channel('orders')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
    console.log(payload.new.total.toString()) // Money object
  })
  .subscribe()
```

## Helper functions

For RPC results or manual transformations:

```typescript
import { parseMoneyResult, serializeMoney, moneySelect } from '@thesis-co/cent-supabase'

// Transform RPC results
const { data } = await supabase.rpc('calculate_total', { order_id: '...' })
const result = parseMoneyResult(data, { total: { currencyCode: 'USD' } })

// Serialize Money for custom mutations
const serialized = serializeMoney({ price: Money('$99.99') }, { price: { currencyCode: 'USD' } })
// { price: '99.99' }

// Build select string with casts
moneySelect('id, name, price', ['price']) // "id, name, price::text"
```

## Limitations

- **Nested relations**: Money columns in nested selects (e.g., `orders(items(price))`) aren't auto-transformed. Use `parseMoneyResult` on nested data.
- **Computed expressions**: Use explicit `::text` cast: `.select('(price * qty)::text as subtotal')`
- **RPC functions**: Transform results with `parseMoneyResult`

## Database Schema

Use `DECIMAL`/`NUMERIC`, not PostgreSQL's `MONEY` type:

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total DECIMAL(19,4) NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

| Use Case | PostgreSQL Type |
|----------|-----------------|
| USD, EUR | `DECIMAL(19,4)` |
| BTC (8 decimals) | `DECIMAL(28,8)` |
| ETH (18 decimals) | `DECIMAL(38,18)` |
| Minor units | `BIGINT` |
