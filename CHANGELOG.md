# Changelog

## Unreleased — 2026-10-20

- Huijing: opt-in 规划 + 渲染（Twinmotion）layer group. Textured Twinmotion export (MIHOYObuild + roof, the copy carrying the Twinmotion materials, plus the roads that only exist in MIHOYObuild3), site furniture and planters; 13 / 1.6 / 0.5 MB, meshopt-compressed, loaded only when ticked.
- New scene.json item type `gltf`: a GLB with its own materials, re-lit as Lambert like the massing, clipped by both section planes, not pickable (selection stays on the IFC massing).
- Vendored three 0.160.0 `meshopt_decoder.module.js`; four new runtime files in both allowlists (45 public files).
- Viewer test covers the render items (decode, Lambert, section planes, picking unchanged). No production deployment.

## Unreleased — 2026-10-18

- Huijing building grouping, shared 2D/3D selection, attribute card and viewer API.
- Horizontal height slicing, east–west vertical clipping and translucent section boards.
- Fixed approved georeference and removed deployment alignment controls.
- Added buildings.geojson and floorplates.geojson to both runtime allowlists.
- Browser and real-asset checks documented; no production deployment.
