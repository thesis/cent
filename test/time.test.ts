import { 
  UNIXTimeSchema, 
  isUNIXTime, 
  toUNIXTime, 
  nowUNIXTime, 
  dateToUNIXTime, 
  unixTimeToDate 
} from '../src/time'
import { UNIXTime } from '../src/types'

describe('UNIXTime utilities', () => {
  describe('UNIXTimeSchema', () => {
    it('should validate valid UNIX timestamps in seconds', () => {
      const validTimestamps = [
        '1640995200', // 2022-01-01 00:00:00 UTC
        '0',          // 1970-01-01 00:00:00 UTC
        '2147483647', // 2038-01-19 03:14:07 UTC (32-bit max)
      ]

      validTimestamps.forEach(timestamp => {
        expect(UNIXTimeSchema.safeParse(timestamp).success).toBe(true)
      })
    })

    it('should validate valid UNIX timestamps in milliseconds', () => {
      const validTimestamps = [
        '1640995200000', // 2022-01-01 00:00:00.000 UTC
        '1234567890123', // 2009-02-13 23:31:30.123 UTC
      ]

      validTimestamps.forEach(timestamp => {
        expect(UNIXTimeSchema.safeParse(timestamp).success).toBe(true)
      })
    })

    it('should validate negative timestamps (pre-1970)', () => {
      const validTimestamps = [
        '-1', // 1969-12-31 23:59:59 UTC
        '-2208988800', // 1900-01-01 00:00:00 UTC
      ]

      validTimestamps.forEach(timestamp => {
        expect(UNIXTimeSchema.safeParse(timestamp).success).toBe(true)
      })
    })

    it('should reject non-string inputs', () => {
      const invalidInputs = [
        1640995200,
        null,
        undefined,
        {},
        [],
      ]

      invalidInputs.forEach(input => {
        expect(UNIXTimeSchema.safeParse(input).success).toBe(false)
      })
    })

    it('should reject non-numeric strings', () => {
      const invalidTimestamps = [
        'abc',
        '123.456',
        '123e4',
        '12 34',
        '',
      ]

      invalidTimestamps.forEach(timestamp => {
        expect(UNIXTimeSchema.safeParse(timestamp).success).toBe(false)
      })
    })

    it('should reject timestamps outside reasonable range', () => {
      const invalidTimestamps = [
        '-2208988801', // Before 1900
        '4102444800001', // After 2100
      ]

      invalidTimestamps.forEach(timestamp => {
        expect(UNIXTimeSchema.safeParse(timestamp).success).toBe(false)
      })
    })
  })

  describe('isUNIXTime', () => {
    it('should return true for valid UNIX timestamps', () => {
      expect(isUNIXTime('1640995200')).toBe(true)
      expect(isUNIXTime('0')).toBe(true)
      expect(isUNIXTime('-1')).toBe(true)
    })

    it('should return false for invalid UNIX timestamps', () => {
      expect(isUNIXTime('abc')).toBe(false)
      expect(isUNIXTime('123.456')).toBe(false)
      expect(isUNIXTime('')).toBe(false)
    })

    it('should work as a type guard', () => {
      const value: string = '1640995200'
      
      if (isUNIXTime(value)) {
        // TypeScript should know value is UNIXTime here
        const unixTime: UNIXTime = value
        expect(typeof unixTime).toBe('string')
      }
    })
  })

  describe('toUNIXTime', () => {
    it('should cast valid timestamps to UNIXTime', () => {
      const timestamp = '1640995200'
      const unixTime = toUNIXTime(timestamp)
      
      expect(unixTime).toBe(timestamp)
      // TypeScript should know this is UNIXTime type
      const typed: UNIXTime = unixTime
      expect(typeof typed).toBe('string')
    })

    it('should throw error for invalid timestamps', () => {
      expect(() => toUNIXTime('abc')).toThrow('Invalid UNIX timestamp')
      expect(() => toUNIXTime('123.456')).toThrow('Invalid UNIX timestamp')
      expect(() => toUNIXTime('')).toThrow('Invalid UNIX timestamp')
    })
  })

  describe('nowUNIXTime', () => {
    it('should return current timestamp in milliseconds by default', () => {
      const before = Date.now()
      const unixTime = nowUNIXTime()
      const after = Date.now()
      
      const timestamp = parseInt(unixTime, 10)
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
      
      // Should be in milliseconds (> 10^10)
      expect(timestamp).toBeGreaterThan(10000000000)
    })

    it('should return current timestamp in seconds when specified', () => {
      const before = Math.floor(Date.now() / 1000)
      const unixTime = nowUNIXTime('seconds')
      const after = Math.floor(Date.now() / 1000)
      
      const timestamp = parseInt(unixTime, 10)
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
      
      // Should be in seconds (< 10^10)
      expect(timestamp).toBeLessThan(10000000000)
    })

    it('should return valid UNIXTime type', () => {
      const unixTime = nowUNIXTime()
      expect(isUNIXTime(unixTime)).toBe(true)
    })
  })

  describe('dateToUNIXTime', () => {
    it('should convert Date to UNIXTime in milliseconds by default', () => {
      const date = new Date('2022-01-01T00:00:00.000Z')
      const unixTime = dateToUNIXTime(date)
      
      expect(unixTime).toBe('1640995200000')
      expect(isUNIXTime(unixTime)).toBe(true)
    })

    it('should convert Date to UNIXTime in seconds when specified', () => {
      const date = new Date('2022-01-01T00:00:00.000Z')
      const unixTime = dateToUNIXTime(date, 'seconds')
      
      expect(unixTime).toBe('1640995200')
      expect(isUNIXTime(unixTime)).toBe(true)
    })

    it('should handle dates before 1970', () => {
      const date = new Date('1969-12-31T23:59:59.000Z')
      const unixTime = dateToUNIXTime(date, 'seconds')
      
      expect(unixTime).toBe('-1')
      expect(isUNIXTime(unixTime)).toBe(true)
    })

    it('should throw for dates outside valid range', () => {
      const tooEarly = new Date('1800-01-01T00:00:00.000Z')
      const tooLate = new Date('2200-01-01T00:00:00.000Z')
      
      expect(() => dateToUNIXTime(tooEarly)).toThrow('Invalid UNIX timestamp')
      expect(() => dateToUNIXTime(tooLate)).toThrow('Invalid UNIX timestamp')
    })
  })

  describe('unixTimeToDate', () => {
    it('should convert UNIXTime in milliseconds to Date', () => {
      const unixTime = '1640995200000' as UNIXTime
      const date = unixTimeToDate(unixTime)
      
      expect(date.toISOString()).toBe('2022-01-01T00:00:00.000Z')
    })

    it('should convert UNIXTime in seconds to Date', () => {
      const unixTime = '1640995200' as UNIXTime
      const date = unixTimeToDate(unixTime)
      
      expect(date.toISOString()).toBe('2022-01-01T00:00:00.000Z')
    })

    it('should auto-detect seconds vs milliseconds', () => {
      const secondsTime = '1640995200' as UNIXTime
      const millisecondsTime = '1640995200000' as UNIXTime
      
      const dateFromSeconds = unixTimeToDate(secondsTime)
      const dateFromMilliseconds = unixTimeToDate(millisecondsTime)
      
      expect(dateFromSeconds.getTime()).toBe(dateFromMilliseconds.getTime())
    })

    it('should handle negative timestamps', () => {
      const unixTime = '-1' as UNIXTime
      const date = unixTimeToDate(unixTime)
      
      expect(date.toISOString()).toBe('1969-12-31T23:59:59.000Z')
    })

    it('should round-trip correctly with dateToUNIXTime', () => {
      const originalDate = new Date('2022-06-15T14:30:45.123Z')
      
      // Round-trip with milliseconds
      const unixTimeMs = dateToUNIXTime(originalDate, 'milliseconds')
      const restoredDateMs = unixTimeToDate(unixTimeMs)
      expect(restoredDateMs.getTime()).toBe(originalDate.getTime())
      
      // Round-trip with seconds (loses millisecond precision)
      const unixTimeSec = dateToUNIXTime(originalDate, 'seconds')
      const restoredDateSec = unixTimeToDate(unixTimeSec)
      expect(Math.floor(restoredDateSec.getTime() / 1000)).toBe(Math.floor(originalDate.getTime() / 1000))
    })
  })
})