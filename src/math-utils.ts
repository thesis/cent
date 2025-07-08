/**
 * Calculate the greatest common divisor of two bigints
 *
 * @param a - First number
 * @param b - Second number
 * @returns The GCD of a and b
 */
export function gcd(a: bigint, b: bigint): bigint {
  // Make both numbers positive for GCD calculation
  let absA = a < 0n ? -a : a
  let absB = b < 0n ? -b : b

  while (absB !== 0n) {
    const temp = absB
    absB = absA % absB
    absA = temp
  }
  return absA
}

/**
 * Check if a number is composed only of factors of 2 and 5
 * This is important for fixed-point division because only such numbers
 * can be represented exactly in decimal notation
 *
 * @param n - The number to check (must be positive)
 * @returns true if n is composed only of factors of 2 and 5, false otherwise
 */
export function isOnlyFactorsOf2And5(n: bigint): boolean {
  if (n <= 0n) {
    return false
  }

  let remaining = n
  // Remove all factors of 2
  while (remaining % 2n === 0n) {
    remaining /= 2n
  }

  // Remove all factors of 5
  while (remaining % 5n === 0n) {
    remaining /= 5n
  }

  // If only factors of 2 and 5, we should be left with 1
  return remaining === 1n
}
