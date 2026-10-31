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

## jiyiji sandbox deployment — 2026-10-27

User-authorized frontend sandbox, kept separate from the production document root:

- [Portfolio sandbox](https://jiyiji.cn/webqing/sandbox/pr-14/)
- [Huijing sandbox](https://jiyiji.cn/webqing/sandbox/pr-14/3d/huijing-huayuan/?basemap=tencent)

Runtime revision `89652f63b3cc95bbd17c4ca1d4e8a5843af9b68f`; all54allowlisted runtime files passed public HTTP200 and SHA256 checks. No merge or production release. Existing portfolio Qing Bot retains its existing API; no separate chat backend or spatial backend was deployed. Spatial Assistant remains unavailable on the hosted static viewer. Cloudflare is unchanged.

The in-app browser inspection timed out; Edge fallback passed the deployed smoke test: guided suggestion pill, Tencent map, six towers from the inclusive100m query, B02 selection/card (30floors,114m,22500m²), and visible30m clipping. The hosted Spatial Assistant toggle is disabled as intended. No model message was submitted. Broader responsive, terrain and navigation acceptance remains separate.

## Real spatial API sandbox candidate — 2026-10-28

The requested acceptance target is actual spatial model behavior on jiyiji, beyond the previously deployed static frontend. The candidate frontend enables its Spatial Assistant only at the exact jiyiji PR14 viewer path and uses the separate spatial sandbox API namespace. Other public pages remain gated. This candidate is not yet deployed.

The private backend candidate adds browser-session cookies, source/catalog validation, two concurrent requests, persistent daily budget40total/20per-source, bounded context and explicit provider failure. It reuses server-resident Qing Bot credentials; none enter the public repository. Five topic cases plus one browser GIS action form the initial six-call smoke evaluation; they do not establish general accuracy. Remote backend/service/proxy installation is pending explicit approval following automatic approval rejection. No real spatial provider request has occurred in this stage. PR remains unmerged.

## Round2 patch candidate —2026-10-29

The candidate connects the existing three-record OSM snapshot to a closed show_metro_entrances action. Browser validation checks source hash, expected identities/labels/coordinates, actual attached markers and current viewer context before acknowledging display. It frames the recorded points while preserving building selection and cuts. Unsupported viewers, stale catalogs and forged/failed results cannot produce success. Snapshot station labels do not verify station association, entrance opening, accessibility or walkable routes. The hosted return link stays within the sandbox.

Private backend updates add the metro source/capability to context, concise orientation guidance with one next step, schema-consistent bounded history and model-output error attribution. Raw visitor dialogue, prompts, private code and credentials remain outside the public artifact. Offline regression bundles pass, including a source-derived public metro envelope fixture and actual point/bridge functions with explicit DOM/map stubs. These are not rendered-browser or live-model quality results.

The user selected patch publication followed by manual testing; no new automated model call is authorized for this Round2 publication. Keep PR draft/unmerged and publish only to the existing jiyiji sandbox after checks. Manual sequence: fresh/reloaded viewer and conversation, 介绍一下项目 then 看看地铁. Record actual answer and visible3point display separately from transport/JSON checks. First-round failures remain preserved.

Round2 publication verified2026-10-29: runtime6b41155 is now on the existing jiyiji sandbox, paired with private service buildhuijing-round2-20261029. All54public files passed HTTP/hash verification; private source matches were checked separately. The normal chat route and production static index checks remain unchanged. No new automated model call was made; the user will perform the two-turn manual acceptance.
