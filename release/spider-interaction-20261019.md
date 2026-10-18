# Interaction verification — 19 October 2026

This PR adds a shared solid-background spider curtain, fixes project-index card navigation, and preserves the original portfolio when projects open in new tabs. It targets main after Huijing PR #10 was merged. No deployment or merge is included.

## Behavior

- Say Hi drops the curtain and spider, changes scenes, then lifts them with a rebound. The curtain travels 112vh and the spider rig 68vh. The existing landing spider remains independent.
- The 3D destination shows the same curtain before the MapLibre vendor script, then lifts after the model's first rendered frame. Slow loading and errors offer View page and Retry. Reduced motion skips the decorative movement.
- Project links retain native new-tab behavior, noopener and noreferrer. Original grid/filter/card state remains alive; an anchor bookmark restores the reading position after responsive viewport changes. Deliberate scrolling cancels the bookmark. The launched viewer return control closes its tab; if closing is blocked, it asks the visitor to switch to the original tab.
- Show card now uses the actual document scroll owner on mobile and the main-area owner on desktop. Bounding rectangles account for the fixed mobile header. Both Xiazhuang and Huijing expand the intended card and land its heading below the header.
- The index exposes both Open page and Show card where applicable. Singapore Coastal Change has a bilingual research card based on local coursework evidence and confirmed contributions. No public demo URL is invented.

## Validation

Four Node suites pass: interaction lifecycle/recovery/accessibility, portfolio content/index IDs, scroll-owner/return-position/header positioning, and the real Huijing assets with ray selection and clipping (80 groups, 384 storey outlines, seven GLBs).

Visible in-app browser checks covered Say Hi, the new coastal card and language switching, Wake Me Up's separate destinations, actual 3D startup and return, and the two reported design-card buttons. At a 652 CSS-pixel mobile layout, Xiazhuang landed at 77.80px and Huijing at 78.19px beneath a 70.33px header. Earlier 474px-wide return testing restored the clicked viewer link within 0.1 CSS pixel after the child tab closed and the source viewport resized. Slow/error fixtures are local only, excluded from the release manifest. Reduced-motion behavior is covered by the Node harness rather than an OS setting change.

Wrangler 4.124.0 dry-run generated its output and printed `--dry-run: exiting now`; no upload/deployment was requested. Its initial invocation yielded a process session; a later session close returned exit code 0. The file-discovery log counts directory entries before the default-deny ignore filter, rather than the 41 explicitly allowed public files.

The public manifest contains 41 unique paths. The shared runtime files are explicitly allowlisted; private project evidence, bot prompt and test fixtures are excluded. The previously staged production candidate is preserved byte-for-byte.
