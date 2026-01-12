import type { Currency } from "../types"

// cryptocurrencies
export const BTC: Currency = {
  name: "Bitcoin",
  code: "BTC",
  decimals: 8n,
  symbol: "₿",
  fractionalUnit: {
    8: ["satoshi", "sat"],
    7: ["bit"],
    12: ["millisatoshi", "msat"],
  },
  iso4217Support: false,
}

export const ETH: Currency = {
  name: "Ether",
  code: "ETH",
  decimals: 18n,
  symbol: "Ξ",
  fractionalUnit: {
    18: ["wei"],
    16: ["kwei", "babbage"],
    13: ["gwei", "shannon"],
  },
  iso4217Support: false,
}

export const SOL: Currency = {
  name: "Solana",
  code: "SOL",
  decimals: 9n,
  symbol: "◎",
  fractionalUnit: "lamport",
  iso4217Support: false,
}

export const USDC: Currency = {
  name: "USD Coin",
  code: "USDC",
  decimals: 6n,
  symbol: "USDC",
  iso4217Support: false,
}

export const USDT: Currency = {
  name: "Tether",
  code: "USDT",
  decimals: 6n,
  symbol: "USDT",
  iso4217Support: false,
}

export const MATS: Currency = {
  name: "Mezo magic sats",
  code: "mats",
  decimals: 0n,
  symbol: "mats",
  iso4217Support: false,
}

export const MUSD: Currency = {
  name: "Mezo USD",
  code: "MUSD",
  decimals: 18n,
  symbol: "MUSD",
  iso4217Support: false,
}

export const MEZO: Currency = {
  name: "MEZO",
  code: "MEZO",
  decimals: 18n,
  symbol: "MEZO",
  iso4217Support: false,
}
