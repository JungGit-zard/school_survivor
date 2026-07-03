# Matilda forward lean animation - 2026-07-03

## Scope

- Added Matilda's straight-move pose as a 45 degree forward lean.
- Kept the root/body center stable while the upper body leans forward.
- Moved legs and boots into the moving body group so they stay connected during the lean.
- Connected Graphics Studio Matilda preview to the existing Motion control:
  - `normal` keeps idle hover.
  - `charge` shows the forward movement pose.

## Files

- `Developer/r3f_prototype/src/components/MatildaMesh.jsx`
- `Developer/r3f_prototype/src/components/MatildaMesh.test.js`
- `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx`
- `Developer/r3f_prototype/src/components/GraphicsStudioPreview.test.js`

## Verification

- `npm test -- src/components/MatildaMesh.test.js`
- `npm test -- src/components/GraphicsStudioPreview.test.js`
- `npm test -- src/components/MatildaMesh.test.js src/components/GraphicsStudioPreview.test.js src/components/ZombieMesh.test.js src/components/GraphicsStudio.test.jsx src/lib/graphicsStudioConfig.test.js`
- `npm run build`
