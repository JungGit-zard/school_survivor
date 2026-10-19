# PLAYER - hair underside shell correction

Replaced the temporary three-quad lining with an inward hair shell and connected boundary rims. Original outer hair coordinates retained; 29 non-hair meshes unchanged. Face texture and UV preserved. Archive candidate only.

Actual total: 1220 triangles. Hair boundary edges: 0; winding conflicts: 0; nonmanifold edges: 0. Face opening remains open; the hair surface itself has real thickness. Opaque FrontSide five-band toon [45,105,170,225,255], outline enabled in viewer.

Blender rebuild, GLB structural verification and Chrome QA passed. Advisor inspected low front, both low front obliques, low rear and top captures. See advisor_underside_shell_review.json and chrome_refined_qa.json. Older captures are historical.

Backup: before_underside_shell_fix/.

Current files:
- PLAYER_wholebody_refined_t_efe49b7c.blend SHA256 3e91d59953b7e6b088857cef4189555fe5e0118e4e7815c9f7cc6d77032abf26
- PLAYER_wholebody_refined_t_efe49b7c.glb SHA256 a341578580d0e2afbefd7a673a8b32cff3a5d0c6ad2119f2d9a230e3df668f7d
- PLAYER_wholebody_refined_t_efe49b7c_standalone.html SHA256 835897ba584e3d38c3538d3f7487224a0937d056789fd4ddc5acf9ab54fa9ce0

Latest lower-face correction: 16 under-jaw polygons use clean skin material sampled from the original atlas with sRGB-to-linear conversion. Mouth and eyes retain original texture; all geometry and UV loops match before_lower_face_cleanup. Advisor reviewed front and both low obliques. Packed raster unchanged. Total1220tri.

Previous viewer correction (superseded): project-existing stencil centered inverted hull (toon.js/playerV9Outline.js). Renderer stencil enabled; fill ref3 Always/Replace order90, hull BackSide NotEqual/Keep order91, depthTest on/depthWrite off, color0x050209 opacity0.96. Preview scale1.04 with existing2x inflation gives1.08. Source GLB/blend hashes unchanged. Base1220 triangles plus1220 outline draw triangles. Added outline on/off buttons. Nine on/off view comparisons passed with zero new black pixels inside baseline opaque mask; Advisor visually reviewed front close, both low obliques and full threequarter. Backup in before_stencil_outline_fix.

Latest viewer: uniform screen-space outline, default3 CSS pixels. Replaces percentage scale with vertex-shader pixel extrusion and welded outline-only normals; retains stencil/depth masking. Head and lower-body front p90 distances both3px, threequarter2.83/3px. Resize900x700 and width5 uniform updates verified, default restored3. Nine opaque-interior comparisons pass; partially covered antialias edge pixels are excluded from interior classification. Source assets unchanged. Advisor inspected full3q and low-left close. Backup before_uniform_pixel_outline.

Current user-specified outline width:6CSS pixels. Default and every compiled outline shader uniform verified6 in Chrome; full3q screenshot inspected. Evidence:outline_6px_check.json. Earlier3px measurements are historical.
