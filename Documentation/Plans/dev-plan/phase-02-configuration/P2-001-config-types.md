# P2-001: Configuration TypeScript Types

## Status: SKIP/COMPLETE

Configuration types already exist in Clean Architecture compliant location:
- `backend/src/application/interfaces/IConfigurationService.ts`

This file contains:
- `ApplicationConfig` - Root configuration type
- `AgencyBrandingConfig` - Agency branding
- `DataSourceConfig` - Data source configuration
- `EngineConfig` - Fire modeling engine configuration
- `ExportOptionsConfig` - Export options
- `RoleConfig` - Role mappings
- `IConfigurationService` - Service interface
- `DeploymentMode` - Type for SAN/ACN modes

## Description
Define the TypeScript types/interfaces for the configuration system, matching the JSON schema from project_plan.md.

## Acceptance Criteria
- [x] Create `NomadConfig` root type with all configuration sections (exists as `ApplicationConfig`)
- [x] Create `AgencyConfig` type (id, name, branding) (exists as part of `ApplicationConfig`)
- [x] Create `DataSourceConfig` type (weather, wildfirePoints, fuelTypes)
- [x] Create `ModelConfig` type (available engines, suppressed engines) (exists as `EngineConfig`)
- [x] Create `ExportConfig` type (allowed delivery methods) (exists as `ExportOptionsConfig`)
- [x] Create `RoleMappingConfig` type for agency role mapping (exists as `RoleConfig`)
- [x] Export all types from barrel file

## Dependencies
- None (can run parallel to Phase 1)

## Estimated Time
~~2 hours~~ **0 hours - already complete**

## Files to Create/Modify
~~Infrastructure layer files~~ **Already exists in Application layer (Clean Architecture):**
- `backend/src/application/interfaces/IConfigurationService.ts` ✓

## Notes
- Types already defined in Phase 1 application interfaces
- Located in application layer per Clean Architecture principles
- IConfigurationService interface provides complete contract for configuration access
- Use strict types (avoid `any`) - already implemented
- Consider Zod schemas for runtime validation (future enhancement)
