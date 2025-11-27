/**
 * Base class for all domain errors.
 *
 * Domain errors represent expected failure conditions in the business logic.
 * They are NOT programming bugs - those should throw regular Error.
 *
 * Domain errors are returned via the Result type, not thrown.
 */
export abstract class DomainError extends Error {
  /**
   * Error code for programmatic handling
   */
  abstract readonly code: string;

  /**
   * HTTP status code hint for API responses
   */
  abstract readonly httpStatus: number;

  /**
   * Additional context about the error
   */
  readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;

    // Maintains proper stack trace for where error was instantiated
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts to a plain object for serialization
   */
  toJSON(): {
    name: string;
    code: string;
    message: string;
    context?: Record<string, unknown>;
  } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      ...(this.context && { context: this.context }),
    };
  }

  /**
   * Returns a user-friendly error message
   */
  toUserMessage(): string {
    return this.message;
  }
}
