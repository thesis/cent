import { z } from "zod"

/**
 * Schema for bigint values serialized as strings (integers only)
 * Validates strings that represent valid signed integers
 */
export const BigIntStringSchema = z.string().regex(/^-?\d+$/, "Must be a valid integer string")

/**
 * Schema for non-negative bigint values serialized as strings
 * Validates strings that represent valid non-negative integers
 */
export const NonNegativeBigIntStringSchema = z.string().regex(/^\d+$/, "Must be a valid non-negative integer string")