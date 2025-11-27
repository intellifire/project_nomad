# P2-003: Environment Variable Handling

## Description
Set up environment variable handling for deployment mode and agency selection following Clean Architecture with application interface and infrastructure implementation.

## Acceptance Criteria
- [ ] Create `IEnvironmentService` interface in application layer
- [ ] Create `EnvironmentService` implementation in infrastructure layer
- [ ] Read `NOMAD_DEPLOYMENT_MODE` (default: "SAN")
- [ ] Read `NOMAD_AGENCY_ID` (optional, used in ACN mode)
- [ ] Validate deployment mode is "SAN" or "ACN"
- [ ] Update backend to use dotenv for .env file loading
- [ ] Export service from infrastructure config barrel

## Dependencies
- P2-001 (Configuration Types) - COMPLETE

## Estimated Time
1-2 hours

## Files to Create/Modify
- `backend/src/application/interfaces/IEnvironmentService.ts` (interface defining contract)
- `backend/src/infrastructure/config/EnvironmentService.ts` (implementation)
- `backend/src/infrastructure/config/index.ts` (export EnvironmentService)
- `backend/.env.example` (add new variables)
- `backend/src/index.ts` (ensure dotenv loaded early)

## Notes
- Environment variables override JSON config for certain values
- Keep sensitive values (API keys) in env, not JSON config
