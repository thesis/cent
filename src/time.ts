import { z } from "zod"
import type { UNIXTime, UTCTime } from "./types"

/**
 * Zod schema for validating UNIX timestamps
 *
 * Validates that the input is a string representing a valid UNIX timestamp:
 * - Must be a string of digits (allowing negative for pre-1970 dates)
 * - Must represent a valid timestamp (not too far in past/future)
 * - Supports both seconds and milliseconds precision
 */
export const UNIXTimeSchema = z
  .string()
  .regex(/^-?\d+$/, "UNIX timestamp must be a valid integer string")
  .refine(
    (value) => {
      const timestamp = parseInt(value, 10)

      // Check if it's a reasonable timestamp
      // Allow from year 1900 (-2208988800) to year 2100 (4102444800)
      // Support both seconds and milliseconds timestamps
      const minTimestamp = -2208988800 // 1900-01-01 in seconds
      const maxTimestamp = 4102444800000 // 2100-01-01 in milliseconds

      return timestamp >= minTimestamp && timestamp <= maxTimestamp
    },
    {
      message: "UNIX timestamp must be between 1900 and 2100",
    },
  )

/**
 * Type guard to check if a string is a valid UNIX timestamp
 *
 * @param value - The value to check
 * @returns true if the value is a valid UNIX timestamp
 */
export function isUNIXTime(value: string): value is UNIXTime {
  return UNIXTimeSchema.safeParse(value).success
}

/**
 * Cast a validated string to UNIXTime type
 *
 * @param value - The string value to cast (must be pre-validated)
 * @returns The value cast as UNIXTime
 * @throws Error if the value is not a valid UNIX timestamp
 */
export function toUNIXTime(value: string): UNIXTime {
  const result = UNIXTimeSchema.safeParse(value)

  if (!result.success) {
    throw new Error(`Invalid UNIX timestamp: ${result.error.message}`)
  }

  return value as UNIXTime
}

/**
 * Get the current UNIX timestamp as UNIXTime
 *
 * @param precision - Whether to return seconds or milliseconds (default: milliseconds)
 * @returns Current timestamp as UNIXTime
 */
export function nowUNIXTime(
  precision: "seconds" | "milliseconds" = "milliseconds",
): UNIXTime {
  const now = Date.now()
  const timestamp = precision === "seconds" ? Math.floor(now / 1000) : now
  return timestamp.toString() as UNIXTime
}

/**
 * Convert a Date object to UNIXTime
 *
 * @param date - The Date object to convert
 * @param precision - Whether to return seconds or milliseconds (default: milliseconds)
 * @returns The date as UNIXTime
 */
export function dateToUNIXTime(
  date: Date,
  precision: "seconds" | "milliseconds" = "milliseconds",
): UNIXTime {
  const timestamp =
    precision === "seconds" ? Math.floor(date.getTime() / 1000) : date.getTime()
  return toUNIXTime(timestamp.toString())
}

/**
 * Convert UNIXTime to a Date object
 *
 * @param unixTime - The UNIXTime to convert
 * @returns A Date object
 */
export function unixTimeToDate(unixTime: UNIXTime): Date {
  const timestamp = parseInt(unixTime, 10)

  // Auto-detect if timestamp is in seconds or milliseconds
  // Timestamps > 10^10 are likely milliseconds
  const isMilliseconds = timestamp > 10000000000
  const milliseconds = isMilliseconds ? timestamp : timestamp * 1000

  return new Date(milliseconds)
}

/**
 * Zod schema for validating UTC timestamps
 *
 * Validates that the input is a string representing a valid UTC timestamp:
 * - Must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
 * - Must represent a valid date/time
 * - Must end with 'Z' to indicate UTC timezone
 */
export const UTCTimeSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
    "UTC timestamp must be in ISO 8601 format with Z timezone (YYYY-MM-DDTHH:mm:ss.sssZ)",
  )
  .refine(
    (value) => {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) {
        return false
      }

      // For timestamps without milliseconds, normalize for comparison
      const expectedIso = value.includes(".")
        ? date.toISOString()
        : date.toISOString().replace(/\.\d{3}Z$/, "Z")

      return expectedIso === value
    },
    {
      message: "UTC timestamp must represent a valid date/time",
    },
  )

/**
 * Type guard to check if a string is a valid UTC timestamp
 *
 * @param value - The value to check
 * @returns true if the value is a valid UTC timestamp
 */
export function isUTCTime(value: string): value is UTCTime {
  return UTCTimeSchema.safeParse(value).success
}

/**
 * Cast a validated string to UTCTime type
 *
 * @param value - The string value to cast (must be pre-validated)
 * @returns The value cast as UTCTime
 * @throws Error if the value is not a valid UTC timestamp
 */
export function toUTCTime(value: string): UTCTime {
  const result = UTCTimeSchema.safeParse(value)

  if (!result.success) {
    throw new Error(`Invalid UTC timestamp: ${result.error.message}`)
  }

  return value as UTCTime
}

/**
 * Get the current UTC timestamp as UTCTime
 *
 * @param precision - Whether to include milliseconds (default: true)
 * @returns Current timestamp as UTCTime
 */
export function nowUTCTime(precision: boolean = true): UTCTime {
  const now = new Date()
  const isoString = now.toISOString()

  if (!precision) {
    // Remove milliseconds by replacing .sssZ with Z
    return isoString.replace(/\.\d{3}Z$/, "Z") as UTCTime
  }

  return isoString as UTCTime
}

/**
 * Convert a Date object to UTCTime
 *
 * @param date - The Date object to convert
 * @param precision - Whether to include milliseconds (default: true)
 * @returns The date as UTCTime
 */
export function dateToUTCTime(date: Date, precision: boolean = true): UTCTime {
  const isoString = date.toISOString()

  if (!precision) {
    // Remove milliseconds by replacing .sssZ with Z
    return toUTCTime(isoString.replace(/\.\d{3}Z$/, "Z"))
  }

  return toUTCTime(isoString)
}

/**
 * Convert UTCTime to a Date object
 *
 * @param utcTime - The UTCTime to convert
 * @returns A Date object
 */
export function utcTimeToDate(utcTime: UTCTime): Date {
  return new Date(utcTime)
}
