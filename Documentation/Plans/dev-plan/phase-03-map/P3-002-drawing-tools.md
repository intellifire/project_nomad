# P3-002: Drawing Tools (Point, Line, Polygon)

## Description
Implement map drawing tools for user geometry input using MapBox Draw.

## Acceptance Criteria
- [ ] Integrate @mapbox/mapbox-gl-draw
- [ ] Create `DrawingToolbar` component with tool selection
- [ ] Support point drawing mode
- [ ] Support line drawing mode
- [ ] Support polygon drawing mode
- [ ] Emit geometry on draw complete (as GeoJSON)
- [ ] Support clearing/deleting drawn features

## Dependencies
- P3-001 (MapBox Wrapper)

## Estimated Time
3-4 hours

## Files to Create/Modify
- `frontend/src/features/Map/components/DrawingToolbar.tsx`
- `frontend/src/features/Map/hooks/useDrawing.ts`
- `frontend/src/features/Map/types/geometry.ts`

## Notes
- Output standard GeoJSON format
- Consider custom draw styles matching fire theme
- Handle mobile touch events
