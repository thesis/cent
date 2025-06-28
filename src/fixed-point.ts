import { FixedPoint, Ratio, DecimalString } from "./types"
import { BigIntStringSchema, NonNegativeBigIntStringSchema } from "./validation-schemas"
import { isOnlyFactorsOf2And5 } from "./math-utils"
import { z } from "zod"

export const FixedPointJSONSchema = z.object({
  amount: BigIntStringSchema,
  decimals: NonNegativeBigIntStringSchema
})

export class FixedPointNumber implements FixedPoint, Ratio {
  #amount: bigint
  #decimals: bigint

  /**
   * Get the amount value
   * @returns The amount as a bigint
   */
  get amount(): bigint {
    return this.#amount
  }

  /**
   * Get the decimals value
   * @returns The decimals as a bigint
   */
  get decimals(): bigint {
    return this.#decimals
  }

  /**
   * Get the numerator of the rational representation
   * @returns The amount as the numerator
   */
  get p(): bigint {
    return this.#amount
  }

  /**
   * Get the denominator of the rational representation
   * @returns 10^decimals as the denominator
   */
  get q(): bigint {
    return 10n ** this.#decimals
  }

  /**
   * Create a new FixedPointNumber instance
   *
   * @param amount - The raw amount value as a bigint
   * @param decimals - The number of decimal places
   */
  constructor(amount?: bigint, decimals?: bigint) {
    this.#amount = amount ?? 0n
    this.#decimals = decimals ?? 0n
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
   * Divide this fixed-point number by another value and return the result.
   * Only allows division by values that are composed only of factors of 2 and 5,
   * ensuring the result can be represented exactly in decimal notation.
   *
   * @param other - The value to divide by (either a FixedPoint or a bigint)
   * @returns A new FixedPointNumber instance with the quotient
   * @throws Error if the divisor contains factors other than 2 and 5, or if dividing by zero
   */
  divide(other: FixedPoint | bigint): FixedPointNumber {
    if (typeof other === 'bigint') {
      if (other === 0n) {
        throw new Error("Cannot divide by zero")
      }
      
      const divisor = other < 0n ? -other : other
      if (!isOnlyFactorsOf2And5(divisor)) {
        throw new Error(`Cannot divide by ${other}: divisor must be composed only of factors of 2 and 5`)
      }
      
      // To divide by a number exactly in decimal, we need to determine
      // how many decimal places are needed. For a number that's only 
      // factors of 2 and 5, we can represent 1/n exactly.
      
      // Find the power of 10 that makes the division exact
      let tempDivisor = divisor
      let powerOf10Needed = 1n
      
      // For each factor of 2, we need a factor of 5 in the power of 10
      // For each factor of 5, we need a factor of 2 in the power of 10
      let factorsOf2 = 0n
      let factorsOf5 = 0n
      
      while (tempDivisor % 2n === 0n) {
        tempDivisor = tempDivisor / 2n
        factorsOf2++
      }
      
      while (tempDivisor % 5n === 0n) {
        tempDivisor = tempDivisor / 5n
        factorsOf5++
      }
      
      // We need enough factors of both 2 and 5 to balance the divisor
      const neededFactors = factorsOf2 > factorsOf5 ? factorsOf2 : factorsOf5
      powerOf10Needed = 10n ** neededFactors
      
      // Scale up the dividend and perform integer division
      const scaledDividend = this.amount * powerOf10Needed
      const result = scaledDividend / divisor
      
      return new FixedPointNumber(
        other < 0n ? -result : result,
        this.decimals + neededFactors
      )
    }

    // Division by FixedPoint
    if (other.amount === 0n) {
      throw new Error("Cannot divide by zero")
    }
    
    // Check if the divisor (other.amount) is composed only of factors of 2 and 5
    const divisorAmount = other.amount < 0n ? -other.amount : other.amount
    if (!isOnlyFactorsOf2And5(divisorAmount)) {
      throw new Error(`Cannot divide by ${other.amount}/${10n ** other.decimals}: divisor numerator must be composed only of factors of 2 and 5`)
    }
    
    // Convert to rational form and use the same logic as bigint division
    // (a/10^m) ÷ (b/10^n) = (a/10^m) * (10^n/b) = (a * 10^n) / (b * 10^m)
    // But we can simplify this to: multiply by (10^n) then divide by b, then scale appropriately
    
    // Scale up the dividend by the divisor's denominator
    const scaledDividend = this.amount * (10n ** other.decimals)
    
    // Now we need to divide by other.amount and figure out the right number of decimals
    const divisor = other.amount < 0n ? -other.amount : other.amount
    
    // Find the power of 10 needed for exact division by the divisor
    let tempDivisor = divisor
    let factorsOf2 = 0n
    let factorsOf5 = 0n
    
    while (tempDivisor % 2n === 0n) {
      tempDivisor = tempDivisor / 2n
      factorsOf2++
    }
    
    while (tempDivisor % 5n === 0n) {
      tempDivisor = tempDivisor / 5n
      factorsOf5++
    }
    
    // We need enough factors of both 2 and 5 to balance the divisor
    const neededFactors = factorsOf2 > factorsOf5 ? factorsOf2 : factorsOf5
    const powerOf10Needed = 10n ** neededFactors
    
    // Scale up the dividend further and perform integer division
    const finalDividend = scaledDividend * powerOf10Needed
    const result = finalDividend / divisor
    
    return new FixedPointNumber(
      other.amount < 0n ? -result : result,
      this.decimals + other.decimals + neededFactors
    )
  }

  /**
   * Convert the fixed-point number to a string representation
   *
   * @returns A string representation of the number (e.g., "10234.25")
   */
  toString(): DecimalString {
    const factor = 10n ** this.decimals
    const wholePart = this.amount / factor
    const fractionPart = this.amount % factor

    // convert fraction part to string and pad with leading zeros if needed
    // take absolute value to handle negative numbers correctly
    let fractionStr = fractionPart < 0n ? (-fractionPart).toString() : fractionPart.toString()
    const padding = Number(this.decimals) - fractionStr.length
    if (padding > 0) {
      fractionStr = '0'.repeat(padding) + fractionStr
    }

    // if decimals is 0, just return the whole part
    if (this.decimals === 0n) {
      return wholePart.toString() as DecimalString
    }

    return `${wholePart.toString()}.${fractionStr}` as DecimalString
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
   * @param unsafe - If true, allows precision loss when scaling down (default: false)
   * @returns A new FixedPointNumber with the same decimal count as other (or original if unsafe=false and precision would be lost)
   */
  normalize(other: FixedPoint, unsafe: boolean = false): FixedPointNumber {
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
      
      if (unsafe) {
        // Allow precision loss
        return new FixedPointNumber(this.amount / scaleFactor, other.decimals)
      } else {
        // Only scale down if no precision is lost
        if (this.amount % scaleFactor === 0n) {
          // No precision lost, can scale down
          return new FixedPointNumber(this.amount / scaleFactor, other.decimals)
        } else {
          // Would lose precision, keep original precision
          return new FixedPointNumber(this.amount, this.decimals)
        }
      }
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
    // validate the string format using a regex pattern that supports negative numbers
    const validNumberPattern = /^-?\d+(\.\d+)?$/
    if (!validNumberPattern.test(str)) {
      throw new Error(`Invalid number format: "${str}". Expected format: digits with optional decimal point and fractional part.`)
    }

    // check if the number is negative
    const isNegative = str.startsWith('-')
    const absoluteStr = isNegative ? str.slice(1) : str

    // split the string into whole and fractional parts
    const [wholePart, fractionPart = ''] = absoluteStr.split('.')

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

    // apply the sign
    if (isNegative) {
      amount = -amount
    }

    return new FixedPointNumber(amount, decimals)
  }

  /**
   * Check if this FixedPointNumber represents zero
   *
   * @returns true if the amount is zero, false otherwise
   */
  isZero(): boolean {
    return this.amount === 0n
  }

  /**
   * Check if this FixedPointNumber is less than another FixedPoint
   *
   * @param other - The other number to compare with
   * @returns true if this number is less than other, false otherwise
   */
  lessThan(other: FixedPoint): boolean {
    if (this.decimals === other.decimals) {
      return this.amount < other.amount
    }

    const maxDecimals = this.decimals > other.decimals ? this.decimals : other.decimals
    const normalizedThis = this.decimals === maxDecimals ? this : this.normalize({ amount: 0n, decimals: maxDecimals })
    const normalizedOther = other.decimals === maxDecimals ? other : FixedPointNumber.fromFixedPoint(other).normalize({ amount: 0n, decimals: maxDecimals })

    return normalizedThis.amount < normalizedOther.amount
  }

  /**
   * Check if this FixedPointNumber is less than or equal to another FixedPoint
   *
   * @param other - The other number to compare with
   * @returns true if this number is less than or equal to other, false otherwise
   */
  lessThanOrEqual(other: FixedPoint): boolean {
    return this.lessThan(other) || this.equals(other)
  }

  /**
   * Check if this FixedPointNumber is greater than another FixedPoint
   *
   * @param other - The other number to compare with
   * @returns true if this number is greater than other, false otherwise
   */
  greaterThan(other: FixedPoint): boolean {
    if (this.decimals === other.decimals) {
      return this.amount > other.amount
    }

    const maxDecimals = this.decimals > other.decimals ? this.decimals : other.decimals
    const normalizedThis = this.decimals === maxDecimals ? this : this.normalize({ amount: 0n, decimals: maxDecimals })
    const normalizedOther = other.decimals === maxDecimals ? other : FixedPointNumber.fromFixedPoint(other).normalize({ amount: 0n, decimals: maxDecimals })

    return normalizedThis.amount > normalizedOther.amount
  }

  /**
   * Check if this FixedPointNumber is greater than or equal to another FixedPoint
   *
   * @param other - The other number to compare with
   * @returns true if this number is greater than or equal to other, false otherwise
   */
  greaterThanOrEqual(other: FixedPoint): boolean {
    return this.greaterThan(other) || this.equals(other)
  }

  /**
   * Check if this FixedPointNumber is positive (greater than zero)
   *
   * @returns true if the amount is positive, false otherwise
   */
  isPositive(): boolean {
    return this.amount > 0n
  }

  /**
   * Check if this FixedPointNumber is negative (less than zero)
   *
   * @returns true if the amount is negative, false otherwise
   */
  isNegative(): boolean {
    return this.amount < 0n
  }

  /**
   * Return the maximum of this FixedPointNumber and other(s)
   *
   * @param other - The other FixedPoint(s) to compare with
   * @returns The FixedPointNumber with the largest value
   */
  max(other: FixedPoint | FixedPoint[]): FixedPointNumber {
    const others = Array.isArray(other) ? other : [other]
    let maxValue: FixedPointNumber = this

    for (const fp of others) {
      if (maxValue.lessThan(fp)) {
        maxValue = FixedPointNumber.fromFixedPoint(fp)
      }
    }

    return maxValue
  }

  /**
   * Return the minimum of this FixedPointNumber and other(s)
   *
   * @param other - The other FixedPoint(s) to compare with
   * @returns The FixedPointNumber with the smallest value
   */
  min(other: FixedPoint | FixedPoint[]): FixedPointNumber {
    const others = Array.isArray(other) ? other : [other]
    let minValue: FixedPointNumber = this

    for (const fp of others) {
      if (minValue.greaterThan(fp)) {
        minValue = FixedPointNumber.fromFixedPoint(fp)
      }
    }

    return minValue
  }

  /**
   * Serialize this FixedPointNumber to JSON
   *
   * @returns A JSON-serializable object with amount and decimals as strings
   */
  toJSON(): { amount: string; decimals: string } {
    return {
      amount: this.amount.toString(),
      decimals: this.decimals.toString()
    }
  }

  /**
   * Create a FixedPointNumber from JSON data
   *
   * @param json - The JSON data to deserialize
   * @returns A new FixedPointNumber instance
   * @throws Error if the JSON data is invalid
   */
  static fromJSON(json: any): FixedPointNumber {
    const parsed = FixedPointJSONSchema.parse(json)

    return new FixedPointNumber(BigInt(parsed.amount), BigInt(parsed.decimals))
  }
}
