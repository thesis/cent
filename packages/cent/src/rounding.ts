/**
 * Rounding modes for money operations.
 *
 * Maps common rounding mode names (UP, DOWN, HALF_UP, etc.) to the
 * underlying Intl.NumberFormat rounding modes.
 *
 * @example
 * import { Money, Round } from '@thesis-co/cent';
 *
 * const price = Money("$100.00");
 * price.divide(3, Round.HALF_UP);     // $33.33
 * price.divide(3, Round.HALF_EVEN);   // $33.33 (banker's rounding)
 * price.divide(3, Round.CEILING);     // $33.34
 *
 * @see {@link https://tc39.es/ecma402/#sec-intl.numberformat-internal-slots}
 */

import { RoundingMode } from "./types"

/**
 * Rounding modes for money arithmetic operations.
 *
 * These modes determine how to handle values that fall exactly between
 * two representable values (ties) and general rounding direction.
 */
export const Round = {
  /**
   * Round away from zero.
   * - Positive: round toward +∞
   * - Negative: round toward -∞
   *
   * @example
   * 2.1 → 3, 2.5 → 3, 2.9 → 3
   * -2.1 → -3, -2.5 → -3, -2.9 → -3
   */
  UP: RoundingMode.EXPAND,

  /**
   * Round toward zero (truncate).
   * - Positive: round toward -∞
   * - Negative: round toward +∞
   *
   * @example
   * 2.1 → 2, 2.5 → 2, 2.9 → 2
   * -2.1 → -2, -2.5 → -2, -2.9 → -2
   */
  DOWN: RoundingMode.TRUNC,

  /**
   * Round toward positive infinity.
   *
   * @example
   * 2.1 → 3, 2.5 → 3, 2.9 → 3
   * -2.1 → -2, -2.5 → -2, -2.9 → -2
   */
  CEILING: RoundingMode.CEIL,

  /**
   * Round toward negative infinity.
   *
   * @example
   * 2.1 → 2, 2.5 → 2, 2.9 → 2
   * -2.1 → -3, -2.5 → -3, -2.9 → -3
   */
  FLOOR: RoundingMode.FLOOR,

  /**
   * Round to nearest, ties away from zero.
   * This is the most common "commercial" rounding mode.
   *
   * @example
   * 2.4 → 2, 2.5 → 3, 2.6 → 3
   * -2.4 → -2, -2.5 → -3, -2.6 → -3
   */
  HALF_UP: RoundingMode.HALF_EXPAND,

  /**
   * Round to nearest, ties toward zero.
   *
   * @example
   * 2.4 → 2, 2.5 → 2, 2.6 → 3
   * -2.4 → -2, -2.5 → -2, -2.6 → -3
   */
  HALF_DOWN: RoundingMode.HALF_TRUNC,

  /**
   * Round to nearest, ties toward even (banker's rounding).
   * Reduces cumulative rounding error over many operations.
   *
   * @example
   * 2.5 → 2, 3.5 → 4, 4.5 → 4, 5.5 → 6
   * -2.5 → -2, -3.5 → -4, -4.5 → -4, -5.5 → -6
   */
  HALF_EVEN: RoundingMode.HALF_EVEN,
} as const

/**
 * Type representing valid rounding modes for money operations.
 */
export type Round = (typeof Round)[keyof typeof Round]
