// Types
export * from './types'
export { FixedPointNumber } from './fixed-point'

// TODO: Implement the following functionality:
//
// Asset
// FungibleAsset (Currency)
//
// AssetAmount (Asset, bigint)
// Money (AssetAmount | AssetAmount[])
//
// Price
// * (Money, Money, time) // this allows modeling of batch prices (eg dutch auctions)
// * Optional "source" // what do we want here?
//
// parsing for...
//   JSON
// serialization for...
//
// safe math
// * Add two Money's together
// unsafe math
// * divide a money
//
// tagged literal types
//
// We need a "concretize money"
// * Splits off a rounded and non-rounded
//
// Formatting
