import { describe, expect, it } from "@jest/globals"
import { Money, HALF_EXPAND } from "../src"

describe("Percentage Operations", () => {
  describe("add() with percentage strings", () => {
    it("adds a percentage to the amount", () => {
      const price = Money("$100.00")
      const withTax = price.add("8.25%")
      expect(withTax.toString()).toBe("$108.25")
    })

    it("handles whole number percentages", () => {
      const price = Money("$100.00")
      expect(price.add("20%").toString()).toBe("$120.00")
      expect(price.add("50%").toString()).toBe("$150.00")
      expect(price.add("100%").toString()).toBe("$200.00")
    })

    it("handles decimal percentages", () => {
      const price = Money("$100.00")
      expect(price.add("8.25%").toString()).toBe("$108.25")
      expect(price.add("0.5%").toString()).toBe("$100.50")
    })

    it("handles negative percentages (discount)", () => {
      const price = Money("$100.00")
      expect(price.add("-10%").toString()).toBe("$90.00")
    })

    it("supports 'percent' keyword", () => {
      const price = Money("$100.00")
      expect(price.add("20percent").toString()).toBe("$120.00")
      expect(price.add("20 percent").toString()).toBe("$120.00")
    })

    it("supports percent sign with space", () => {
      const price = Money("$100.00")
      expect(price.add("20 %").toString()).toBe("$120.00")
    })

    it("accepts optional rounding mode", () => {
      const price = Money("$100.00")
      // 8.333...% of $100 = $8.333..., total = $108.33 (rounded)
      const result = price.add("8.333%", HALF_EXPAND)
      expect(result.toString()).toBe("$108.33")
    })

    it("still adds money values normally", () => {
      const price = Money("$100.00")
      expect(price.add("$10.00").toString()).toBe("$110.00")
      expect(price.add(Money("$5.00")).toString()).toBe("$105.00")
    })
  })

  describe("subtract() with percentage strings", () => {
    it("subtracts a percentage from the amount (discount)", () => {
      const price = Money("$100.00")
      const discounted = price.subtract("10%")
      expect(discounted.toString()).toBe("$90.00")
    })

    it("handles various discount percentages", () => {
      const price = Money("$100.00")
      expect(price.subtract("25%").toString()).toBe("$75.00")
      expect(price.subtract("50%").toString()).toBe("$50.00")
      expect(price.subtract("100%").toString()).toBe("$0.00")
    })

    it("handles decimal percentages", () => {
      const price = Money("$100.00")
      expect(price.subtract("8.25%").toString()).toBe("$91.75")
    })

    it("handles negative percentages (increase)", () => {
      const price = Money("$100.00")
      expect(price.subtract("-10%").toString()).toBe("$110.00")
    })

    it("supports 'percent' keyword", () => {
      const price = Money("$100.00")
      expect(price.subtract("20percent").toString()).toBe("$80.00")
      expect(price.subtract("20 percent").toString()).toBe("$80.00")
    })

    it("accepts optional rounding mode", () => {
      const price = Money("$100.00")
      const result = price.subtract("33.333%", HALF_EXPAND)
      expect(result.toString()).toBe("$66.67")
    })

    it("still subtracts money values normally", () => {
      const price = Money("$100.00")
      expect(price.subtract("$10.00").toString()).toBe("$90.00")
      expect(price.subtract(Money("$5.00")).toString()).toBe("$95.00")
    })
  })

  describe("multiply() with percentage strings", () => {
    it("multiplies by a percentage", () => {
      const price = Money("$100.00")
      expect(price.multiply("50%").toString()).toBe("$50.00")
    })

    it("handles various percentages", () => {
      const price = Money("$100.00")
      expect(price.multiply("10%").toString()).toBe("$10.00")
      expect(price.multiply("25%").toString()).toBe("$25.00")
      expect(price.multiply("100%").toString()).toBe("$100.00")
      expect(price.multiply("150%").toString()).toBe("$150.00")
      expect(price.multiply("200%").toString()).toBe("$200.00")
    })

    it("handles decimal percentages", () => {
      const price = Money("$100.00")
      expect(price.multiply("8.25%").toString()).toBe("$8.25")
    })

    it("supports 'percent' keyword", () => {
      const price = Money("$100.00")
      expect(price.multiply("50percent").toString()).toBe("$50.00")
      expect(price.multiply("50 percent").toString()).toBe("$50.00")
    })

    it("accepts optional rounding mode", () => {
      const price = Money("$100.00")
      const result = price.multiply("33.333%", HALF_EXPAND)
      expect(result.toString()).toBe("$33.33")
    })

    it("still multiplies by decimal strings normally", () => {
      const price = Money("$100.00")
      expect(price.multiply("0.5").toString()).toBe("$50.00")
      expect(price.multiply("1.5").toString()).toBe("$150.00")
    })

    it("still multiplies by bigint normally", () => {
      const price = Money("$100.00")
      expect(price.multiply(3n).toString()).toBe("$300.00")
    })
  })

  describe("extractPercent()", () => {
    describe("with percentage string input", () => {
      it("extracts VAT from total (21% VAT)", () => {
        // $121 total with 21% VAT = $100 base + $21 VAT
        const total = Money("$121.00")
        const vat = total.extractPercent("21%", HALF_EXPAND)
        expect(vat.toString()).toBe("$21.00")
      })

      it("extracts sales tax from total (8.25%)", () => {
        // $108.25 total with 8.25% tax = $100 base + $8.25 tax
        const total = Money("$108.25")
        const tax = total.extractPercent("8.25%", HALF_EXPAND)
        expect(tax.toString()).toBe("$8.25")
      })

      it("handles 20% VAT", () => {
        // $120 total with 20% VAT = $100 base + $20 VAT
        const total = Money("$120.00")
        const vat = total.extractPercent("20%", HALF_EXPAND)
        expect(vat.toString()).toBe("$20.00")
      })

      it("handles 10% tax", () => {
        // $110 total with 10% tax = $100 base + $10 tax
        const total = Money("$110.00")
        const tax = total.extractPercent("10%", HALF_EXPAND)
        expect(tax.toString()).toBe("$10.00")
      })
    })

    describe("with number input", () => {
      it("treats number as percentage value", () => {
        const total = Money("$121.00")
        const vat = total.extractPercent(21, HALF_EXPAND)
        expect(vat.toString()).toBe("$21.00")
      })

      it("handles decimal numbers", () => {
        const total = Money("$108.25")
        const tax = total.extractPercent(8.25, HALF_EXPAND)
        expect(tax.toString()).toBe("$8.25")
      })
    })

    describe("with plain number string input", () => {
      it("treats plain number string as percentage", () => {
        const total = Money("$121.00")
        const vat = total.extractPercent("21", HALF_EXPAND)
        expect(vat.toString()).toBe("$21.00")
      })
    })

    describe("edge cases", () => {
      it("handles 0% (returns zero)", () => {
        const total = Money("$100.00")
        const extracted = total.extractPercent("0%", HALF_EXPAND)
        expect(extracted.toString()).toBe("$0.00")
      })

      it("handles amounts requiring rounding", () => {
        // $100 / 1.07 = $93.4579... base, tax = $6.5420...
        const total = Money("$100.00")
        const tax = total.extractPercent("7%", HALF_EXPAND)
        expect(tax.toString()).toBe("$6.54")
      })
    })
  })

  describe("removePercent()", () => {
    describe("with percentage string input", () => {
      it("removes VAT to get pre-tax price (21% VAT)", () => {
        // $121 total with 21% VAT → $100 base
        const total = Money("$121.00")
        const base = total.removePercent("21%", HALF_EXPAND)
        expect(base.toString()).toBe("$100.00")
      })

      it("removes sales tax (8.25%)", () => {
        // $108.25 total with 8.25% tax → $100 base
        const total = Money("$108.25")
        const base = total.removePercent("8.25%", HALF_EXPAND)
        expect(base.toString()).toBe("$100.00")
      })

      it("handles 20% VAT", () => {
        const total = Money("$120.00")
        const base = total.removePercent("20%", HALF_EXPAND)
        expect(base.toString()).toBe("$100.00")
      })

      it("handles 10% tax", () => {
        const total = Money("$110.00")
        const base = total.removePercent("10%", HALF_EXPAND)
        expect(base.toString()).toBe("$100.00")
      })
    })

    describe("with number input", () => {
      it("treats number as percentage value", () => {
        const total = Money("$121.00")
        const base = total.removePercent(21, HALF_EXPAND)
        expect(base.toString()).toBe("$100.00")
      })

      it("handles decimal numbers", () => {
        const total = Money("$108.25")
        const base = total.removePercent(8.25, HALF_EXPAND)
        expect(base.toString()).toBe("$100.00")
      })
    })

    describe("with plain number string input", () => {
      it("treats plain number string as percentage", () => {
        const total = Money("$121.00")
        const base = total.removePercent("21", HALF_EXPAND)
        expect(base.toString()).toBe("$100.00")
      })
    })

    describe("edge cases", () => {
      it("handles 0% (returns same amount)", () => {
        const total = Money("$100.00")
        const base = total.removePercent("0%", HALF_EXPAND)
        expect(base.toString()).toBe("$100.00")
      })

      it("handles amounts requiring rounding", () => {
        // $100 / 1.07 = $93.4579...
        const total = Money("$100.00")
        const base = total.removePercent("7%", HALF_EXPAND)
        expect(base.toString()).toBe("$93.46")
      })
    })
  })

  describe("relationship between extractPercent and removePercent", () => {
    it("extractPercent + removePercent = original total", () => {
      const total = Money("$121.00")
      const vat = total.extractPercent("21%", HALF_EXPAND)
      const base = total.removePercent("21%", HALF_EXPAND)

      expect(base.add(vat).toString()).toBe("$121.00")
    })

    it("works with various percentages", () => {
      const testCases = [
        { total: "$110.00", percent: "10%" },
        { total: "$120.00", percent: "20%" },
        { total: "$108.25", percent: "8.25%" },
        { total: "$119.00", percent: "19%" },
      ]

      for (const { total, percent } of testCases) {
        const totalMoney = Money(total)
        const extracted = totalMoney.extractPercent(percent, HALF_EXPAND)
        const base = totalMoney.removePercent(percent, HALF_EXPAND)

        expect(base.add(extracted).toString()).toBe(total)
      }
    })
  })

  describe("combined percentage operations", () => {
    it("can calculate tax on a subtotal, then apply discount", () => {
      const subtotal = Money("$100.00")
      const withTax = subtotal.add("8%")        // $108.00
      const discounted = withTax.subtract("10%") // $97.20

      expect(withTax.toString()).toBe("$108.00")
      expect(discounted.toString()).toBe("$97.20")
    })

    it("can calculate tip percentage", () => {
      const bill = Money("$85.00")
      const tip15 = bill.multiply("15%")  // $12.75
      const tip20 = bill.multiply("20%")  // $17.00

      expect(tip15.toString()).toBe("$12.75")
      expect(tip20.toString()).toBe("$17.00")
    })

    it("can calculate profit margin", () => {
      const cost = Money("$80.00")
      const salePrice = cost.add("25%")  // $100.00 (25% markup)

      expect(salePrice.toString()).toBe("$100.00")
    })

    it("can apply multiple discounts", () => {
      const original = Money("$100.00")
      const firstDiscount = original.subtract("20%")   // $80.00
      const secondDiscount = firstDiscount.subtract("10%")  // $72.00

      expect(firstDiscount.toString()).toBe("$80.00")
      expect(secondDiscount.toString()).toBe("$72.00")
    })
  })

  describe("percentage parsing edge cases", () => {
    it("handles whitespace variations", () => {
      const price = Money("$100.00")
      expect(price.add("  20%  ").toString()).toBe("$120.00")
      expect(price.add("20  %").toString()).toBe("$120.00")
    })

    it("is case-insensitive for 'percent'", () => {
      const price = Money("$100.00")
      expect(price.add("20PERCENT").toString()).toBe("$120.00")
      expect(price.add("20Percent").toString()).toBe("$120.00")
    })

    it("distinguishes percentage from currency amounts", () => {
      const price = Money("$100.00")
      // This is a percentage
      expect(price.add("20%").toString()).toBe("$120.00")
      // This is a dollar amount
      expect(price.add("$20.00").toString()).toBe("$120.00")
    })

    it("handles very small percentages", () => {
      const price = Money("$10000.00")
      expect(price.multiply("0.01%").toString()).toBe("$1.00")
    })

    it("handles very large percentages", () => {
      const price = Money("$100.00")
      expect(price.multiply("500%").toString()).toBe("$500.00")
    })
  })
})
