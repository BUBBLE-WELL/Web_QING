# Huijing selection and sections — verification, 2026-10-18

## Changed

Building-level selection now joins IFC-derived meshes and 2D candidate footprints through one state. The card reports model-derived storey counts, heights and slab outline area. Added horizontal height clipping, east–west vertical clipping, optional translucent boards and a frontend viewer API. Fixed the author-approved WGS-84 origin and removed every deployment alignment control and browser override.

## Automated checks

- Real GLTFLoader parsed all seven existing GLBs. All 461 massing slab IDs map uniquely to 80 geometric candidates; all candidates have meshes. The 384 floor intervals agree with per-building counts.
- Selection/deselection material changes, unknown IDs, actual ray hits, rejected clipped hits, finite-number validation, floor intervals including empty roof level, geographic east–west plane at several rotations, and GCJ-02 conversion passed in the Node harness.
- Three Python geometry tests passed: adjacent versus stacked footprints; union of same-level slabs; exclusion of basement/plinth; empty height interval; polygon hole preservation. The installed Python environment emits an unrelated ArcGIS initialization warning before the successful tests.
- All seven GLBs and previous runtime geometry files remain byte-identical to the reviewed release baseline.

## Browser checks

- OSM: real 3D click selected B05. With every massing mesh hidden, a ground footprint click selected B03 and flew to it. Re-enabling the meshes preserved the selected state.
- Tencent: with meshes hidden, a ground footprint click selected B03; restoring meshes and switching to OSM retained selection. Startup, model/overlay alignment, real 3D click B05, Esc deselection, horizontal/vertical sliders and translucent board visibility passed. Seven GLBs loaded, including the lazy wall/railing group. Roads and all three metro entrances were enabled.
- Before alignment was retired, moving and rotating in alignment mode updated the overlays and vertical trace. After retirement, an align=1 URL exposed zero alignment controls, and the deployment code has no localStorage alignment override.
- CSS widths 375, 768 and 1440 were inspected, including OSM and Tencent at 375. At 375 and 768, document scroll width equalled viewport width; keyboard slider input worked and the panel scrolled. Coordinates approved by the author remained fixed.
- An obsolete preview server stopped during earlier testing and caused a lazy-layer fetch error. Final checks used a fresh local server; its seven GLB requests returned HTTP 200. No final-viewer console error was observed.

## Release checks

The 39-entry public manifest matches the default-deny asset allowlist; text leak scanning includes GeoJSON. Five viewer runtime files change (HTML, JS, fixed georeference and two new GeoJSONs). Seven GLBs and existing scene/vector data are unchanged relative to main. Existing release line endings in scene/vendor files are preserved; content matches the development viewer. The preceding staged release retains all 39 recorded file hashes.

Wrangler 4.124.0 produced the dry-run worker output and printed `--dry-run: exiting now`; no deployment command without dry-run was used. The CLI remained alive after that completion message and was stopped; a clean CLI process exit is not claimed. Wrangler logs 58 discovered directory entries before applying its ignore function; this is not the reviewed public file count. The release regression harness and git diff whitespace check pass.

## Evidence limits

The previously reported click failure was not reproduced after reload. Real-asset auditing found no sanitized-name mismatches in this dataset, so name sanitization is not a confirmed root cause. Original-name mapping and explicit mesh building IDs harden future identity resolution; passing real clicks and ray tests establish current behavior.

The floor overlay is a discrete storey representation, not an exact geometric intersection. Vertical/horizontal cuts are uncapped. Geographic placement is visually approved and approximate, not survey-grade. Geometric grouping is heuristic and may include platforms with zero counted floors; 80 is not an independently surveyed building inventory. Building IDs can change when source geometry changes. No LLM Tool Calling, spatial backend or production deployment is included.

## Tower totals for author review before deployment

| ID | Storeys | Height (m) | Slab outline area sum (m²) |
|---|---:|---:|---:|
| B01 | 30 | 114.0 | 22,500 |
| B02 | 30 | 114.0 | 22,500 |
| B03 | 30 | 114.0 | 21,414 |
| B04 | 29 | 110.2 | 15,246 |
| B05 | 29 | 110.2 | 21,750 |
| B06 | 28 | 106.4 | 21,000 |

The georeference is approved. These counts/areas still require explicit author review before deployment. PR #7 is merged, so the feature branch targets current main. Existing staged production artifacts remain untouched. CV claims about accepted or deployed linkage remain pending PR acceptance and the release decision.
