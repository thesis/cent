/**
 * TypeScript module augmentation to extend Intl.NumberFormat
 * to accept decimal strings, which it does at runtime but isn't typed for
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Intl {
    interface NumberFormat {
      /**
       * Extended format method that accepts decimal strings
       * This is what the runtime actually supports
       */
      format(value: number | bigint | string): string
    }
  }
}

// This file needs to be a module, so we export something
export {}
