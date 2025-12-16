/**
 * openNomad API Module
 *
 * The communication layer between the Dashboard component and backend services.
 *
 * @example
 * ```typescript
 * import { IOpenNomadAPI, Model, Job } from '@/openNomad';
 * ```
 *
 * @module openNomad
 */

// Re-export all types and the main interface
export type {
  // Common types
  BBox,
  GeoJSONGeometry,
  PaginationParams,
  PaginatedResponse,
  Unsubscribe,

  // Auth types
  User,
  UserRole,

  // Model types
  EngineType,
  ModelStatus,
  Model,
  ModelCreateParams,
  TemporalParams,
  WeatherParams,
  FWIStartingCodes,
  OutputParams,
  ModelFilter,

  // Job types
  JobStatus,
  Job,
  JobStatusDetail,

  // Result types
  OutputType,
  ModelResult,
  ResultMetadata,
  ModelResults,
  ExportFormat,
  ExportParams,

  // Spatial types
  WeatherStation,
  FuelTypeData,
  FuelType,
  ElevationData,

  // Config types
  Engine,
  AgencyConfig,

  // Main API interface
  IOpenNomadAPI,
} from './api.js';
