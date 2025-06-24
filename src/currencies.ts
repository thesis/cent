import { Currency } from "./types"

export const USD: Currency = {
  name: 'US Dollar',
  code: 'USD',
  decimals: 2n,
  symbol: '$'
}

export const EUR: Currency = {
  name: 'Euro',
  code: 'EUR',
  decimals: 2n,
  symbol: '€'
}

export const BRL: Currency = {
  name: 'Brazilian Real',
  code: 'BRL',
  decimals: 2n,
  symbol: 'R$'
}

export const ARS: Currency = {
  name: 'Argentine Peso',
  code: 'ARS',
  decimals: 2n,
  symbol: '$'
}

export const MXN: Currency = {
  name: 'Mexican Peso',
  code: 'MXN',
  decimals: 2n,
  symbol: '$'
}

export const BTC: Currency = {
  name: 'Bitcoin',
  code: 'BTC',
  decimals: 8n,
  symbol: '₿'
}

// record of all currencies by code
export const currencies: Record<string, Currency> = {
  USD,
  EUR,
  BRL,
  ARS,
  MXN,
  BTC
}
