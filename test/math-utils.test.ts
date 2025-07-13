import { gcd, isOnlyFactorsOf2And5, getBitSize } from "../src/math-utils"

describe("Math Utils", () => {
  describe("gcd", () => {
    it("should calculate GCD of positive numbers", () => {
      expect(gcd(12n, 8n)).toBe(4n)
      expect(gcd(15n, 10n)).toBe(5n)
      expect(gcd(7n, 13n)).toBe(1n) // coprime numbers
    })

    it("should handle negative numbers", () => {
      expect(gcd(-12n, 8n)).toBe(4n)
      expect(gcd(12n, -8n)).toBe(4n)
      expect(gcd(-12n, -8n)).toBe(4n)
    })

    it("should handle zero as one argument", () => {
      expect(gcd(0n, 5n)).toBe(5n)
      expect(gcd(5n, 0n)).toBe(5n)
    })

    it("should handle same numbers", () => {
      expect(gcd(7n, 7n)).toBe(7n)
      expect(gcd(12n, 12n)).toBe(12n)
    })

    it("should handle one and another number", () => {
      expect(gcd(1n, 100n)).toBe(1n)
      expect(gcd(100n, 1n)).toBe(1n)
    })
  })

  describe("isOnlyFactorsOf2And5", () => {
    it("should return true for powers of 2", () => {
      expect(isOnlyFactorsOf2And5(1n)).toBe(true) // 2^0
      expect(isOnlyFactorsOf2And5(2n)).toBe(true) // 2^1
      expect(isOnlyFactorsOf2And5(4n)).toBe(true) // 2^2
      expect(isOnlyFactorsOf2And5(8n)).toBe(true) // 2^3
      expect(isOnlyFactorsOf2And5(16n)).toBe(true) // 2^4
    })

    it("should return true for powers of 5", () => {
      expect(isOnlyFactorsOf2And5(5n)).toBe(true) // 5^1
      expect(isOnlyFactorsOf2And5(25n)).toBe(true) // 5^2
      expect(isOnlyFactorsOf2And5(125n)).toBe(true) // 5^3
    })

    it("should return true for combinations of 2 and 5", () => {
      expect(isOnlyFactorsOf2And5(10n)).toBe(true) // 2 * 5
      expect(isOnlyFactorsOf2And5(20n)).toBe(true) // 2^2 * 5
      expect(isOnlyFactorsOf2And5(50n)).toBe(true) // 2 * 5^2
      expect(isOnlyFactorsOf2And5(100n)).toBe(true) // 2^2 * 5^2
      expect(isOnlyFactorsOf2And5(250n)).toBe(true) // 2 * 5^3
    })

    it("should return false for numbers with other prime factors", () => {
      expect(isOnlyFactorsOf2And5(3n)).toBe(false) // prime 3
      expect(isOnlyFactorsOf2And5(6n)).toBe(false) // 2 * 3
      expect(isOnlyFactorsOf2And5(7n)).toBe(false) // prime 7
      expect(isOnlyFactorsOf2And5(12n)).toBe(false) // 2^2 * 3
      expect(isOnlyFactorsOf2And5(15n)).toBe(false) // 3 * 5
      expect(isOnlyFactorsOf2And5(21n)).toBe(false) // 3 * 7
      expect(isOnlyFactorsOf2And5(30n)).toBe(false) // 2 * 3 * 5
    })

    it("should return false for zero and negative numbers", () => {
      expect(isOnlyFactorsOf2And5(0n)).toBe(false)
      expect(isOnlyFactorsOf2And5(-1n)).toBe(false)
      expect(isOnlyFactorsOf2And5(-2n)).toBe(false)
      expect(isOnlyFactorsOf2And5(-5n)).toBe(false)
    })

    it("should handle large numbers", () => {
      expect(isOnlyFactorsOf2And5(1024n)).toBe(true) // 2^10
      expect(isOnlyFactorsOf2And5(3125n)).toBe(true) // 5^5
      expect(isOnlyFactorsOf2And5(1000n)).toBe(true) // 2^3 * 5^3
      expect(isOnlyFactorsOf2And5(1023n)).toBe(false) // 3 * 11 * 31
    })
  })

  describe("getBitSize", () => {
    it("should return 0 for zero", () => {
      expect(getBitSize(0n)).toBe(0)
    })

    it("should return 1 for 1", () => {
      expect(getBitSize(1n)).toBe(1)
    })

    it("should calculate bit size for powers of 2", () => {
      expect(getBitSize(2n)).toBe(2) // 10 binary
      expect(getBitSize(4n)).toBe(3) // 100 binary
      expect(getBitSize(8n)).toBe(4) // 1000 binary
      expect(getBitSize(16n)).toBe(5) // 10000 binary
      expect(getBitSize(256n)).toBe(9) // 100000000 binary
      expect(getBitSize(1024n)).toBe(11) // 10000000000 binary
    })

    it("should calculate bit size for arbitrary numbers", () => {
      expect(getBitSize(3n)).toBe(2) // 11 binary
      expect(getBitSize(5n)).toBe(3) // 101 binary
      expect(getBitSize(7n)).toBe(3) // 111 binary
      expect(getBitSize(15n)).toBe(4) // 1111 binary
      expect(getBitSize(255n)).toBe(8) // 11111111 binary
      expect(getBitSize(1000n)).toBe(10) // 1111101000 binary
    })

    it("should handle negative numbers (using absolute value)", () => {
      expect(getBitSize(-1n)).toBe(1)
      expect(getBitSize(-2n)).toBe(2)
      expect(getBitSize(-8n)).toBe(4)
      expect(getBitSize(-255n)).toBe(8)
      expect(getBitSize(-1000n)).toBe(10)
    })

    it("should handle large numbers", () => {
      const largeBigInt = BigInt("12345678901234567890")
      const expectedBits = largeBigInt.toString(2).length
      expect(getBitSize(largeBigInt)).toBe(expectedBits)
    })

    it("should be consistent with binary representation", () => {
      const testValues = [1n, 7n, 15n, 31n, 63n, 127n, 255n, 511n, 1023n]
      testValues.forEach((value) => {
        const binaryString = value.toString(2)
        expect(getBitSize(value)).toBe(binaryString.length)
      })
    })
  })
})
