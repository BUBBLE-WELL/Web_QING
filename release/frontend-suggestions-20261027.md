# Shared suggestions and viewer workspace — frontend review

Story choices, Qing Bot guided rounds and Spatial Assistant suggestions now use one reusable pill component. The default state has no arrow; hover and keyboard focus reveal a decorative prefix without changing button width or accessible name. Used guided options remain disabled. Existing chat requests, round progression, project links and return-position behavior are preserved.

The Huijing page has a separate project header, foldable tools and chat region, matching the portfolio palette and typography. Narrow screens show one panel at a time; collapse and resize preserve chat drafts and scene state. The assistant title is 空间助手.

## Component contract

Load `widgets/suggestions.css` after the page stylesheet. Use a native `button` with `suggestion-chip` for new suggestions; existing story `choice-chip` uses the same rules. Preserve the original event handler, disabled property and accessible text. Decorative hover content does not belong in labels. Keep ordinary navigation, tool controls and message bubbles separate from suggested replies.

## Scope

This PR contains public frontend files only. It does not publish a spatial backend, provider configuration, CAD source, private evidence or agent sessions. Spatial chat mounts only in the existing loopback development environment. Public static hosting keeps its building/layer/section tools; the assistant toggle remains disabled until a supported local connection is available. Local-only POI and development groups are hidden on public hosts. No merge or deployment is included.

## Verification

- Four existing release test files pass: actual GLB/building selection and clipping, transition readiness/error recovery, portfolio content/card destinations, and return-position behavior.
- Local private workflow/transport regressions: 54 checks pass, including nine model-adapter tests with a fake transport and no external request. These are not a semantic accuracy score.
- Browser: Qing Bot guided option uses the shared pill at measured 378 px content width; Spatial Assistant suggestions and composer inspected at 416 px. No horizontal overflow. Default/hover/focus styles verified; a 90 px suggestion stays 90 px on hover. Accessible names exclude the decorative arrow. Prior workspace checks at 375/768/1280 remain historical shell evidence, not a new complete viewport sweep.
- Runtime allowlist contains 54 files. Existing geometry, georeference and vendor content have no semantic changes.

Real provider testing is pending explicit approval. The local default remains deterministic; no live model quality or production chatbot integration is claimed.
