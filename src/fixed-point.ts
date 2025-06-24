import { FixedPoint } from "./types"

export class FixedPointNumber implements FixedPoint {
  readonly amount: bigint
  readonly decimals: bigint

  /**
   * Create a new FixedPointNumber instance
   *
   * @param amount - The raw amount value as a bigint
   * @param decimals - The number of decimal places
   */
  constructor(amount?: bigint, decimals?: bigint) {
    this.amount = amount ?? 0n
    this.decimals = decimals ?? 0n
  }

  static fromFixedPoint(fp: FixedPoint) {
    return new FixedPointNumber(fp.amount, fp.decimals)
  }

  /**
   * Add two fixed-point numbers together and return the result.
   *
   * @param other - The other number to add
   * @returns A new FixedPointNumber instance with the sum
   */
  add(other: FixedPoint): FixedPointNumber {
    const maxDecimals = this.decimals > other.decimals ? this.decimals : other.decimals
    const normalizedThis = this.decimals === maxDecimals ? this : this.normalize({ amount: 0n, decimals: maxDecimals })
    const normalizedOther = other.decimals === maxDecimals ? other : FixedPointNumber.fromFixedPoint(other).normalize({ amount: 0n, decimals: maxDecimals })

    return new FixedPointNumber(
      normalizedThis.amount + normalizedOther.amount,
      maxDecimals
    )
  }

  /**
   * Subtract another fixed-point number from this one and return the result.
   *
   * @param other - The number to subtract
   * @returns A new FixedPointNumber instance with the difference
   */
  subtract(other: FixedPoint): FixedPointNumber {
    const maxDecimals = this.decimals > other.decimals ? this.decimals : other.decimals
    const normalizedThis = this.decimals === maxDecimals ? this : this.normalize({ amount: 0n, decimals: maxDecimals })
    const normalizedOther = other.decimals === maxDecimals ? other : FixedPointNumber.fromFixedPoint(other).normalize({ amount: 0n, decimals: maxDecimals })

    return new FixedPointNumber(
      normalizedThis.amount - normalizedOther.amount,
      maxDecimals
    )
  }

  /**
   * Multiply this fixed-point number by another value and return the result.
   *
   * @param other - The value to multiply by (either a FixedPoint or a bigint)
   * @returns A new FixedPointNumber instance with the product
   */
  multiply(other: FixedPoint | bigint): FixedPointNumber {
    if (typeof other === 'bigint') {
      return new FixedPointNumber(
        this.amount * other,
        this.decimals
      )
    }

    const maxDecimals = this.decimals > other.decimals ? this.decimals : other.decimals
    const normalizedThis = this.decimals === maxDecimals ? this : this.normalize({ amount: 0n, decimals: maxDecimals })
    const normalizedOther = other.decimals === maxDecimals ? other : FixedPointNumber.fromFixedPoint(other).normalize({ amount: 0n, decimals: maxDecimals })

    const factor = 10n ** maxDecimals
    const result = (normalizedThis.amount * normalizedOther.amount) / factor

    return new FixedPointNumber(
      result,
      maxDecimals
    )
  }

  /**
   * Convert the fixed-point number to a string representation
   *
   * @returns A string representation of the number (e.g., "10234.25")
   */
  toString(): string {
    const factor = 10n ** this.decimals
    const wholePart = this.amount / factor
    const fractionPart = this.amount % factor

    // convert fraction part to string and pad with leading zeros if needed
    let fractionStr = fractionPart.toString()
    const padding = Number(this.decimals) - fractionStr.length
    if (padding > 0) {
      fractionStr = '0'.repeat(padding) + fractionStr
    }

    // if decimals is 0, just return the whole part
    if (this.decimals === 0n) {
      return wholePart.toString()
    }

    return `${wholePart.toString()}.${fractionStr}`
  }

  /**
   * Check if this FixedPointNumber is equal to another FixedPoint
   *
   * @param other - The other number to compare with
   * @returns true if the numbers are equal when normalized, false otherwise
   */
  equals(other: FixedPoint): boolean {
    // If both have the same decimals, just compare the amounts
    if (this.decimals === other.decimals) {
      return this.amount === other.amount
    }
    else if (this.decimals > other.decimals) {
      return FixedPointNumber.fromFixedPoint(other).normalize(this).equals(this)
    }
    else {
      return this.normalize(other).equals(other)
    }
  }

  /**
   * Normalize this FixedPointNumber to match the decimal count of another FixedPoint
   *
   * @param other - The FixedPoint to match decimal count with
   * @returns A new FixedPointNumber with the same decimal count as other
   */
  normalize(other: FixedPoint): FixedPointNumber {
    if (this.decimals === other.decimals) {
      return new FixedPointNumber(this.amount, this.decimals)
    }

    if (this.decimals < other.decimals) {
      // Scale up: multiply by 10^(other.decimals - this.decimals)
      const scaleFactor = 10n ** (other.decimals - this.decimals)
      return new FixedPointNumber(this.amount * scaleFactor, other.decimals)
    } else {
      // Scale down: divide by 10^(this.decimals - other.decimals)
      const scaleFactor = 10n ** (this.decimals - other.decimals)
      return new FixedPointNumber(this.amount / scaleFactor, other.decimals)
    }
  }

  /**
   * Parse a string representation of a number into a FixedPointNumber
   *
   * @param str - The string to parse (e.g., "10234.25")
   * @param decimals - The number of decimal places to use
   * @returns A new FixedPointNumber instance
   * @throws Error if the string format is invalid
   */
  static parseString(str: string, decimals: bigint): FixedPointNumber {
    // validate the string format using a regex pattern
    const validNumberPattern = /^\d+(\.\d+)?$/
    if (!validNumberPattern.test(str)) {
      throw new Error(`Invalid number format: "${str}". Expected format: digits with optional decimal point and fractional part.`)
    }

    // split the string into whole and fractional parts
    const [wholePart, fractionPart = ''] = str.split('.')

    // calculate the factor for the specified number of decimals
    const factor = 10n ** decimals

    // convert whole part to bigint and multiply by the factor
    let amount = BigInt(wholePart) * factor

    // if there's a fraction part, handle it
    if (fractionPart) {
      // truncate or pad the fraction part to match the required decimals
      const adjustedFraction = fractionPart.padEnd(Number(decimals), '0').slice(0, Number(decimals))
      // add the fraction part to the amount
      amount += BigInt(adjustedFraction)
    }

    return new FixedPointNumber(amount, decimals)
  }
}
