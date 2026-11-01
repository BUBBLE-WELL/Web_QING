
## 2026-11-01 — managed visibility correction

User screenshot showed all controls off while labels and plan linework remained visible. Cause: markers were attached unconditionally and a separate place-plan-context layer bypassed scene controls. Removed the duplicate plan layer. Project labels are now a normal scene item, off by default; the existing final-floorplan item owns plan line visibility and renders above the massing when enabled. Presentation uses revision-checked temporary visibility ownership; returning restores only unchanged owned visibility. Manual off/on survives; async loading cannot re-enable manually hidden items. Group checkbox handlers freeze the requested target before child-state synchronization.

Verification: nine source tests pass, including the actual marker module with explicit DOM/map stubs, default hidden state, managed display, manual off and return ownership. Browser verification was attempted but the browser connector failed and native app approval timed out; no rendered acceptance is claimed for this correction. No new model calls. Sandbox only; production static unchanged.
