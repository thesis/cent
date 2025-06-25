// Types
export * from './types'
export { FixedPointNumber } from './fixed-point'
export { Money } from './money'

// TODO: Implement the following functionality:
//
// Price
// * (Money | Basket, Money | Basket, time) // this allows modeling of batch prices (eg dutch auctions)
// * (Money, Money, time) // normal prices
// * Optional "source" // what do we want here?
//
// tagged literal types
//
// Formatting
//
// Fixed-precision parsing of outside JSON
