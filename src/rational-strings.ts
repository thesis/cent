import { z } from "zod"
import { RationalString, Ratio } from "./types"

/**
 * Zod schema for validating fraction strings
 * 
 * Validates that the input is a string representing a valid fraction:
 * - Must be in the format "numerator/denominator"
 * - Both numerator and denominator must be valid integers
 * - Supports negative numerators (e.g., "-3/4")
 * - Whitespace around numerator/denominator is allowed
 * - Denominator cannot be zero
 */
export const FractionStringSchema = z
  .string()
  .regex(
    /^\s*-?\d+\s*\/\s*\d+\s*$/,
    "Fraction string must be in format 'numerator/denominator' (e.g., '3/4', '-22/7', ' 123 / 456 ')"
  )
  .refine(
    (value) => {
      // Additional validation: ensure denominator is not zero and both parts are valid integers
      const parts = value.split('/')
      if (parts.length !== 2) return false
      
      try {
        const numerator = BigInt(parts[0].trim())
        const denominator = BigInt(parts[1].trim())
        return denominator !== 0n
      } catch {
        // Invalid BigInt conversion means invalid format
        return false
      }
    },
    {
      message: "Denominator cannot be zero and both numerator and denominator must be valid integers"
    }
  )

/**
 * Combined schema for rational strings - accepts either fractions or decimal numbers
 */
export const RationalStringSchema = z.union([
  FractionStringSchema,
  z.string().regex(
    /^-?\d+(\.\d+)?$/,
    "Decimal string must be a valid decimal number (e.g., '123', '123.45', '-0.001')"
  )
])

/**
 * Type guard to check if a string is a valid fraction string
 * 
 * @param value - The value to check
 * @returns true if the value is a valid fraction string
 */
export function isFractionString(value: string): boolean {
  return FractionStringSchema.safeParse(value).success
}

/**
 * Type guard to check if a string is a valid rational string (fraction or decimal)
 * 
 * @param value - The value to check
 * @returns true if the value is a valid rational string
 */
export function isRationalString(value: string): value is RationalString {
  return RationalStringSchema.safeParse(value).success
}

/**
 * Cast a validated string to RationalString type
 * 
 * @param value - The string value to cast (must be pre-validated)
 * @returns The value cast as RationalString
 * @throws Error if the value is not a valid rational string
 */
export function toRationalString(value: string): RationalString {
  const result = RationalStringSchema.safeParse(value)
  
  if (!result.success) {
    throw new Error(`Invalid rational string: ${result.error.message}`)
  }
  
  return value as RationalString
}

/**
 * Parse a fraction string into a Ratio object
 * 
 * @param fractionStr - The fraction string to parse (e.g., "3/4", "-22/7")
 * @returns A Ratio object with numerator (p) and denominator (q)
 * @throws Error if the string is not a valid fraction format
 */
export function parseFraction(fractionStr: string): Ratio {
  const result = FractionStringSchema.safeParse(fractionStr)
  
  if (!result.success) {
    throw new Error(`Invalid fraction format: "${fractionStr}". ${result.error.message}`)
  }
  
  const parts = fractionStr.split('/')
  const p = BigInt(parts[0].trim())
  const q = BigInt(parts[1].trim())
  
  return { p, q }
}

/**
 * Determine if a rational string represents a fraction or decimal
 * 
 * @param rationalStr - The rational string to analyze
 * @returns "fraction" if it contains a slash, "decimal" otherwise
 */
export function getRationalStringType(rationalStr: string): "fraction" | "decimal" {
  return rationalStr.includes('/') ? "fraction" : "decimal"
}