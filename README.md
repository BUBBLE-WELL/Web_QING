# Web_QING

Cui Wanqing's bilingual portfolio and project archive.

## Visit the website

- [中国访问 / Visit from China](https://jiyiji.cn/webqing/)
- [海外访问 / Visit from overseas](https://tiny-waterfall-0f0a.jellycwq.workers.dev/)

<details>
<summary>Maintainer notes</summary>

This repository is the reviewed public-release mirror. Development happens in the local `re-job-hunter/h5/h5-static` workspace; do not develop the application independently here.

### Release contract

1. Validate the development source.
2. Promote only paths in `h5/release/public-files.txt` with `promote-webqing.ps1`.
3. Review the release-branch diff, then commit, open a pull request, and merge to `main`.
4. Deploy the merged revision to both production targets.
5. Verify HTTP responses, runtime references, PostHog events, and deployed file hashes before calling the release synchronized.

`wrangler.jsonc` configures the overseas static deployment. `h5-static/.assetsignore` is default-deny so review notes, repository metadata, and non-manifest files are not uploaded.

Vercel and GitHub Pages are not production targets for this release topology.

</details>

### Huijing viewer

The viewer has shared 2D/3D building selection, horizontal and east–west vertical clipping, and optional translucent section boards. Placement is fixed to the author-approved georef.json; there is no deployment alignment mode. Runtime assets buildings.geojson and floorplates.geojson contain inferred building/platform groups and discrete storey intervals. Slab outline area is computed from geometry rather than an Archicad GFA quantity.

`window.huijingViewer` provides select, clear, flyTo, setSection, setVerticalSection, setLayer and queryBuildings, plus selected/section/verticalSection getters. setLayer returns the layer-loading Promise. This is a frontend API.

Run `node tests/huijing-viewer.test.mjs` for the real-asset regression harness. See [verification and tower totals](release/huijing-selection-section-20261018.md). This change is awaiting review and has not been deployed.

### Interaction update

The shared solid-color spider curtain wraps Say Hi and the 3D destination's actual first-render readiness. Project links stay in new tabs; the source portfolio preserves its view, expanded cards and reading position. The launched viewer's return control closes that tab, with a safe switch-tab fallback.

The project index offers both Open page and Show card where available. Singapore Coastal Change has a source-backed bilingual research card without an invented demo URL. Run the interaction, return-position and portfolio-content Node tests alongside the existing viewer test. This change is a separate PR against main after the Huijing PR #10 merge; no deployment is included.
