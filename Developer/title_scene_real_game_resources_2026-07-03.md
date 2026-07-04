# Title Scene Real Game Resources

Date: 2026-07-03

## Scope

- Kept the title scene background structure: floor, side walls, exit door, fog, and lights.
- Replaced foreground-only title placeholder resources with existing runtime game components.

## Implementation

- `TitleScene3D.jsx` now uses:
  - `PlayerMesh`
  - `ZombieMesh`
  - `MatildaMesh`
  - `ClassroomDesk`
  - `ClassroomChair`
  - `UnconsciousStudent`
- Removed title-only zombie head silhouettes and school sign props from the foreground.
- Kept the title chase composition with five zombie students, one large boss zombie, and one Matilda pursuer.

## Verification

- `npm test -- src/components/TitleScene3D.test.jsx`
- `npm test -- src/components/TitleScene3D.test.jsx src/components/ZombieMesh.test.js src/components/MatildaMesh.test.js src/components/GraphicsStudioPreview.test.js src/lib/graphicsStudioConfig.test.js`
- `npm run build`

