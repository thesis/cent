import { z } from "zod"
import { DecimalString } from "./types"

/**
 * Zod schema for validating decimal strings
 *
 * Validates that the input is a string representing a valid decimal number:
 * - Must be a string containing only digits, optional decimal point, and optional leading minus sign
 * - Supports integers (e.g., "123", "-456")
 * - Supports decimals (e.g., "123.45", "-0.001", ".5")
 * - Does not allow scientific notation, spaces, or other characters
 * - Does not allow trailing decimal points (e.g., "123." is invalid)
 */
export const DecimalStringSchema = z
  .string()
  .regex(
    /^-?(?:\d+(?:\.\d+)?|\.\d+)$/,
    "Decimal string must be a valid decimal number (e.g., '123', '123.45', '-0.001', '.5')",
  )
  .refine(
    (value) =>
      // Additional validation: ensure it's not just a decimal point
      value !== "." && value !== "-.",
    {
      message: "Decimal string cannot be just a decimal point",
    },
  )

/**
 * Type guard to check if a string is a valid decimal string
 *
 * @param value - The value to check
 * @returns true if the value is a valid decimal string
 */
export function isDecimalString(value: string): value is DecimalString {
  return DecimalStringSchema.safeParse(value).success
}

/**
 * Cast a validated string to DecimalString type
 *
 * @param value - The string value to cast (must be pre-validated)
 * @returns The value cast as DecimalString
 * @throws Error if the value is not a valid decimal string
 */
export function toDecimalString(value: string): DecimalString {
  const result = DecimalStringSchema.safeParse(value)

  if (!result.success) {
    throw new Error(`Invalid decimal string: ${result.error.message}`)
  }

  return value as DecimalString
}
