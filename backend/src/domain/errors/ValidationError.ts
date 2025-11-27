import { DomainError } from './DomainError.js';

/**
 * Individual field validation error
 */
export interface FieldError {
  /** Field name or path */
  readonly field: string;
  /** Error message for this field */
  readonly message: string;
  /** Invalid value (if safe to include) */
  readonly value?: unknown;
}

/**
 * Error for invalid input or business rule violations.
 *
 * Used when:
 * - User input fails validation
 * - Business rules are violated
 * - Required data is missing
 * - Data format is incorrect
 */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;

  /**
   * Individual field errors
   */
  readonly fieldErrors: FieldError[];

  constructor(message: string, fieldErrors: FieldError[] = [], context?: Record<string, unknown>) {
    super(message, context);
    this.fieldErrors = fieldErrors;
  }

  /**
   * Creates a ValidationError for a single field
   */
  static forField(field: string, message: string, value?: unknown): ValidationError {
    return new ValidationError(`Validation failed for ${field}: ${message}`, [
      { field, message, value },
    ]);
  }

  /**
   * Creates a ValidationError for multiple fields
   */
  static forFields(fieldErrors: FieldError[]): ValidationError {
    const fields = fieldErrors.map(e => e.field).join(', ');
    return new ValidationError(`Validation failed for: ${fields}`, fieldErrors);
  }

  /**
   * Creates a ValidationError for a required field
   */
  static required(field: string): ValidationError {
    return ValidationError.forField(field, 'is required');
  }

  /**
   * Creates a ValidationError for an out-of-range value
   */
  static outOfRange(field: string, min: number, max: number, value: number): ValidationError {
    return ValidationError.forField(
      field,
      `must be between ${min} and ${max}`,
      value
    );
  }

  /**
   * Creates a ValidationError for an invalid format
   */
  static invalidFormat(field: string, expectedFormat: string, value?: unknown): ValidationError {
    return ValidationError.forField(
      field,
      `must be in format: ${expectedFormat}`,
      value
    );
  }

  /**
   * Creates a ValidationError for an invalid enum value
   */
  static invalidEnum(field: string, allowedValues: string[], value: unknown): ValidationError {
    return ValidationError.forField(
      field,
      `must be one of: ${allowedValues.join(', ')}`,
      value
    );
  }

  /**
   * Checks if there are any field errors
   */
  hasFieldErrors(): boolean {
    return this.fieldErrors.length > 0;
  }

  /**
   * Gets error for a specific field
   */
  getFieldError(field: string): FieldError | undefined {
    return this.fieldErrors.find(e => e.field === field);
  }

  override toJSON(): {
    name: string;
    code: string;
    message: string;
    fieldErrors: FieldError[];
    context?: Record<string, unknown>;
  } {
    return {
      ...super.toJSON(),
      fieldErrors: this.fieldErrors,
    };
  }
}
