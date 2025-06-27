import { 
  UNIXTimeSchema, 
  isUNIXTime, 
  toUNIXTime, 
  nowUNIXTime, 
  dateToUNIXTime, 
  unixTimeToDate,
  UTCTimeSchema,
  isUTCTime,
  toUTCTime,
  nowUTCTime,
  dateToUTCTime,
  utcTimeToDate
} from '../src/time'
import { UNIXTime, UTCTime } from '../src/types'

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

describe('UTCTime utilities', () => {
  describe('UTCTimeSchema', () => {
    it('should validate valid UTC timestamps with milliseconds', () => {
      const validTimestamps = [
        '2022-01-01T00:00:00.000Z',
        '2023-12-31T23:59:59.999Z',
        '1970-01-01T00:00:00.000Z',
        '2000-02-29T12:34:56.789Z', // Leap year
      ]

      validTimestamps.forEach(timestamp => {
        expect(UTCTimeSchema.safeParse(timestamp).success).toBe(true)
      })
    })

    it('should validate valid UTC timestamps without milliseconds', () => {
      const validTimestamps = [
        '2022-01-01T00:00:00Z',
        '2023-12-31T23:59:59Z',
        '1970-01-01T00:00:00Z',
      ]

      validTimestamps.forEach(timestamp => {
        expect(UTCTimeSchema.safeParse(timestamp).success).toBe(true)
      })
    })

    it('should reject non-string inputs', () => {
      const invalidInputs = [
        1640995200000,
        null,
        undefined,
        {},
        [],
        new Date(),
      ]

      invalidInputs.forEach(input => {
        expect(UTCTimeSchema.safeParse(input).success).toBe(false)
      })
    })

    it('should reject non-ISO 8601 format strings', () => {
      const invalidTimestamps = [
        '2022-01-01 00:00:00',     // Missing T separator
        '2022-01-01T00:00:00',     // Missing Z timezone
        '2022-01-01T00:00:00+00:00', // Wrong timezone format
        '2022/01/01T00:00:00Z',    // Wrong date separator
        '22-01-01T00:00:00Z',      // Wrong year format
        '2022-1-1T0:0:0Z',         // Missing leading zeros
        'abc',
        '',
        '2022-01-01T00:00:00.Z',   // Invalid milliseconds
        '2022-01-01T00:00:00.1234Z', // Too many millisecond digits
      ]

      invalidTimestamps.forEach(timestamp => {
        expect(UTCTimeSchema.safeParse(timestamp).success).toBe(false)
      })
    })

    it('should reject invalid dates', () => {
      const invalidTimestamps = [
        '2022-02-30T00:00:00Z',    // February 30th doesn't exist
        '2022-13-01T00:00:00Z',    // Month 13 doesn't exist
        '2022-01-32T00:00:00Z',    // January 32nd doesn't exist
        '2022-01-01T25:00:00Z',    // Hour 25 doesn't exist
        '2022-01-01T00:60:00Z',    // Minute 60 doesn't exist
        '2022-01-01T00:00:60Z',    // Second 60 doesn't exist
      ]

      invalidTimestamps.forEach(timestamp => {
        expect(UTCTimeSchema.safeParse(timestamp).success).toBe(false)
      })
    })
  })

  describe('isUTCTime', () => {
    it('should return true for valid UTC timestamps', () => {
      expect(isUTCTime('2022-01-01T00:00:00.000Z')).toBe(true)
      expect(isUTCTime('2022-01-01T00:00:00Z')).toBe(true)
      expect(isUTCTime('1970-01-01T00:00:00.000Z')).toBe(true)
    })

    it('should return false for invalid UTC timestamps', () => {
      expect(isUTCTime('2022-01-01 00:00:00')).toBe(false)
      expect(isUTCTime('abc')).toBe(false)
      expect(isUTCTime('')).toBe(false)
      expect(isUTCTime('2022-02-30T00:00:00Z')).toBe(false)
    })

    it('should work as a type guard', () => {
      const value: string = '2022-01-01T00:00:00.000Z'
      
      if (isUTCTime(value)) {
        // TypeScript should know value is UTCTime here
        const utcTime: UTCTime = value
        expect(typeof utcTime).toBe('string')
      }
    })
  })

  describe('toUTCTime', () => {
    it('should cast valid timestamps to UTCTime', () => {
      const timestamp = '2022-01-01T00:00:00.000Z'
      const utcTime = toUTCTime(timestamp)
      
      expect(utcTime).toBe(timestamp)
      // TypeScript should know this is UTCTime type
      const typed: UTCTime = utcTime
      expect(typeof typed).toBe('string')
    })

    it('should throw error for invalid timestamps', () => {
      expect(() => toUTCTime('abc')).toThrow('Invalid UTC timestamp')
      expect(() => toUTCTime('2022-01-01 00:00:00')).toThrow('Invalid UTC timestamp')
      expect(() => toUTCTime('')).toThrow('Invalid UTC timestamp')
      expect(() => toUTCTime('2022-02-30T00:00:00Z')).toThrow('Invalid UTC timestamp')
    })
  })

  describe('nowUTCTime', () => {
    it('should return current timestamp with milliseconds by default', () => {
      const before = new Date().toISOString()
      const utcTime = nowUTCTime()
      const after = new Date().toISOString()
      
      expect(utcTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(utcTime >= before).toBe(true)
      expect(utcTime <= after).toBe(true)
    })

    it('should return current timestamp without milliseconds when precision is false', () => {
      const before = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
      const utcTime = nowUTCTime(false)
      const after = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
      
      expect(utcTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
      expect(utcTime >= before).toBe(true)
      expect(utcTime <= after).toBe(true)
    })

    it('should return valid UTCTime type', () => {
      const utcTime = nowUTCTime()
      expect(isUTCTime(utcTime)).toBe(true)
      
      const utcTimeNoPrecision = nowUTCTime(false)
      expect(isUTCTime(utcTimeNoPrecision)).toBe(true)
    })
  })

  describe('dateToUTCTime', () => {
    it('should convert Date to UTCTime with milliseconds by default', () => {
      const date = new Date('2022-01-01T00:00:00.123Z')
      const utcTime = dateToUTCTime(date)
      
      expect(utcTime).toBe('2022-01-01T00:00:00.123Z')
      expect(isUTCTime(utcTime)).toBe(true)
    })

    it('should convert Date to UTCTime without milliseconds when precision is false', () => {
      const date = new Date('2022-01-01T00:00:00.123Z')
      const utcTime = dateToUTCTime(date, false)
      
      expect(utcTime).toBe('2022-01-01T00:00:00Z')
      expect(isUTCTime(utcTime)).toBe(true)
    })

    it('should handle dates before 1970', () => {
      const date = new Date('1969-12-31T23:59:59.000Z')
      const utcTime = dateToUTCTime(date)
      
      expect(utcTime).toBe('1969-12-31T23:59:59.000Z')
      expect(isUTCTime(utcTime)).toBe(true)
    })

    it('should handle leap years correctly', () => {
      const date = new Date('2000-02-29T12:34:56.789Z')
      const utcTime = dateToUTCTime(date)
      
      expect(utcTime).toBe('2000-02-29T12:34:56.789Z')
      expect(isUTCTime(utcTime)).toBe(true)
    })
  })

  describe('utcTimeToDate', () => {
    it('should convert UTCTime with milliseconds to Date', () => {
      const utcTime = '2022-01-01T00:00:00.123Z' as UTCTime
      const date = utcTimeToDate(utcTime)
      
      expect(date.toISOString()).toBe('2022-01-01T00:00:00.123Z')
    })

    it('should convert UTCTime without milliseconds to Date', () => {
      const utcTime = '2022-01-01T00:00:00Z' as UTCTime
      const date = utcTimeToDate(utcTime)
      
      expect(date.toISOString()).toBe('2022-01-01T00:00:00.000Z')
    })

    it('should handle dates before 1970', () => {
      const utcTime = '1969-12-31T23:59:59.000Z' as UTCTime
      const date = utcTimeToDate(utcTime)
      
      expect(date.toISOString()).toBe('1969-12-31T23:59:59.000Z')
    })

    it('should handle leap years correctly', () => {
      const utcTime = '2000-02-29T12:34:56.789Z' as UTCTime
      const date = utcTimeToDate(utcTime)
      
      expect(date.toISOString()).toBe('2000-02-29T12:34:56.789Z')
    })

    it('should round-trip correctly with dateToUTCTime', () => {
      const originalDate = new Date('2022-06-15T14:30:45.123Z')
      
      // Round-trip with milliseconds
      const utcTimeMs = dateToUTCTime(originalDate, true)
      const restoredDateMs = utcTimeToDate(utcTimeMs)
      expect(restoredDateMs.getTime()).toBe(originalDate.getTime())
      
      // Round-trip without milliseconds (loses millisecond precision)
      const utcTimeSec = dateToUTCTime(originalDate, false)
      const restoredDateSec = utcTimeToDate(utcTimeSec)
      expect(Math.floor(restoredDateSec.getTime() / 1000)).toBe(Math.floor(originalDate.getTime() / 1000))
    })
  })

  describe('UTCTime vs UNIXTime interoperability', () => {
    it('should be able to convert between UTCTime and UNIXTime', () => {
      const originalDate = new Date('2022-06-15T14:30:45.123Z')
      
      // Convert to both formats
      const utcTime = dateToUTCTime(originalDate)
      const unixTime = dateToUNIXTime(originalDate)
      
      // Convert back to dates
      const dateFromUTC = utcTimeToDate(utcTime)
      const dateFromUNIX = unixTimeToDate(unixTime)
      
      // Should represent the same moment in time
      expect(dateFromUTC.getTime()).toBe(dateFromUNIX.getTime())
      expect(dateFromUTC.getTime()).toBe(originalDate.getTime())
    })

    it('should handle timezone differences correctly', () => {
      // UTCTime is always in UTC, UNIXTime is timezone-agnostic
      const utcTime = '2022-01-01T12:00:00.000Z' as UTCTime
      const date = utcTimeToDate(utcTime)
      const unixTime = dateToUNIXTime(date)
      
      // Converting back should give us the same UTC time
      const restoredDate = unixTimeToDate(unixTime)
      expect(restoredDate.toISOString()).toBe(utcTime)
    })
  })
})