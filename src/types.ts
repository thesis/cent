export type FixedPointNumber = {
  amount: bigint
  decimals: number
}

export type Asset = {
  name: string
}

// TODO where is the quantum display name?

export type FungibleAsset = Asset & {
  // the commonly used code of an asset, eg "USD" or "BTC"
  code: string
  // the number of decimals needed to represent the smallest commonly
  // transferrable "quantum" of a fungible asset. Eg, 2 for USD ($0.01)
  // or 10 for BTC (0.0000000001)
  decimals: number
}

export type Currency = FungibleAsset & {
  // the common currency symbol, eg $ for USD, R$ for the Brazillian real,
  // and ₿ for BTC
  symbol: string
}

export type AnyAsset = ( Asset | FungibleAsset | Currency )

export type AssetAmount = {
  asset: AnyAsset
  amount: bigint
}
