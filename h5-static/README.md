This is Cui Wanqing's Personal Website. Or is it?
https://github.com/BUBBLE-WELL/Web_QING.git

# h5-static
Static H5 portfolio MVP for Cui Wanqing. The live direction is a v5 conversation-driven evidence browser: landing creates atmosphere, the story view provides a single continuous reading stream, and project cards carry source-backed portfolio evidence.

`index.html` is the Vercel entrypoint. It loads `kg-app.css` and `kg-app.js` and should stay synchronized with the public build.

## Current Product Model

- Landing: lower-left identity, typewriter intro, top-right static web, spider descent, and the `say Hi` action.
- Story shell: a left auxiliary rail plus a right `.main-area` reading stream.
- Main stream: `#chat-thread`, `.tag-panel`, and `#case-results` are semantic sections in one continuous feed, not separate reading windows.
- Left rail: `#conversation-index` is derived from `messages`; contact stays compact and secondary.
- Conversation: `say Hi` -> intro -> `tell me some things about you` -> profile card (now carries credentials + data/design value prop + personal judgment) -> Workshop Alert preview -> `overview` / `browse by tag` / `open project grid`.
- Follow-up actions: in-flow only at the bottom of project results; the old fixed dock is archived, not live.
- Content: H5 is the live base, v3 informs voice, and v4 informs concrete evidence detail.

## v5 Acceptance Phases

### Phase 0 - Baseline Lock

- `.main-area` remains the only desktop right-side vertical scroll container.
- `#chat-thread` does not get its own `max-height` or `overflow-y`.
- The conversation index jumps to message anchors inside `.main-area`.
- No live dock, tooltip layer, graph/D3, model API, fake input box, or UE5/Unreal claim.

### Phase 1 - Basic Framework

- The basic journey is fixed: `say Hi` -> profile -> starters -> evidence.
- Profile stays compact: roles, degree, tools, languages.
- Tags are filter controls, not a second navigation system.
- Cards remain grouped as `analytics cases` and `earlier design work`.
- Mobile is single-column with no horizontal overflow.

### Phase 2 - Narrative + Evidence Alignment

- Intro/overview explain the plain-English model-world gap: maps, labels, and AI checks simplify reality, and the projects test when that changes decisions.
- Evidence lenses stay readable without changing the `CASES` schema: POI as discoverability (was semantic gap), MAUP as spatial uncertainty + policy connection, GeoAI as governance gap with one concrete control written out, design work as lived-world site/plan/render evidence with a design decision point.
- MAUP remains the main interactive evidence moment: radius toggle, `76.3% -> 55.9%`, and `165 planning units`.

### Phase 3 - Script Integration

Script content should stay separate from low-level layout code. Stable hooks:

```text
INTRO
PROFILE
STARTERS
EVIDENCE_ROUTE_DEFAULT
EVIDENCE_ROUTE_FAST_RECRUITER
FUTURE_CONFLICT
```

### Phase 4 - Workshop / Multi-Agent Slice

A static Workshop Conflict preview is live after the first assistant intro: a red OS-style alert can be dismissed or replayed from the left rail, and `Listen in` opens an observer-only agent dialogue. Full Phase 4 remains deferred: no model calls, no user input, and no production evidence-jump system yet.

## Starter Semantics

- `overview`: compact summary and collapsed previews.
- `browse by tag`: tag panel first; project results appear after a tag is selected.
- `open project grid`: all validated project cards with expandable evidence.

## Chip and Tag Rules

- Starter/action chips use concise visible labels and `aria-label` only.
- Follow-up chips render only in the in-flow result follow-up area.
- Tag chips keep the dark code-pill style and wrap via container `gap`; do not use CSS pseudo-content to add hashtag text.
- Buttons should not use native `title`, `data-hint`, or a custom tooltip layer unless a separate UI decision reverses this.
- Project count is derived from `CASES.length`; do not hard-code the number elsewhere.

Tag hints in code:

- `#spatial_data`: where location changes the answer
- `#embedding`: comparing meanings with vectors
- `#data_quality`: defaults and errors that change decisions
- `#platform_governance`: search, map, and product risk
- `#geoai`: AI systems with place-specific risk
- `#ethics`: accountability and contestability
- `#taxonomy`: naming systems and labels
- `#planning_design`: earlier planning and design work
- `#visualization`: BIM and Twinmotion visual communication

## View Modes

The app uses `document.body.dataset.view`:

- `chat`: conversation-first state; tags/cards hidden until a starter is selected.
- `overview`: compact summary and collapsed previews.
- `tag`: tag panel dominant; filtered cards appear after tag choice.
- `grid`: all project cards visible in a library layout.
- `split`: taxonomy explanation plus results; mobile collapses naturally.

## Architecture

- Message list: role/kind-based bubbles rendered from message objects.
- Conversation index: generated from meaningful `messages`, excluding transient dots and chip-only rows.
- Client-side FSM: `dispatchConversation(event)` controls `Hi`, profile, starter choices, view changes, tag clicks, and card toggles.
- Data layer: `CASES`, `TAGS`, `PROFILE`, starters, and follow-ups stay separate from rendering.
- Card details are category-aware: analytics cards use `data · workflow · method` and technical depth; design cards use `site · plan · render`.

Future LongChain/server integration should replace only the assistant-response source. The public build currently has no input box, no send button, and no model provider call.

## Spider Contract

- `#thread` is fixed to the viewport top; its `height` is the descent distance.
- `#spider-wrap.top` must always equal `#thread.height`.
- Do not replace this top/height binding with transform movement.
- Keep right offsets at `44px` on mobile and `76px` on desktop, and do not use negative top values or the HTML `hidden` attribute.

## Project Source Docs

Editable project drafts live in `workspace/projects/`:

- `h5_case_maup_ugcop.md`
- `h5_case_poi_semantic_audit.md`
- `h5_case_responsible_geoai.md`

The live frontend still renders the public `CASES` constant until the next end-to-end sync.

## Public Safety

- No browser-side model provider calls.
- No API keys.
- No internal evidence board.
- No fake chat input or send button.
- No future project claim until evidence, role, and scope are validated.

## Local Preview

From this folder:

```bash
python -m http.server 5173
```

Open `http://localhost:5173`.

## Deploy on Vercel

1. Import the `Web_QING` repository.
2. Set Root Directory to the repository root that contains `index.html`.
3. Use Framework Preset `Other`.
4. Leave Build Command empty.
5. Set Output Directory to `.`.

