// Import type extensions first
import "./types/intl-extensions"

// Core classes
export {
  MoneyJSONSchema,
  Money as MoneyClass,
  AssetJSONSchema,
  FungibleAssetJSONSchema,
  CurrencyJSONSchema,
  AnyAssetJSONSchema,
} from "./money"
export { FixedPointNumber, FixedPointJSONSchema } from "./fixed-point"
export { RationalNumber, RationalNumberJSONSchema, Rational } from "./rationals"
export { Price } from "./prices"
export { ExchangeRate, averageExchangeRate } from "./exchange-rates"
export { ExchangeRateSourceUtils } from "./exchange-rate-sources"
export type {
  ExchangeRateSource,
  ExchangeRateProvider,
  RateStalenessConfig,
} from "./exchange-rate-sources"

// Factory functions
export { MoneyFactory as Money } from "./money"
export { FixedPoint } from "./fixed-point"

// All currency constants
export * from "./currencies"

// Core types
export type {
  FixedPoint as FixedPointType,
  Ratio,
  Asset,
  FungibleAsset,
  Currency,
  AnyAsset,
  AssetAmount,
  DecimalString,
  RationalString,
  UNIXTime,
  UTCTime,
  PricePoint,
} from "./types"

// Money types
export type { MoneyAmount } from "./money/types"

// Money utilities
export {
  isFixedPointNumber,
  isRationalNumber,
  toFixedPointNumber,
  getComparableValue,
  isZero as isMoneyAmountZero,
  isPositive as isMoneyAmountPositive,
  isNegative as isMoneyAmountNegative,
} from "./money/utils"

// Rounding modes
export {
  RoundingMode,
  CEIL,
  FLOOR,
  EXPAND,
  TRUNC,
  HALF_CEIL,
  HALF_FLOOR,
  HALF_EXPAND,
  HALF_TRUNC,
  HALF_EVEN,
} from "./types"

// String utilities
export { isDecimalString, toDecimalString } from "./decimal-strings"

export {
  isFractionString,
  isRationalString,
  toRationalString,
  parseFraction,
  getRationalStringType,
} from "./rational-strings"
