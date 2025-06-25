export type FixedPoint = {
  amount: bigint
  decimals: bigint
}

export type Asset = {
  name: string
}

export type FungibleAsset = Asset & {
  // the commonly used code of an asset, defined for national currencies
  // by ISO-4217, and for alternative currencies by convention. Eg "USD",
  // "EUR", or "BTC"
  code: string
  // the number of decimals needed to represent the smallest commonly
  // transferrable fractional unit of a fungible asset. Eg, 2 for USD ($0.01)
  // or 10 for BTC (0.0000000001)
  decimals: bigint
  // a name for the smallest transferrable, fraction unit of a fungible asset.
  // Eg "cent" for USD or "satoshi" for BTC.
  //
  // If multiple strings are provided, the additional strings are aliases for
  // the first, which is the official name of the unit. Eg ["satoshi", "sat"]
  // for BTC.
  //
  // If a record is provided, the number key is the number of decimals, and
  // the string or strings are the names of the unit.
  //
  // Eg { 8: ["satoshi", "sat"], 12: ["millisatoshi", "millisat"] } for BTC.
  fractionalUnit?: string | string[] | Record<number, string | string[]>
}

export type Currency = FungibleAsset & {
  // the common currency symbol, eg $ for USD, R$ for the Brazillian real,
  // and ₿ for BTC
  symbol: string
}

export type AnyAsset = ( Asset | FungibleAsset | Currency )

export type AssetAmount = {
  asset: AnyAsset
  // the amount of an asset, using a fixed-point. this allows reasoning about
  // sub-quantum amounts, eg $0.001 in USD, even though USD only has 2 decimals.
  amount: FixedPoint
}

// "tag" types that allow us to emulate nominal typing
declare const OpaqueTagSymbol: unique symbol
declare class OpaqueTag<S extends symbol> {
  readonly [OpaqueTagSymbol]: S
}

export type Opaque<T, S extends symbol> = T & OpaqueTag<S>

export type UnwrapOpaque<OpaqueType extends OpaqueTag<symbol>> =
  OpaqueType extends Opaque<infer Type, OpaqueType[typeof OpaqueTagSymbol]>
    ? Type
    : OpaqueType

// declare a "nominal" UNIX timestamp type the can only be used via casting
declare const UNIXTimeSymbol: unique symbol
export type UNIXTime = Opaque<string, typeof UNIXTimeSymbol>

// declare a "nominal" decimal string type that can only be used via casting
declare const DecimalStringSymbol: unique symbol
export type DecimalString = Opaque<string, typeof DecimalStringSymbol>

export type PricePoint = {
  amounts: [AssetAmount, AssetAmount]
  time: UNIXTime
}
