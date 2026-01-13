// Test setup for @thesis-co/cent-supabase
// Add any global test configuration here

// Ensure BigInt serialization works in Jest
expect.addSnapshotSerializer({
  test: (val) => typeof val === "bigint",
  print: (val) => `${val}n`,
})
