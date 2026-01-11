import {
  FractionStringSchema,
  getRationalStringType,
  isFractionString,
  isRationalString,
  parseFraction,
  RationalStringSchema,
  toRationalString,
} from "../src/rational-strings"

describe("FractionStringSchema", () => {
  it("should validate valid fraction strings", () => {
    expect(FractionStringSchema.safeParse("3/4").success).toBe(true)
    expect(FractionStringSchema.safeParse("-22/7").success).toBe(true)
    expect(FractionStringSchema.safeParse("1234/97328").success).toBe(true)
    expect(FractionStringSchema.safeParse(" 123 / 456 ").success).toBe(true)
    expect(FractionStringSchema.safeParse("0/1").success).toBe(true)
  })

  it("should reject invalid fraction strings", () => {
    expect(FractionStringSchema.safeParse("1/0").success).toBe(false) // Zero denominator
    expect(FractionStringSchema.safeParse("3").success).toBe(false) // No slash
    expect(FractionStringSchema.safeParse("3/").success).toBe(false) // Missing denominator
    expect(FractionStringSchema.safeParse("/4").success).toBe(false) // Missing numerator
    expect(FractionStringSchema.safeParse("3/4/5").success).toBe(false) // Multiple slashes
    expect(FractionStringSchema.safeParse("abc/def").success).toBe(false) // Non-numeric
    expect(FractionStringSchema.safeParse("3.5/4").success).toBe(false) // Decimal in fraction
  })
})

describe("RationalStringSchema", () => {
  it("should validate fraction strings", () => {
    expect(RationalStringSchema.safeParse("3/4").success).toBe(true)
    expect(RationalStringSchema.safeParse("-22/7").success).toBe(true)
  })

  it("should validate decimal strings", () => {
    expect(RationalStringSchema.safeParse("123.45").success).toBe(true)
    expect(RationalStringSchema.safeParse("-0.001").success).toBe(true)
    expect(RationalStringSchema.safeParse("42").success).toBe(true)
  })

  it("should reject invalid strings", () => {
    expect(RationalStringSchema.safeParse("1/0").success).toBe(false) // Zero denominator
    expect(RationalStringSchema.safeParse("abc").success).toBe(false) // Non-numeric
    expect(RationalStringSchema.safeParse("123.").success).toBe(false) // Trailing decimal
    expect(RationalStringSchema.safeParse(".").success).toBe(false) // Just decimal point
  })
})

describe("isFractionString", () => {
  it("should return true for valid fraction strings", () => {
    expect(isFractionString("3/4")).toBe(true)
    expect(isFractionString("-22/7")).toBe(true)
    expect(isFractionString(" 123 / 456 ")).toBe(true)
  })

  it("should return false for invalid fraction strings", () => {
    expect(isFractionString("1/0")).toBe(false)
    expect(isFractionString("123.45")).toBe(false)
    expect(isFractionString("abc/def")).toBe(false)
  })
})

describe("isRationalString", () => {
  it("should return true for valid fraction strings", () => {
    expect(isRationalString("3/4")).toBe(true)
    expect(isRationalString("-22/7")).toBe(true)
  })

  it("should return true for valid decimal strings", () => {
    expect(isRationalString("123.45")).toBe(true)
    expect(isRationalString("-0.001")).toBe(true)
    expect(isRationalString("42")).toBe(true)
  })

  it("should return false for invalid strings", () => {
    expect(isRationalString("1/0")).toBe(false)
    expect(isRationalString("abc")).toBe(false)
    expect(isRationalString("123.")).toBe(false)
  })
})

describe("toRationalString", () => {
  it("should cast valid strings to RationalString", () => {
    expect(toRationalString("3/4")).toBe("3/4")
    expect(toRationalString("123.45")).toBe("123.45")
    expect(toRationalString("-22/7")).toBe("-22/7")
  })

  it("should throw for invalid strings", () => {
    expect(() => toRationalString("1/0")).toThrow("Invalid rational string")
    expect(() => toRationalString("abc")).toThrow("Invalid rational string")
    expect(() => toRationalString("123.")).toThrow("Invalid rational string")
  })
})

describe("parseFraction", () => {
  it("should parse valid fraction strings", () => {
    expect(parseFraction("3/4")).toEqual({ p: 3n, q: 4n })
    expect(parseFraction("-22/7")).toEqual({ p: -22n, q: 7n })
    expect(parseFraction("1234/97328")).toEqual({ p: 1234n, q: 97328n })
    expect(parseFraction(" 123 / 456 ")).toEqual({ p: 123n, q: 456n })
    expect(parseFraction("0/1")).toEqual({ p: 0n, q: 1n })
  })

  it("should throw for invalid fraction strings", () => {
    expect(() => parseFraction("1/0")).toThrow("Invalid fraction format")
    expect(() => parseFraction("123")).toThrow("Invalid fraction format")
    expect(() => parseFraction("3/")).toThrow("Invalid fraction format")
    expect(() => parseFraction("/4")).toThrow("Invalid fraction format")
    expect(() => parseFraction("abc/def")).toThrow("Invalid fraction format")
  })

  it("should handle edge cases", () => {
    expect(parseFraction("-0/1")).toEqual({ p: 0n, q: 1n })
    expect(parseFraction("1/1")).toEqual({ p: 1n, q: 1n })
    expect(parseFraction("-1/1")).toEqual({ p: -1n, q: 1n })
  })
})

describe("getRationalStringType", () => {
  it("should identify fraction strings", () => {
    expect(getRationalStringType("3/4")).toBe("fraction")
    expect(getRationalStringType("-22/7")).toBe("fraction")
    expect(getRationalStringType(" 123 / 456 ")).toBe("fraction")
    expect(getRationalStringType("0/1")).toBe("fraction")
  })

  it("should identify decimal strings", () => {
    expect(getRationalStringType("123.45")).toBe("decimal")
    expect(getRationalStringType("-0.001")).toBe("decimal")
    expect(getRationalStringType("42")).toBe("decimal")
    expect(getRationalStringType("0")).toBe("decimal")
  })

  it("should handle edge cases", () => {
    // Invalid strings still get categorized by presence of slash
    expect(getRationalStringType("1/0")).toBe("fraction") // Invalid but has slash
    expect(getRationalStringType("123.")).toBe("decimal") // Invalid but no slash
    expect(getRationalStringType("abc/def")).toBe("fraction") // Invalid but has slash
  })
})
