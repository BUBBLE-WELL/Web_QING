# PR14 sandbox: spatial labels and guided plan views

Visitors can locate three design entrances plus CAD reference labels for the landscape, nursing home and commercial area. E01 is pedestrian-only; E02/E03 are vehicle-capable. Functional labels are drawing references, not validated area boundaries or evidence of current operations. The commercial reference remains explicitly pending review.

The bounded place-display action checks catalog revision, allowed IDs and exact records before applying effects. Automatic north-up framing adds temporary plan context and provides a return-view control. Existing metro, building selection and section behavior remain supported. No authored oblique camera tour, validated route network or current opening assertion is introduced.

Validation: private backend regression covers 56 tests; the selected promoted JavaScript suite has seven passing entries. Six exploratory live calls found an unsolicited action proposal, overlong introductions and initially unhelpful framing. The first two are recorded as failures rather than a success rate. The final introduction context-selection patch is offline-tested and awaits live/manual acceptance. Rendered map and return checks are recorded separately. Public files are hash-verified on the isolated jiyiji sandbox; the production static index is unchanged.

PR remains draft/unmerged. Private prompts, CAD originals, source entity lineage, credentials and raw trial transcripts are excluded from this repository.
