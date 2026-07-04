# Title scene Matilda pursuer - 2026-07-03

## Scope

- Added the real `MatildaMesh` model to the title scene's pursuing enemy group.
- Reused `MatildaMesh movementPose` instead of creating a title-only stand-in.
- Kept gameplay logic unchanged.

## Files

- `Developer/r3f_prototype/src/components/TitleScene3D.jsx`
- `Developer/r3f_prototype/src/components/TitleScene3D.test.jsx`

## Verification

- `npm test -- src/components/TitleScene3D.test.jsx`
- `npm test -- src/components/TitleScene3D.test.jsx src/components/GraphicsStudioPreview.test.js src/lib/graphicsStudioConfig.test.js src/components/MatildaMesh.test.js`
- `npm run build`

