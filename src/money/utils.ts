import { FixedPointNumber } from "../fixed-point"
import { RationalNumber } from "../rationals"
import type { MoneyAmount } from "./types"

/**
 * Type guard to check if a MoneyAmount is a FixedPointNumber
 */
export function isFixedPointNumber(amount: MoneyAmount): amount is FixedPointNumber {
  return amount instanceof FixedPointNumber
}

/**
 * Type guard to check if a MoneyAmount is a RationalNumber  
 */
export function isRationalNumber(amount: MoneyAmount): amount is RationalNumber {
  return amount instanceof RationalNumber
}

/**
 * Convert a MoneyAmount to a FixedPointNumber for display purposes
 * - If already FixedPointNumber, returns as-is
 * - If RationalNumber, converts via toDecimalString() with specified precision
 */
export function toFixedPointNumber(amount: MoneyAmount, precision: bigint = 18n): FixedPointNumber {
  if (isFixedPointNumber(amount)) {
    return amount
  }
  
  // Convert RationalNumber to decimal string then parse as FixedPointNumber
  const decimalString = amount.toDecimalString(precision)
  return FixedPointNumber.fromDecimalString(decimalString)
}

/**
 * Get the underlying numeric value for comparison purposes
 * Returns a comparable representation (decimal string) for both types
 */
export function getComparableValue(amount: MoneyAmount): string {
  if (isFixedPointNumber(amount)) {
    return amount.toString()
  } else {
    return amount.toDecimalString(50n)
  }
}

/**
 * Check if a MoneyAmount represents zero
 */
export function isZero(amount: MoneyAmount): boolean {
  if (isFixedPointNumber(amount)) {
    return amount.isZero()
  } else {
    return amount.isZero()
  }
}

/**
 * Check if a MoneyAmount is positive
 */
export function isPositive(amount: MoneyAmount): boolean {
  if (isFixedPointNumber(amount)) {
    return amount.isPositive()
  } else {
    return amount.isPositive()
  }
}

/**
 * Check if a MoneyAmount is negative
 */
export function isNegative(amount: MoneyAmount): boolean {
  if (isFixedPointNumber(amount)) {
    return amount.isNegative()
  } else {
    return amount.isNegative()
  }
}