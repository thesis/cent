import "../src/types/intl-extensions"

describe("Intl.NumberFormat string extension", () => {
  it("should accept decimal strings for formatting", () => {
    const formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    // Test with different string formats
    expect(formatter.format("123456.78")).toBe("123,456.78")
    expect(formatter.format("1000")).toBe("1,000.00")
    expect(formatter.format("0.5")).toBe("0.50")
    expect(formatter.format("999999.99")).toBe("999,999.99")
  })

  it("should work with different locales", () => {
    const germanFormatter = new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    expect(germanFormatter.format("123456.78")).toBe("123.456,78")
  })

  it("should still work with numbers and bigints", () => {
    const formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    // Test existing functionality still works
    expect(formatter.format(123456.78)).toBe("123,456.78")
    expect(formatter.format(123456n)).toBe("123,456.00")
  })
})
