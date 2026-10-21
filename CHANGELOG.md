# Changelog

## Unreleased — 2026-10-20

- Huijing: opt-in 规划 + 渲染（Twinmotion）layer group. Textured Twinmotion export (MIHOYObuild + roof, the copy carrying the Twinmotion materials, plus the roads that only exist in MIHOYObuild3), site furniture, planters and the surrounding terrain (soil and grass from MIHOYObuild3); 13 / 1.6 / 0.5 MB / 84 KB, meshopt-compressed, loaded only when ticked.
- New scene.json item type `gltf`: a GLB with its own materials, re-lit as Lambert like the massing; materials past the 20-texture budget get their image's average colour instead of white; clipped by both section planes, not pickable (selection stays on the IFC massing).
- Vendored three 0.160.0 `meshopt_decoder.module.js`; five new runtime files in both allowlists (46 public files).
- Viewer test covers the render items (decode, Lambert, section planes, picking unchanged). No production deployment.

## Unreleased — 2026-10-18

- Huijing building grouping, shared 2D/3D selection, attribute card and viewer API.
- Horizontal height slicing, east–west vertical clipping and translucent section boards.
- Fixed approved georeference and removed deployment alignment controls.
- Added buildings.geojson and floorplates.geojson to both runtime allowlists.
- Browser and real-asset checks documented; no production deployment.

## 2026-10-22

Add registered final master-plan linework with separate design/context/detail switches and on-demand loading; expose static building queries. Preserve PR #12 terrain and average-colour material fixes, fixed model placement and portfolio return position.
