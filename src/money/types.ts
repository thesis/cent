import { FixedPointNumber } from "../fixed-point"
import { RationalNumber } from "../rationals"

/**
 * Union type for Money amounts that can be either precise fixed-point or exact rational numbers
 * - FixedPointNumber: Fast decimal arithmetic for common operations
 * - RationalNumber: Exact precision for currency conversions that require division
 */
export type MoneyAmount = FixedPointNumber | RationalNumber
