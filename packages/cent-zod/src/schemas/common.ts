import { z } from "zod"

/**
 * Schema for bigint values serialized as strings
 */
export const zBigIntString = z
  .string()
  .regex(/^-?\d+$/, "Must be a valid integer string")
  .transform((val) => BigInt(val))

/**
 * Schema for non-negative bigint values
 */
export const zNonNegativeBigIntString = z
  .string()
  .regex(/^\d+$/, "Must be a valid non-negative integer string")
  .transform((val) => BigInt(val))

/**
 * Schema for FixedPoint JSON representation
 * Transforms to { amount: bigint, decimals: bigint }
 */
export const zFixedPointJSON = z.object({
  amount: zBigIntString,
  decimals: zNonNegativeBigIntString,
})

/**
 * Schema for RationalNumber JSON representation
 * Validates { p: string, q: string } (no transform - Money.fromJSON handles conversion)
 */
export const zRationalNumberJSON = z.object({
  p: z.string().regex(/^-?\d+$/, "Must be a valid integer string"),
  q: z.string().regex(/^-?\d+$/, "Must be a valid integer string"),
})

/**
 * Schema for decimal string input (e.g., "123.45")
 */
export const zDecimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, "Must be a valid decimal string")
