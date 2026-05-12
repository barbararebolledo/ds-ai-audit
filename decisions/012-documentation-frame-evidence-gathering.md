# ADR 012: Documentation frame evidence gathering

**Date:** 16 April 2026
**Status:** Draft
**Triggered by:** PPS UI Library exploratory audit (methodology stress test)

---

## Context

The PPS UI Library stores component documentation in structured Figma frames rather than in component description fields. Each component has a dedicated documentation frame named `[component name] documentation` containing a consistent template: anatomy, properties table, usage guidelines (when to use / when not to use), variants and states, styling with state coverage, web components, mobile components, and a changelog.

The current audit prompt instructs Claude Code to read component descriptions via the Figma REST API `/components` endpoint. This endpoint returns the `description` field on published components. It does not return content from documentation frames on pages. The PPS audit scored Cluster 3 as near-empty despite substantial documentation existing in the file.

This is not a PPS-specific issue. Any design system that documents components via in-file pages rather than component metadata will be invisibly penalised by the current evidence-gathering strategy.

---

## Problem

Dimension 3.5 (In-file documentation structure) is designed to score whether Figma files contain structured documentation readable directly from the file. The dimension definition is correct. The evidence-gathering strategy does not implement it. The audit prompt never instructs the agent to look for documentation frames, so the dimension scores based on absence of evidence rather than evidence of absence.

This produces three failures:

1. **False negative on Cluster 3.** A well-documented system scores as if documentation is absent.
2. **Wrong remediation.** The audit recommends writing documentation that already exists, instead of recommending making existing documentation machine-reachable.
3. **Methodology credibility.** A system owner who sees a low documentation score despite having invested in documentation will not trust the audit.

---

## Decision

Add documentation-frame enumeration to the Phase 1 discovery prompt as a standard step.

### Phase 1 addition

After the four existing REST API calls (file structure, components, styles, variables/local), add a documentation-frame detection step:

1. From the file structure response (`GET /v1/files/{key}?depth=1`), identify all pages.
2. For each page, request child nodes at depth 2 (`GET /v1/files/{key}/nodes?ids={page_id}&depth=2`).
3. Flag any top-level frame whose name contains "documentation" (case-insensitive).
4. Report: count of documentation frames found, naming convention detected, sample of frame names.
5. If documentation frames are found, sample 3 frames via MCP to inspect the internal structure (layer tree, section headings, content depth).

### Phase 1 discovery report addition

Add a new section to the Phase 1 summary:

```
Documentation frame detection:
- Frames found: [count]
- Naming convention: [pattern, e.g. "[component] documentation"]
- Template consistent: [yes/no, based on sample]
- Sample inspected: [list of sampled frame names]
- Content depth: [which six-level hierarchy levels are covered]
```

### Phase 2 impact

When documentation frames are detected:

- Dimension 3.1 (Functional intent coverage): score against documentation frame content, not component description fields. A component with an empty description but a populated documentation frame has intent coverage.
- Dimension 3.3 (Intent quality): apply the six-level hierarchy to the documentation frame content, not the description field.
- Dimension 3.5 (In-file documentation structure): score the template structure, consistency, and machine-parseability of the documentation frames.
- Component description fields are still scored, but as a **discoverability** signal (can an agent find the documentation from the component metadata?) rather than a **content** signal (does documentation exist?).

### Scoring implication

A system with rich documentation frames but empty component descriptions should score:

- 3.1 high (intent exists)
- 3.3 high (intent quality is good)
- 3.5 high (in-file structure exists)
- But with a finding on discoverability: the documentation is not linked from the component metadata, so an agent reading only the REST API cannot find it. Remediation type: relocate (add link in description field or declare pattern in CLAUDE.md).

A system with no documentation frames and no component descriptions scores as before.

---

## Consequences

- Phase 1 discovery takes longer (additional API calls per page). For large files this could be significant. Mitigation: sample pages rather than exhaustively enumerating if page count exceeds 20.
- The audit prompt needs updating. This is a prompt-level change, not a schema-level change.
- Existing audit outputs (MUI, Carbon) are not affected. Neither uses documentation frames as the primary doc surface. Their scores remain valid.
- The co-location principle needs a third route to accommodate documentation frames with a machine-readable declaration. This is a Thinking Track topic, not a repo change. See `Thinking-tracks/design-x-ai/ds-ai/Methodology-findings/2026-04-16-documentation-frames-evidence-gap.md`.
- Dimension 3.3 scoring may need a distinction between absent, present-and-wrong, and present-and-correct intent. This is also a Thinking Track topic triggered by the PPS finding (7 misleading descriptions). Not addressed in this ADR.

---

## Implementation

1. Update `prompts/audit-prompt.md` with the Phase 1 documentation-frame detection step.
2. Update `CLAUDE.md` audit dimensions section to note the dual evidence path for 3.1, 3.3, and 3.5.
3. Re-run the PPS audit as the validation case for the updated prompt.
4. If the re-run produces materially different Cluster 3 scores, the fix is confirmed.

---

## Related

- `Methodology-findings/2026-04-16-documentation-frames-evidence-gap.md` (Thinking Track) -- full finding with three candidate ADRs
- `Sparks/2026-04-16-inverted-ds-audit-checklist.md` -- stress-test watchlist that predicted the co-location ambiguity
- ADR 010 -- Cluster 3 taxonomy and naming (defines the discoverability/readability split that this ADR depends on)
