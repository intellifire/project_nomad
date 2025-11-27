import { DomainError } from '../../domain/errors/index.js';

/**
 * Success result containing a value
 */
interface Success<T> {
  readonly success: true;
  readonly value: T;
  readonly error?: never;
}

/**
 * Failure result containing an error
 */
interface Failure<E extends DomainError = DomainError> {
  readonly success: false;
  readonly value?: never;
  readonly error: E;
}

/**
 * Result type for operations that can fail with expected errors.
 *
 * Use Result instead of throwing exceptions for business logic failures.
 * This makes error handling explicit and type-safe.
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number> {
 *   if (b === 0) {
 *     return Result.fail(ValidationError.forField('divisor', 'cannot be zero'));
 *   }
 *   return Result.ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.success) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export type Result<T, E extends DomainError = DomainError> = Success<T> | Failure<E>;

/**
 * Result factory and utility functions
 */
export const Result = {
  /**
   * Creates a successful result
   */
  ok<T>(value: T): Success<T> {
    return { success: true, value };
  },

  /**
   * Creates a failure result
   */
  fail<E extends DomainError>(error: E): Failure<E> {
    return { success: false, error };
  },

  /**
   * Checks if a result is successful
   */
  isOk<T, E extends DomainError>(result: Result<T, E>): result is Success<T> {
    return result.success;
  },

  /**
   * Checks if a result is a failure
   */
  isFail<T, E extends DomainError>(result: Result<T, E>): result is Failure<E> {
    return !result.success;
  },

  /**
   * Maps a successful value to a new value
   */
  map<T, U, E extends DomainError>(
    result: Result<T, E>,
    fn: (value: T) => U
  ): Result<U, E> {
    if (result.success) {
      return Result.ok(fn(result.value));
    }
    return result;
  },

  /**
   * Maps a successful value to a new Result (flatMap/chain)
   */
  flatMap<T, U, E extends DomainError>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>
  ): Result<U, E> {
    if (result.success) {
      return fn(result.value);
    }
    return result;
  },

  /**
   * Gets the value or returns a default
   */
  getOrDefault<T, E extends DomainError>(result: Result<T, E>, defaultValue: T): T {
    return result.success ? result.value : defaultValue;
  },

  /**
   * Gets the value or throws the error
   */
  getOrThrow<T, E extends DomainError>(result: Result<T, E>): T {
    if (result.success) {
      return result.value;
    }
    throw result.error;
  },

  /**
   * Combines multiple results into a single result
   * Returns first failure if any fail, otherwise array of values
   */
  combine<T, E extends DomainError>(results: Result<T, E>[]): Result<T[], E> {
    const values: T[] = [];
    for (const result of results) {
      if (!result.success) {
        return result;
      }
      values.push(result.value);
    }
    return Result.ok(values);
  },

  /**
   * Wraps a function that might throw into a Result
   */
  fromTry<T>(fn: () => T, errorMapper: (e: unknown) => DomainError): Result<T> {
    try {
      return Result.ok(fn());
    } catch (e) {
      return Result.fail(errorMapper(e));
    }
  },

  /**
   * Wraps an async function that might throw into a Result
   */
  async fromTryAsync<T>(
    fn: () => Promise<T>,
    errorMapper: (e: unknown) => DomainError
  ): Promise<Result<T>> {
    try {
      return Result.ok(await fn());
    } catch (e) {
      return Result.fail(errorMapper(e));
    }
  },

  /**
   * Executes a side effect for successful results
   */
  tap<T, E extends DomainError>(
    result: Result<T, E>,
    fn: (value: T) => void
  ): Result<T, E> {
    if (result.success) {
      fn(result.value);
    }
    return result;
  },

  /**
   * Executes a side effect for failed results
   */
  tapError<T, E extends DomainError>(
    result: Result<T, E>,
    fn: (error: E) => void
  ): Result<T, E> {
    if (!result.success) {
      fn(result.error);
    }
    return result;
  },
};
