/**
 * Domain Errors
 *
 * Error types for expected failure conditions in business logic.
 * These are returned via Result type, not thrown.
 */

// Base error class
export { DomainError } from './DomainError.js';

// Validation errors (400)
export { ValidationError, type FieldError } from './ValidationError.js';

// Not found errors (404)
export { NotFoundError } from './NotFoundError.js';

// Engine errors (500)
export { EngineError, EngineErrorCode } from './EngineError.js';
