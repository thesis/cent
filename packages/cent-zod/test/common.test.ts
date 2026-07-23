import { describe, expect, it } from "@jest/globals"
import { zRationalNumberJSON } from "../src"

describe("zRationalNumberJSON", () => {
  it("accepts a valid rational number", () => {
    const result = zRationalNumberJSON.parse({ p: "10050", q: "100" })
    expect(result).toEqual({ p: "10050", q: "100" })
  })

  it("accepts a negative numerator", () => {
    const result = zRationalNumberJSON.parse({ p: "-5", q: "3" })
    expect(result).toEqual({ p: "-5", q: "3" })
  })

  it("rejects q: '0' with 'Denominator must not be zero'", () => {
    const result = zRationalNumberJSON.safeParse({ p: "1", q: "0" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Denominator must not be zero",
      )
      expect(result.error.issues[0].path).toContain("q")
    }
  })

  it("rejects invalid p format", () => {
    const result = zRationalNumberJSON.safeParse({ p: "abc", q: "100" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid q format", () => {
    const result = zRationalNumberJSON.safeParse({ p: "100", q: "1.5" })
    expect(result.success).toBe(false)
  })
})
