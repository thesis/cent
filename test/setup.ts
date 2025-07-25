// Set consistent locale for number formatting across environments
process.env.LC_ALL = 'en_US.UTF-8'
process.env.LANG = 'en_US.UTF-8'

// Store original NumberFormat before any modules are loaded
const originalNumberFormat = Intl.NumberFormat

// Apply the mock immediately (not in beforeAll) to ensure it's active before module loading
Object.defineProperty(Intl, 'NumberFormat', {
  value: function(locale?: string | string[], options?: Intl.NumberFormatOptions) {
    // Use provided locale, fallback to en-US
    const normalizedLocale = locale || 'en-US'
    
    // Create formatter with normalized options
    const normalizedOptions = { ...options }
    
    // Always implement manual rounding for consistency across environments
    if (normalizedOptions.roundingMode && normalizedOptions.maximumFractionDigits !== undefined) {
      const { roundingMode, ...restOptions } = normalizedOptions
      const formatter = new originalNumberFormat(normalizedLocale, restOptions)
      
      // Return a wrapper that handles rounding manually for consistency
      return {
        format: (value: number | bigint | string) => {
          const numValue = typeof value === 'string' ? parseFloat(value) : Number(value)
          
          // Apply manual rounding based on roundingMode and maximumFractionDigits
          const multiplier = Math.pow(10, restOptions.maximumFractionDigits)
          let roundedValue = numValue
          
          switch (roundingMode) {
            case 'floor':
              roundedValue = Math.floor(numValue * multiplier) / multiplier
              break
            case 'ceil':
              roundedValue = Math.ceil(numValue * multiplier) / multiplier
              break
            case 'halfExpand':
              roundedValue = Math.round(numValue * multiplier) / multiplier
              break
            case 'halfEven':
              // Banker's rounding
              const scaled = numValue * multiplier
              const truncated = Math.trunc(scaled)
              const fraction = scaled - truncated
              if (Math.abs(fraction) === 0.5) {
                roundedValue = (truncated % 2 === 0 ? truncated : truncated + Math.sign(fraction)) / multiplier
              } else {
                roundedValue = Math.round(scaled) / multiplier
              }
              break
            default:
              roundedValue = Math.round(numValue * multiplier) / multiplier
          }
          
          return formatter.format(roundedValue)
        },
        formatToParts: formatter.formatToParts?.bind(formatter),
        resolvedOptions: formatter.resolvedOptions?.bind(formatter)
      }
    }
    
    return new originalNumberFormat(normalizedLocale, normalizedOptions)
  },
  writable: true,
  configurable: true
})

