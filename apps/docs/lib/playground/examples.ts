export const EXAMPLES = {
  basic: `// Basic Money Operations
const price = Money("$99.99")
const tax = price.multiply("8%")
const total = price.add(tax)

console.log("Price:", price.toString())
console.log("Tax:", tax.toString())
console.log("Total:", total.toString())
`,

  taxCalculation: `// Tax Calculation with Rounding
const subtotal = Money("$156.78")
const taxRate = "7.5%"

const tax = subtotal.multiply(taxRate)
const total = subtotal.add(tax)

// Round to cents
const roundedTotal = total.roundTo(2, Round.HALF_UP)

console.log("Subtotal:", subtotal.toString())
console.log("Tax (7.5%):", tax.toString())
console.log("Total:", roundedTotal.toString())
`,

  billSplitting: `// Bill Splitting with Distribute and Allocate
const bill = Money("$127.43")

// Split equally among 4 people
const splits = bill.distribute(4)
console.log("Equal split:")
splits.forEach((s, i) => console.log(\`  Person \${i + 1}: \${s.toString()}\`))

// Split by ratio (2:1:1)
const ratioSplits = bill.allocate([2, 1, 1])
console.log("\\nRatio split (2:1:1):")
ratioSplits.forEach((s, i) => console.log(\`  Share \${i + 1}: \${s.toString()}\`))
`,

  currencyConversion: `// Currency Conversion
// Define exchange rate: 1 USD = 0.92 EUR
const rate = new ExchangeRate(USD, EUR, "0.92")

const dollars = Money("$250.00")
const euros = rate.convert(dollars)

console.log("Original:", dollars.toString())
console.log("Converted:", euros.toString())

// Reverse conversion works automatically
const backToDollars = rate.convert(euros)
console.log("Back to USD:", backToDollars.toString())
`,

  cryptocurrency: `// Cryptocurrency Precision
// Bitcoin with satoshi precision (8 decimals)
const btc = Money("0.00012345 BTC")
console.log("BTC:", btc.toString())

// Ethereum with wei precision (18 decimals)
const eth = Money("1.234567890123456789 ETH")
console.log("ETH:", eth.toString())

// Convert between units
const sats = Money("100000000 sat")
console.log("100M sats =", Money("1 BTC").equals(sats) ? "1 BTC" : "not 1 BTC")
`,

  invoice: `// Invoice Calculation
const items = [
  { name: "Widget", price: "$29.99", qty: 2 },
  { name: "Gadget", price: "$49.99", qty: 1 },
  { name: "Gizmo", price: "$15.00", qty: 3 }
]

// Calculate subtotal
const subtotal = items.reduce(
  (sum, item) => sum.add(Money(item.price).multiply(item.qty)),
  Money.zero("USD")
)

// Apply 10% discount
const discount = subtotal.multiply("10%")
const afterDiscount = subtotal.subtract(discount)

// Add 8.25% tax
const tax = afterDiscount.multiply("8.25%").roundTo(2, Round.HALF_UP)
const total = afterDiscount.add(tax)

console.log("Subtotal:", subtotal.toString())
console.log("Discount (10%):", discount.toString())
console.log("After Discount:", afterDiscount.toString())
console.log("Tax (8.25%):", tax.toString())
console.log("Total:", total.toString())
`,
} as const

export type ExampleKey = keyof typeof EXAMPLES

export const EXAMPLE_LABELS: Record<ExampleKey, string> = {
  basic: "Basic Operations",
  taxCalculation: "Tax Calculation",
  billSplitting: "Bill Splitting",
  currencyConversion: "Currency Conversion",
  cryptocurrency: "Cryptocurrency",
  invoice: "Invoice Builder",
}
