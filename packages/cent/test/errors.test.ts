import { describe, expect, it } from "@jest/globals"
import {
  CentError,
  CurrencyMismatchError,
  DivisionError,
  ErrorCode,
  ExchangeRateError,
  InvalidInputError,
  ParseError,
  PrecisionLossError,
  ValidationError,
} from "../src/errors"

describe("CentError", () => {
  it("creates error with code and message", () => {
    const error = new CentError({
      code: ErrorCode.PARSE_ERROR,
      message: "Something went wrong",
    })

    expect(error.code).toBe(ErrorCode.PARSE_ERROR)
    expect(error.message).toBe("Something went wrong")
    expect(error.name).toBe("CentError")
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(CentError)
  })

  it("includes suggestion when provided", () => {
    const error = new CentError({
      code: ErrorCode.INVALID_INPUT,
      message: "Invalid input",
      suggestion: "Try using a different format",
    })

    expect(error.suggestion).toBe("Try using a different format")
  })

  it("includes example when provided", () => {
    const error = new CentError({
      code: ErrorCode.DIVISION_BY_ZERO,
      message: "Cannot divide by zero",
      example: "money.divide(2) // Works!",
    })

    expect(error.example).toBe("money.divide(2) // Works!")
  })

  it("includes originalCause when provided", () => {
    const cause = new Error("Original error")
    const error = new CentError({
      code: ErrorCode.PARSE_ERROR,
      message: "Wrapper error",
      cause,
    })

    expect(error.originalCause).toBe(cause)
  })

  it("generates detailed string with all info", () => {
    const error = new CentError({
      code: ErrorCode.CURRENCY_MISMATCH,
      message: "Currencies don't match",
      suggestion: "Convert one currency first",
      example: "money.convert(rate)",
    })

    const detailed = error.toDetailedString()
    expect(detailed).toContain("CentError")
    expect(detailed).toContain("CURRENCY_MISMATCH")
    expect(detailed).toContain("Currencies don't match")
    expect(detailed).toContain("Convert one currency first")
    expect(detailed).toContain("money.convert(rate)")
  })
})

describe("ParseError", () => {
  it("includes input that failed to parse", () => {
    const error = new ParseError("$abc", "Invalid number format")

    expect(error.input).toBe("$abc")
    expect(error.message).toBe("Invalid number format")
    expect(error.code).toBe(ErrorCode.PARSE_ERROR)
    expect(error.name).toBe("ParseError")
  })

  it("accepts custom error code", () => {
    const error = new ParseError("xyz", "Unknown currency", {
      code: ErrorCode.UNKNOWN_CURRENCY,
    })

    expect(error.code).toBe(ErrorCode.UNKNOWN_CURRENCY)
  })
})

describe("CurrencyMismatchError", () => {
  it("includes expected and actual currencies", () => {
    const error = new CurrencyMismatchError("USD", "EUR", "add")

    expect(error.expected).toBe("USD")
    expect(error.actual).toBe("EUR")
    expect(error.code).toBe(ErrorCode.CURRENCY_MISMATCH)
    expect(error.name).toBe("CurrencyMismatchError")
    expect(error.message).toContain("USD")
    expect(error.message).toContain("EUR")
    expect(error.message).toContain("add")
  })

  it("includes default suggestion", () => {
    const error = new CurrencyMismatchError("USD", "EUR", "subtract")

    expect(error.suggestion).toContain("Convert")
  })

  it("accepts custom suggestion", () => {
    const error = new CurrencyMismatchError("USD", "EUR", "compare", {
      suggestion: "Use the same currency for comparison",
    })

    expect(error.suggestion).toBe("Use the same currency for comparison")
  })
})

describe("DivisionError", () => {
  it("includes the divisor", () => {
    const error = new DivisionError(0, "Cannot divide by zero")

    expect(error.divisor).toBe(0)
    expect(error.code).toBe(ErrorCode.DIVISION_BY_ZERO)
    expect(error.name).toBe("DivisionError")
  })

  it("handles bigint divisor", () => {
    const error = new DivisionError(0n, "Cannot divide by zero")

    expect(error.divisor).toBe(0n)
  })

  it("handles string divisor", () => {
    const error = new DivisionError("3", "Requires rounding", {
      code: ErrorCode.DIVISION_REQUIRES_ROUNDING,
    })

    expect(error.divisor).toBe("3")
    expect(error.code).toBe(ErrorCode.DIVISION_REQUIRES_ROUNDING)
  })
})

describe("InvalidInputError", () => {
  it("creates with message and default code", () => {
    const error = new InvalidInputError("Invalid ratio")

    expect(error.message).toBe("Invalid ratio")
    expect(error.code).toBe(ErrorCode.INVALID_INPUT)
    expect(error.name).toBe("InvalidInputError")
  })

  it("accepts custom code", () => {
    const error = new InvalidInputError("Empty array", {
      code: ErrorCode.EMPTY_ARRAY,
    })

    expect(error.code).toBe(ErrorCode.EMPTY_ARRAY)
  })
})

describe("ValidationError", () => {
  it("creates with message", () => {
    const error = new ValidationError("Invalid JSON")

    expect(error.message).toBe("Invalid JSON")
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
    expect(error.name).toBe("ValidationError")
  })

  it("includes validation issues", () => {
    const error = new ValidationError("Validation failed", {
      issues: [
        { path: "amount", message: "Required" },
        { path: "currency", message: "Invalid code" },
      ],
    })

    expect(error.issues).toHaveLength(2)
    expect(error.issues?.[0].path).toBe("amount")
    expect(error.issues?.[1].message).toBe("Invalid code")
  })
})

describe("PrecisionLossError", () => {
  it("creates with message", () => {
    const error = new PrecisionLossError("Would lose precision")

    expect(error.message).toBe("Would lose precision")
    expect(error.code).toBe(ErrorCode.PRECISION_LOSS)
    expect(error.name).toBe("PrecisionLossError")
  })
})

describe("ExchangeRateError", () => {
  it("creates with message", () => {
    const error = new ExchangeRateError("Invalid rate")

    expect(error.message).toBe("Invalid rate")
    expect(error.code).toBe(ErrorCode.INVALID_EXCHANGE_RATE)
    expect(error.name).toBe("ExchangeRateError")
  })

  it("accepts custom code", () => {
    const error = new ExchangeRateError("Currencies don't match", {
      code: ErrorCode.EXCHANGE_RATE_MISMATCH,
    })

    expect(error.code).toBe(ErrorCode.EXCHANGE_RATE_MISMATCH)
  })
})

describe("ErrorCode constants", () => {
  it("exports all error codes", () => {
    expect(ErrorCode.PARSE_ERROR).toBe("PARSE_ERROR")
    expect(ErrorCode.INVALID_NUMBER_FORMAT).toBe("INVALID_NUMBER_FORMAT")
    expect(ErrorCode.INVALID_MONEY_STRING).toBe("INVALID_MONEY_STRING")
    expect(ErrorCode.UNKNOWN_CURRENCY).toBe("UNKNOWN_CURRENCY")
    expect(ErrorCode.CURRENCY_MISMATCH).toBe("CURRENCY_MISMATCH")
    expect(ErrorCode.INCOMPATIBLE_CURRENCIES).toBe("INCOMPATIBLE_CURRENCIES")
    expect(ErrorCode.DIVISION_BY_ZERO).toBe("DIVISION_BY_ZERO")
    expect(ErrorCode.DIVISION_REQUIRES_ROUNDING).toBe("DIVISION_REQUIRES_ROUNDING")
    expect(ErrorCode.INVALID_DIVISOR).toBe("INVALID_DIVISOR")
    expect(ErrorCode.PRECISION_LOSS).toBe("PRECISION_LOSS")
    expect(ErrorCode.INVALID_PRECISION).toBe("INVALID_PRECISION")
    expect(ErrorCode.INVALID_INPUT).toBe("INVALID_INPUT")
    expect(ErrorCode.INVALID_RANGE).toBe("INVALID_RANGE")
    expect(ErrorCode.INVALID_RATIO).toBe("INVALID_RATIO")
    expect(ErrorCode.INVALID_JSON).toBe("INVALID_JSON")
    expect(ErrorCode.EMPTY_ARRAY).toBe("EMPTY_ARRAY")
    expect(ErrorCode.VALIDATION_ERROR).toBe("VALIDATION_ERROR")
    expect(ErrorCode.INVALID_EXCHANGE_RATE).toBe("INVALID_EXCHANGE_RATE")
    expect(ErrorCode.EXCHANGE_RATE_MISMATCH).toBe("EXCHANGE_RATE_MISMATCH")
  })
})

describe("Error inheritance", () => {
  it("all error types extend CentError", () => {
    const errors = [
      new ParseError("x", "msg"),
      new CurrencyMismatchError("USD", "EUR", "add"),
      new DivisionError(0, "msg"),
      new InvalidInputError("msg"),
      new ValidationError("msg"),
      new PrecisionLossError("msg"),
      new ExchangeRateError("msg"),
    ]

    errors.forEach(error => {
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(CentError)
    })
  })

  it("errors can be caught by CentError type", () => {
    const throwParse = () => {
      throw new ParseError("x", "msg")
    }

    expect(() => {
      try {
        throwParse()
      } catch (e) {
        if (e instanceof CentError) {
          throw new Error(`Caught CentError with code: ${e.code}`)
        }
        throw e
      }
    }).toThrow("Caught CentError with code: PARSE_ERROR")
  })
})
