import '@testing-library/jest-dom'
import { configure } from '@thesis-co/cent'

// Configure Cent with strict settings to catch any precision issues in tests
configure({
  numberInputMode: 'never',      // Disallow Number inputs entirely
  defaultRoundingMode: 'none',   // No implicit rounding
  strictPrecision: true,         // Throw on any precision loss
})
