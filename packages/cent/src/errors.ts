/**
 * Structured error types for cent library operations.
 *
 * All errors extend CentError and include:
 * - `code`: Machine-readable error identifier
 * - `suggestion`: Actionable guidance for fixing the error
 * - `example`: Code example showing correct usage (optional)
 *
 * @example
 * import { Money, CurrencyMismatchError } from '@thesis-co/cent';
 *
 * try {
 *   Money("$100").add(Money("€50"));
 * } catch (error) {
 *   if (error instanceof CurrencyMismatchError) {
 *     console.log(error.code);       // "CURRENCY_MISMATCH"
 *     console.log(error.suggestion); // "Convert one amount to match..."
 *   }
 * }
 */

/**
 * Error codes for all cent errors.
 */
export const ErrorCode = {
  // Parse errors
  PARSE_ERROR: "PARSE_ERROR",
  INVALID_NUMBER_FORMAT: "INVALID_NUMBER_FORMAT",
  INVALID_MONEY_STRING: "INVALID_MONEY_STRING",
  UNKNOWN_CURRENCY: "UNKNOWN_CURRENCY",

  // Currency errors
  CURRENCY_MISMATCH: "CURRENCY_MISMATCH",
  INCOMPATIBLE_CURRENCIES: "INCOMPATIBLE_CURRENCIES",

  // Division errors
  DIVISION_BY_ZERO: "DIVISION_BY_ZERO",
  DIVISION_REQUIRES_ROUNDING: "DIVISION_REQUIRES_ROUNDING",
  INVALID_DIVISOR: "INVALID_DIVISOR",

  // Precision errors
  PRECISION_LOSS: "PRECISION_LOSS",
  INVALID_PRECISION: "INVALID_PRECISION",

  // Input validation errors
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_RANGE: "INVALID_RANGE",
  INVALID_RATIO: "INVALID_RATIO",
  INVALID_JSON: "INVALID_JSON",
  EMPTY_ARRAY: "EMPTY_ARRAY",

  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",

  // Exchange rate errors
  INVALID_EXCHANGE_RATE: "INVALID_EXCHANGE_RATE",
  EXCHANGE_RATE_MISMATCH: "EXCHANGE_RATE_MISMATCH",
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

/**
 * Options for creating a CentError.
 */
export interface CentErrorOptions {
  /** Machine-readable error code */
  code: ErrorCode
  /** Human-readable error message */
  message: string
  /** Actionable suggestion for fixing the error */
  suggestion?: string
  /** Code example showing correct usage */
  example?: string
  /** The original error that caused this error */
  cause?: Error
}

/**
 * Base error class for all cent library errors.
 *
 * Extends the native Error class with additional properties for
 * better error handling and developer experience.
 */
export class CentError extends Error {
  /** Machine-readable error code */
  readonly code: ErrorCode
  /** Actionable suggestion for fixing the error */
  readonly suggestion?: string
  /** Code example showing correct usage */
  readonly example?: string
  /** The original error that caused this error */
  readonly originalCause?: Error

  constructor(options: CentErrorOptions) {
    super(options.message)
    this.name = "CentError"
    this.code = options.code
    this.suggestion = options.suggestion
    this.example = options.example
    this.originalCause = options.cause

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Returns a formatted error message including suggestion and example.
   */
  toDetailedString(): string {
    let result = `${this.name} [${this.code}]: ${this.message}`
    if (this.suggestion) {
      result += `\n\nSuggestion: ${this.suggestion}`
    }
    if (this.example) {
      result += `\n\nExample:\n${this.example}`
    }
    return result
  }
}

/**
 * Error thrown when parsing a string fails.
 *
 * This includes parsing money strings, number formats, currency codes, etc.
 */
export class ParseError extends CentError {
  /** The input string that failed to parse */
  readonly input: string

  constructor(
    input: string,
    message: string,
    options?: {
      code?: ErrorCode
      suggestion?: string
      example?: string
      cause?: Error
    }
  ) {
    super({
      code: options?.code ?? ErrorCode.PARSE_ERROR,
      message,
      suggestion: options?.suggestion,
      example: options?.example,
      cause: options?.cause,
    })
    this.name = "ParseError"
    this.input = input
  }
}

/**
 * Error thrown when operating on Money with different currencies.
 */
export class CurrencyMismatchError extends CentError {
  /** The expected currency code */
  readonly expected: string
  /** The actual currency code received */
  readonly actual: string

  constructor(
    expected: string,
    actual: string,
    operation: string,
    options?: { suggestion?: string; example?: string }
  ) {
    super({
      code: ErrorCode.CURRENCY_MISMATCH,
      message: `Cannot ${operation} Money with different currencies: expected ${expected}, got ${actual}`,
      suggestion:
        options?.suggestion ??
        `Convert one amount to ${expected} or ${actual} before performing the operation.`,
      example: options?.example,
    })
    this.name = "CurrencyMismatchError"
    this.expected = expected
    this.actual = actual
  }
}

/**
 * Error thrown when an operation would result in precision loss.
 */
export class PrecisionLossError extends CentError {
  constructor(
    message: string,
    options?: { suggestion?: string; example?: string; cause?: Error }
  ) {
    super({
      code: ErrorCode.PRECISION_LOSS,
      message,
      suggestion: options?.suggestion,
      example: options?.example,
      cause: options?.cause,
    })
    this.name = "PrecisionLossError"
  }
}

/**
 * Error thrown for division-related issues.
 *
 * This includes division by zero and division requiring rounding.
 */
export class DivisionError extends CentError {
  /** The divisor that caused the error */
  readonly divisor: string | number | bigint

  constructor(
    divisor: string | number | bigint,
    message: string,
    options?: {
      code?: ErrorCode
      suggestion?: string
      example?: string
    }
  ) {
    super({
      code: options?.code ?? ErrorCode.DIVISION_BY_ZERO,
      message,
      suggestion: options?.suggestion,
      example: options?.example,
    })
    this.name = "DivisionError"
    this.divisor = divisor
  }
}

/**
 * Error thrown when input validation fails.
 *
 * This includes invalid ranges, ratios, JSON, and other inputs.
 */
export class InvalidInputError extends CentError {
  constructor(
    message: string,
    options?: {
      code?: ErrorCode
      suggestion?: string
      example?: string
      cause?: Error
    }
  ) {
    super({
      code: options?.code ?? ErrorCode.INVALID_INPUT,
      message,
      suggestion: options?.suggestion,
      example: options?.example,
      cause: options?.cause,
    })
    this.name = "InvalidInputError"
  }
}

/**
 * Error thrown when schema or format validation fails.
 */
export class ValidationError extends CentError {
  /** Validation issues, if available */
  readonly issues?: Array<{ path: string; message: string }>

  constructor(
    message: string,
    options?: {
      code?: ErrorCode
      suggestion?: string
      example?: string
      issues?: Array<{ path: string; message: string }>
      cause?: Error
    }
  ) {
    super({
      code: options?.code ?? ErrorCode.VALIDATION_ERROR,
      message,
      suggestion: options?.suggestion,
      example: options?.example,
      cause: options?.cause,
    })
    this.name = "ValidationError"
    this.issues = options?.issues
  }
}

/**
 * Error thrown for exchange rate operation failures.
 */
export class ExchangeRateError extends CentError {
  constructor(
    message: string,
    options?: {
      code?: ErrorCode
      suggestion?: string
      example?: string
      cause?: Error
    }
  ) {
    super({
      code: options?.code ?? ErrorCode.INVALID_EXCHANGE_RATE,
      message,
      suggestion: options?.suggestion,
      example: options?.example,
      cause: options?.cause,
    })
    this.name = "ExchangeRateError"
  }
}
