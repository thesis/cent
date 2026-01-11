/**
 * Result type for representing success or failure without exceptions.
 *
 * The Result type is a discriminated union that can be either `Ok<T>` (success)
 * or `Err<E>` (failure). This enables programmatic error handling without
 * try/catch blocks.
 *
 * @example
 * import { Money, Ok, Err } from '@thesis-co/cent';
 *
 * const result = Money.parse("$100.00");
 *
 * // Pattern matching
 * const message = result.match({
 *   ok: (money) => `Parsed: ${money.toString()}`,
 *   err: (error) => `Failed: ${error.message}`,
 * });
 *
 * // Conditional check
 * if (result.ok) {
 *   console.log(result.value.toString());
 * } else {
 *   console.log(result.error.message);
 * }
 *
 * // With default value
 * const money = Money.parse(userInput).unwrapOr(Money.zero("USD"));
 */

/**
 * Represents a successful result containing a value.
 */
export class Ok<T> {
  readonly ok = true as const

  constructor(readonly value: T) {}

  /**
   * Transform the success value using a function.
   *
   * @param fn - Function to transform the value
   * @returns A new Ok with the transformed value
   *
   * @example
   * Ok(10).map(x => x * 2)  // Ok(20)
   */
  map<U>(fn: (value: T) => U): Result<U, never> {
    return new Ok(fn(this.value))
  }

  /**
   * Transform the success value using a function that returns a Result.
   * Flattens nested Results.
   *
   * @param fn - Function that returns a Result
   * @returns The Result from the function
   *
   * @example
   * Ok(10).flatMap(x => x > 0 ? Ok(x) : Err("negative"))
   */
  flatMap<U, E>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value)
  }

  /**
   * Return the success value, or throw if this is an error.
   *
   * @returns The success value
   *
   * @example
   * Ok(42).unwrap()  // 42
   */
  unwrap(): T {
    return this.value
  }

  /**
   * Return the success value, or a default if this is an error.
   *
   * @param _defaultValue - The default value (unused for Ok)
   * @returns The success value
   *
   * @example
   * Ok(42).unwrapOr(0)  // 42
   */
  unwrapOr(_defaultValue: T): T {
    return this.value
  }

  /**
   * Return the success value, or compute a default if this is an error.
   *
   * @param _fn - Function to compute default (unused for Ok)
   * @returns The success value
   *
   * @example
   * Ok(42).unwrapOrElse(() => 0)  // 42
   */
  unwrapOrElse(_fn: () => T): T {
    return this.value
  }

  /**
   * Pattern match on the result, executing the appropriate handler.
   *
   * @param handlers - Object with `ok` and `err` handler functions
   * @returns The result of the matching handler
   *
   * @example
   * Ok(42).match({
   *   ok: (v) => `Success: ${v}`,
   *   err: (e) => `Error: ${e}`,
   * })  // "Success: 42"
   */
  match<U>(handlers: { ok: (value: T) => U; err: (error: never) => U }): U {
    return handlers.ok(this.value)
  }

  /**
   * Check if this is an Ok result.
   * Useful for type narrowing in conditionals.
   */
  isOk(): this is Ok<T> {
    return true
  }

  /**
   * Check if this is an Err result.
   * Useful for type narrowing in conditionals.
   */
  isErr(): this is Err<never> {
    return false
  }
}

/**
 * Represents a failed result containing an error.
 */
export class Err<E> {
  readonly ok = false as const

  constructor(readonly error: E) {}

  /**
   * Transform the success value (no-op for Err).
   *
   * @param _fn - Function to transform the value (unused)
   * @returns This Err unchanged
   *
   * @example
   * Err("error").map(x => x * 2)  // Err("error")
   */
  map<U>(_fn: (value: never) => U): Result<U, E> {
    return this as unknown as Result<U, E>
  }

  /**
   * Transform the success value (no-op for Err).
   *
   * @param _fn - Function that returns a Result (unused)
   * @returns This Err unchanged
   */
  flatMap<U>(_fn: (value: never) => Result<U, E>): Result<U, E> {
    return this as unknown as Result<U, E>
  }

  /**
   * Throw the error since this is not a success.
   *
   * @throws The contained error
   *
   * @example
   * Err(new Error("oops")).unwrap()  // throws Error("oops")
   */
  unwrap(): never {
    throw this.error
  }

  /**
   * Return the default value since this is an error.
   *
   * @param defaultValue - The default value to return
   * @returns The default value
   *
   * @example
   * Err("error").unwrapOr(42)  // 42
   */
  unwrapOr<T>(defaultValue: T): T {
    return defaultValue
  }

  /**
   * Compute and return a default value since this is an error.
   *
   * @param fn - Function to compute the default value
   * @returns The computed default value
   *
   * @example
   * Err("error").unwrapOrElse(() => 42)  // 42
   */
  unwrapOrElse<T>(fn: () => T): T {
    return fn()
  }

  /**
   * Pattern match on the result, executing the error handler.
   *
   * @param handlers - Object with `ok` and `err` handler functions
   * @returns The result of the error handler
   *
   * @example
   * Err("oops").match({
   *   ok: (v) => `Success: ${v}`,
   *   err: (e) => `Error: ${e}`,
   * })  // "Error: oops"
   */
  match<U>(handlers: { ok: (value: never) => U; err: (error: E) => U }): U {
    return handlers.err(this.error)
  }

  /**
   * Check if this is an Ok result.
   * Useful for type narrowing in conditionals.
   */
  isOk(): this is Ok<never> {
    return false
  }

  /**
   * Check if this is an Err result.
   * Useful for type narrowing in conditionals.
   */
  isErr(): this is Err<E> {
    return true
  }
}

/**
 * A Result is either Ok (success) or Err (failure).
 * Use this type for operations that may fail in expected ways.
 */
export type Result<T, E> = Ok<T> | Err<E>

/**
 * Create a successful Result containing a value.
 *
 * @param value - The success value
 * @returns An Ok Result
 *
 * @example
 * import { Ok } from '@thesis-co/cent';
 *
 * const result = Ok(42);
 * result.ok        // true
 * result.value     // 42
 */
export function ok<T>(value: T): Ok<T> {
  return new Ok(value)
}

/**
 * Create a failed Result containing an error.
 *
 * @param error - The error value
 * @returns An Err Result
 *
 * @example
 * import { Err } from '@thesis-co/cent';
 *
 * const result = Err(new Error("something went wrong"));
 * result.ok        // false
 * result.error     // Error: something went wrong
 */
export function err<E>(error: E): Err<E> {
  return new Err(error)
}
