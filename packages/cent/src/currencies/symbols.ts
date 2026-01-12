import type { Currency } from "../types"
import { BTC, ETH } from "./crypto"
import {
  AED,
  AFN,
  ALL,
  AMD,
  ANG,
  AOA,
  AWG,
  AZN,
  BAM,
  BDT,
  BGN,
  BHD,
  BOB,
  BRL,
  BTN,
  BWP,
  CHF,
  CRC,
  CZK,
  DZD,
  ERN,
  ETB,
  EUR,
  GBP,
  GEL,
  GHS,
  GMD,
  GTQ,
  HRK,
  HTG,
  HUF,
  IDR,
  ILS,
  INR,
  JPY,
  KES,
  KGS,
  KHR,
  KRW,
  KWD,
  KZT,
  LAK,
  LBP,
  LSL,
  LYD,
  MAD,
  MGA,
  MKD,
  MMK,
  MNT,
  MRU,
  MVR,
  MYR,
  MZN,
  NGN,
  NIO,
  OMR,
  PAB,
  PEN,
  PHP,
  PLN,
  PYG,
  QAR,
  RON,
  RSD,
  RUB,
  SAR,
  SDG,
  SEK,
  SLE,
  SSP,
  STN,
  SZL,
  THB,
  TND,
  TOP,
  TRY,
  UAH,
  USD,
  UZS,
  VND,
  VUV,
  ZAR,
  ZMW,
} from "./fiat"

/**
 * Primary currency mapping for symbol disambiguation
 *
 * Priority based on global trading volume (Bank for International Settlements, 2022):
 * 1. USD, 2. EUR, 3. JPY, 4. GBP, 5. AUD, 6. CAD, 7. CHF, 8. CNY, 9. SEK, 10. NZD...
 *
 * For symbols shared by multiple currencies, the highest-traded currency takes priority.
 * Developers can use explicit currency codes for non-primary currencies.
 */
export const PRIMARY_SYMBOL_MAP = {
  // Major trading currencies (unambiguous symbols)
  "€": EUR, // Euro - unambiguous
  "₿": BTC, // Bitcoin - unambiguous
  Ξ: ETH, // Ethereum - unambiguous

  // Dollar symbol priority (by trading volume)
  $: USD, // #1 - US Dollar (88% of all trades)
  // Others: AUD (#5), CAD (#6), NZD (#10), SGD, HKD, etc. - use currency codes

  // Pound symbol priority (by trading volume)
  "£": GBP, // #4 - British Pound Sterling (most traded £)
  // Others: EGP, FKP, GIP, SHP, SSP - use currency codes

  // Yen symbol priority (by trading volume)
  "¥": JPY, // #3 - Japanese Yen (most traded internationally)
  // Others: CNY (#8) - use currency code

  // Swiss Franc (unambiguous among major currencies)
  Fr: CHF, // #7 - Swiss Franc (most traded "Fr")
  // Others: Various African francs - use currency codes

  // Krona priority (by trading volume)
  kr: SEK, // #9 - Swedish Krona (most traded krona)
  // Others: NOK, DKK, ISK - use currency codes

  // Won symbol priority (by trading volume)
  "₩": KRW, // South Korean Won (most traded won)
  // Others: KPW - use currency code

  // Rupee symbol priority (by trading volume)
  "₨": INR, // Indian Rupee (most traded rupee - but uses ₹, this is for compatibility)
  // Others: PKR, LKR, MUR, NPR, SCR - use currency codes

  // Other major symbols (mostly unambiguous or clear primary)
  "₹": INR, // Indian Rupee - primary rupee symbol
  R$: BRL, // Brazilian Real - unambiguous
  "₽": RUB, // Russian Ruble - unambiguous
  "₴": UAH, // Ukrainian Hryvnia - unambiguous
  "₺": TRY, // Turkish Lira - unambiguous
  "₸": KZT, // Kazakhstani Tenge - unambiguous
  "₼": AZN, // Azerbaijani Manat - unambiguous
  "₾": GEL, // Georgian Lari - unambiguous
  "₵": GHS, // Ghanaian Cedi - unambiguous
  "₲": PYG, // Paraguayan Guaraní - unambiguous
  "₱": PHP, // Philippine Peso - unambiguous
  "₮": MNT, // Mongolian Tögrög - unambiguous
  "₭": LAK, // Lao Kip - unambiguous
  "₫": VND, // Vietnamese Đồng - unambiguous
  "₪": ILS, // Israeli New Shekel - unambiguous
  "₦": NGN, // Nigerian Naira - unambiguous
  "₡": CRC, // Costa Rican Colón - unambiguous
  "៛": KHR, // Cambodian Riel - unambiguous
  "฿": THB, // Thai Baht - unambiguous
  "৳": BDT, // Bangladeshi Taka - unambiguous
  "؋": AFN, // Afghan Afghani - unambiguous
  "֏": AMD, // Armenian Dram - unambiguous

  // European currencies
  zł: PLN, // Polish Złoty - unambiguous
  Kč: CZK, // Czech Koruna - unambiguous
  lei: RON, // Romanian Leu - unambiguous
  лв: BGN, // Bulgarian Lev - unambiguous
  kn: HRK, // Croatian Kuna - unambiguous
  Ft: HUF, // Hungarian Forint - unambiguous

  // Middle Eastern currencies
  "﷼": SAR, // Saudi Riyal (most traded riyal)
  "د.إ": AED, // UAE Dirham - unambiguous
  "ر.ق": QAR, // Qatari Riyal - unambiguous
  "د.ك": KWD, // Kuwaiti Dinar - unambiguous
  "ر.ع.": OMR, // Omani Rial - unambiguous
  "د.ت": TND, // Tunisian Dinar - unambiguous
  "د.م.": MAD, // Moroccan Dirham - unambiguous
  "ج.س.": SSP, // South Sudanese Pound - unambiguous
  "ل.ل": LBP, // Lebanese Pound - unambiguous
  "ل.د": LYD, // Libyan Dinar - unambiguous

  // African currencies
  Br: ETB, // Ethiopian Birr (most common Br usage)
  R: ZAR, // South African Rand (most traded R)
  Sh: KES, // Kenyan Shilling (major Sh usage)

  // Asian currencies
  RM: MYR, // Malaysian Ringgit - unambiguous
  Rp: IDR, // Indonesian Rupiah - unambiguous
  ރ: MVR, // Maldivian Rufiyaa - unambiguous

  // Oceania currencies
  Vt: VUV, // Vanuatu Vatu - unambiguous
  T$: TOP, // Tongan Paʻanga - unambiguous

  // Other symbols with limited usage
  ƒ: AWG, // Aruban Florin (primary usage)
  L: ALL, // Albanian Lek (common L usage)
  P: BWP, // Botswana Pula (common P usage)
  "S/": PEN, // Peruvian Sol - unambiguous
  Bs: BOB, // Bolivian Boliviano (primary Bs)
  Q: GTQ, // Guatemalan Quetzal - unambiguous
  C$: NIO, // Nicaraguan Córdoba (primary C$)
  "B/.": PAB, // Panamanian Balboa - unambiguous
  Le: SLE, // Sierra Leonean Leone - unambiguous
  D: GMD, // Gambian Dalasi - unambiguous
  Db: STN, // São Tomé and Príncipe Dobra - unambiguous
  K: ZMW, // Zambian Kwacha - unambiguous
  MT: MZN, // Mozambican Metical - unambiguous
  Nfk: ERN, // Eritrean Nakfa - unambiguous
  Nu: BTN, // Bhutanese Ngultrum - unambiguous
  ZK: ZMW, // Alternative Zambian Kwacha symbol
  UM: MRU, // Mauritanian Ouguiya - unambiguous
  DA: DZD, // Algerian Dinar - unambiguous
  Kz: AOA, // Angolan Kwanza - unambiguous
  Ar: MGA, // Malagasy Ariary - unambiguous
  E: SZL, // Swazi Lilangeni - unambiguous
  T: KZT, // Kazakhstani Tenge (alternative symbol)
  m: LSL, // Lesotho Loti - unambiguous
  G: HTG, // Haitian Gourde - unambiguous
  BD: BHD, // Bahraini Dinar - unambiguous
  Ks: MMK, // Myanmar Kyat - unambiguous
  KM: BAM, // Bosnia and Herzegovina Convertible Mark - unambiguous
  MK: MKD, // Macedonian Denar - unambiguous
  ден: MKD, // Macedonian Denar (Cyrillic) - unambiguous
  дин: RSD, // Serbian Dinar - unambiguous
  ЅМ: RSD, // Serbian Dinar (alternative) - unambiguous
  с: KGS, // Kyrgystani Som - unambiguous
  сўм: UZS, // Uzbekistani Som - unambiguous
  "£S": SDG, // Sudanese Pound - unambiguous
  "◎": LAK, // Alternative Lao Kip symbol
} as const

export type PrimarySymbol = keyof typeof PRIMARY_SYMBOL_MAP

/**
 * Get the primary currency for a given symbol
 */
export function getPrimaryCurrency(symbol: string) {
  return PRIMARY_SYMBOL_MAP[symbol as PrimarySymbol]
}

/**
 * Check if a symbol has a primary currency mapping
 */
export function isPrimarySymbol(symbol: string): symbol is PrimarySymbol {
  return symbol in PRIMARY_SYMBOL_MAP
}

/**
 * Symbol priority documentation for developers
 */
export const SYMBOL_PRIORITY_NOTES = {
  $: "USD (most traded dollar currency - others use currency codes)",
  "£": "GBP (most traded pound currency - others use currency codes)",
  "¥": "JPY (most traded yen currency - CNY uses currency code)",
  Fr: "CHF (Swiss Franc - most traded franc)",
  kr: "SEK (Swedish Krona - most traded krona)",
  "₩": "KRW (South Korean Won - most traded won)",
  "₨": "INR (for compatibility - prefer ₹)",
  "₹": "INR (primary Indian Rupee symbol)",
  "﷼": "SAR (Saudi Riyal - most traded riyal)",
} as const

/**
 * Fractional unit symbol information
 */
export interface FractionalUnitSymbol {
  unit: string // Unit name: "sat", "cent", "pence"
  symbol: string // Symbol: "§", "¢", "p"
  decimals: number // Decimal places for this unit relative to base currency
  currency: Currency // Base currency this fractional unit belongs to
}

/**
 * Mapping of fractional unit symbols to their information
 * Priority based on usage frequency and disambiguation needs
 */
export const FRACTIONAL_UNIT_SYMBOLS: Record<string, FractionalUnitSymbol> = {
  "§": {
    unit: "sat",
    symbol: "§",
    decimals: 8,
    currency: BTC,
  },
  "¢": {
    unit: "cent",
    symbol: "¢",
    decimals: 2,
    currency: USD,
  },
  p: {
    unit: "pence",
    symbol: "p",
    decimals: 2,
    currency: GBP,
  },
} as const

export type FractionalUnitSymbolKey = keyof typeof FRACTIONAL_UNIT_SYMBOLS

/**
 * Get fractional unit information for a given symbol
 */
export function getFractionalUnitInfo(
  symbol: string,
): FractionalUnitSymbol | undefined {
  return FRACTIONAL_UNIT_SYMBOLS[symbol as FractionalUnitSymbolKey]
}

/**
 * Check if a symbol is a fractional unit symbol
 */
export function isFractionalUnitSymbol(
  symbol: string,
): symbol is FractionalUnitSymbolKey {
  return symbol in FRACTIONAL_UNIT_SYMBOLS
}
