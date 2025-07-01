/**
 * Calculate the greatest common divisor of two bigints
 *
 * @param a - First number
 * @param b - Second number
 * @returns The GCD of a and b
 */
export function gcd(a: bigint, b: bigint): bigint {
  // Make both numbers positive for GCD calculation
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b

  while (b !== 0n) {
    const temp = b
    b = a % b
    a = temp
  }
  return a
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

  // Remove all factors of 2
  while (n % 2n === 0n) {
    n /= 2n
  }

  // Remove all factors of 5
  while (n % 5n === 0n) {
    n /= 5n
  }

  // If only factors of 2 and 5, we should be left with 1
  return n === 1n
}
