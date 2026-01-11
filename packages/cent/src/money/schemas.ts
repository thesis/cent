import { type ZodError, z } from "zod"
import { FixedPointJSONSchema } from "../fixed-point"
import { RationalNumberJSONSchema } from "../rationals"
import { NonNegativeBigIntStringSchema } from "../validation-schemas"

// Schema for basic Asset
export const AssetJSONSchema = z.object({
  name: z.string(),
})

// Schema for FungibleAsset (extends Asset)
export const FungibleAssetJSONSchema = AssetJSONSchema.extend({
  code: z.string(),
  decimals: NonNegativeBigIntStringSchema,
  fractionalUnit: z
    .union([
      z.string(),
      z.array(z.string()),
      z.record(z.string(), z.union([z.string(), z.array(z.string())])),
    ])
    .optional(),
})

// Schema for Currency (extends FungibleAsset)
export const CurrencyJSONSchema = FungibleAssetJSONSchema.extend({
  symbol: z.string(),
  iso4217Support: z.boolean().optional(),
})

// Union schema for any asset type
export const AnyAssetJSONSchema = z.union([
  CurrencyJSONSchema,
  FungibleAssetJSONSchema,
  AssetJSONSchema,
])

// Schema for MoneyAmount (union of FixedPointNumber and RationalNumber)
// Type is inferred from structure: {amount, decimals} vs {p, q}
const MoneyAmountJSONSchema = z.union([
  FixedPointJSONSchema, // {amount: string, decimals: string}
  RationalNumberJSONSchema, // {p: string, q: string}
])

// Schema for the complete Money JSON structure
export const MoneyJSONSchema = z.object({
  currency: AnyAssetJSONSchema,
  amount: MoneyAmountJSONSchema,
})

// Type for the validated Money JSON structure
export type MoneyJSON = z.infer<typeof MoneyJSONSchema>

/**
 * Safe validation of Money JSON data using Zod schema
 * @param data - The data to validate
 * @returns Result object with success flag and either data or error
 */
export function safeValidateMoneyJSON(data: unknown):
  | {
      success: true
      data: MoneyJSON
    }
  | {
      success: false
      error: ZodError
    } {
  const result = MoneyJSONSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}
