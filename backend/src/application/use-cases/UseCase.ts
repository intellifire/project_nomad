import { Result } from '../common/Result.js';
import { DomainError } from '../../domain/errors/index.js';

/**
 * Abstract base class for use cases.
 *
 * Use cases encapsulate application business logic and represent
 * specific actions that users can perform in the system.
 *
 * Benefits:
 * - Single responsibility: each use case does one thing
 * - Testable: easy to unit test with mocked dependencies
 * - Framework agnostic: no Express, React, etc. dependencies
 *
 * @template TRequest - Input type for the use case
 * @template TResponse - Output type on success
 * @template TError - Error type on failure (defaults to DomainError)
 *
 * @example
 * ```typescript
 * interface CreateModelRequest {
 *   name: string;
 *   engineType: EngineType;
 *   location: Coordinates;
 * }
 *
 * class CreateModelUseCase extends UseCase<CreateModelRequest, FireModel> {
 *   constructor(
 *     private readonly modelRepository: IModelRepository,
 *     private readonly spatialRepository: ISpatialRepository,
 *   ) {
 *     super();
 *   }
 *
 *   async execute(request: CreateModelRequest): Promise<Result<FireModel>> {
 *     // Validate location
 *     const isBurnable = await this.spatialRepository.isBurnable(request.location);
 *     if (!isBurnable) {
 *       return Result.fail(ValidationError.forField('location', 'is not burnable'));
 *     }
 *
 *     // Create and save model
 *     const model = new FireModel({
 *       id: createFireModelId(uuid()),
 *       name: request.name,
 *       engineType: request.engineType,
 *     });
 *
 *     const saved = await this.modelRepository.save(model);
 *     return Result.ok(saved);
 *   }
 * }
 * ```
 */
export abstract class UseCase<
  TRequest,
  TResponse,
  TError extends DomainError = DomainError
> {
  /**
   * Executes the use case with the given request.
   *
   * @param request - Input data for the use case
   * @returns Result containing either the response or an error
   */
  abstract execute(request: TRequest): Promise<Result<TResponse, TError>>;
}

/**
 * Use case that doesn't require input
 */
export abstract class NoInputUseCase<
  TResponse,
  TError extends DomainError = DomainError
> {
  /**
   * Executes the use case.
   *
   * @returns Result containing either the response or an error
   */
  abstract execute(): Promise<Result<TResponse, TError>>;
}

/**
 * Use case that doesn't return a value (command)
 */
export abstract class CommandUseCase<
  TRequest,
  TError extends DomainError = DomainError
> {
  /**
   * Executes the command with the given request.
   *
   * @param request - Input data for the command
   * @returns Result indicating success or failure
   */
  abstract execute(request: TRequest): Promise<Result<void, TError>>;
}

/**
 * Helper type to extract request type from a use case
 */
export type UseCaseRequest<T> = T extends UseCase<infer R, unknown, DomainError> ? R : never;

/**
 * Helper type to extract response type from a use case
 */
export type UseCaseResponse<T> = T extends UseCase<unknown, infer R, DomainError> ? R : never;
