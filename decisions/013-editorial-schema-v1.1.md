# ADR 013: Editorial Schema v1.1 — scope_statement and organisational_implications

**Status:** Implemented
**Date:** 2026-05-05
**Supersedes:** Editorial schema v1.0 (introduced in Release 3.0)

---

## Decision

Bump `audit/schema/editorial-schema.json` from v1.0 to v1.1. Add two required top-level fields: `scope_statement` and `organisational_implications`. Update `scripts/render-editorial.mjs` and `scripts/compile-editorial.mjs` to handle the new fields in the Markdown round-trip.

---

## Context

Two editorial sections were designed in a Thinking Track session (2026-05-05) to address a known reading risk: a high or improving audit score being interpreted as a totality, or as evidence of organisational readiness.

The sections are scope-protective. They do not qualify the audit findings. They draw a boundary around what the instrument measures and read artefact patterns as traces of organisational capacity — never asserting a diagnosis.

Both sections anchor to critical voices the field has not fully absorbed:

- **Eric Bailey** (compliance-theatre critique): frameworks can optimise for appearing AI-ready by ticking visible boxes without addressing the harder substrate. `scope_statement` names the audit's edges so a high score cannot be read as comprehensive coverage.
- **Murphy Trueman** (*your design system might be AI-ready, your organisation probably isn't*): `organisational_implications` operationalises the Trueman argument without asserting it — reading shadow, not measuring directly.

---

## New fields

### `scope_statement` (string, required)

Multi-paragraph prose rendered after the executive summary and before the cluster scores. States what the audit measures and what it does not.

Contains `{overall_score}` and `{phase_readiness}` placeholders interpolated from the companion audit JSON at front-end render time.

**Register constraints (non-negotiable):**
- The "edges, not gaps" framing in paragraph 3 must be preserved. Do not soften.
- Do not qualify "It does not claim to measure" with "fully" or "comprehensively".
- All four scope-list items must be retained: organisational capacity, designer judgement, accessibility-in-the-trenches, brand-as-lived-practice.

### `organisational_implications` (object, required)

Three sub-fields:
- `opening` (string): invariant. Do not edit.
- `patterns` (array of objects): 3–5 per audit. Editable. Each pattern has six fields: `pattern_name`, `cluster_or_dimension_reference`, `score_value`, `supporting_observation`, `artefact_pattern_described`, `organisational_implication`.
- `closing` (string): invariant. Do not edit.

**Register constraints (non-negotiable):**
- Three-part shape per pattern (artefact pattern, suggested implication, validation invitation) is invariant. Do not collapse.
- "Often suggests" is the required modal phrase. Not "indicates", not "shows that".
- "We'd like to validate this with you in Phase 2" closes every pattern without variation.
- Opening and closing paragraphs are invariant. Variation lives in the patterns array only.

---

## Implementation

- `audit/schema/editorial-schema.json` — v1.0 → v1.1. `scope_statement` and `organisational_implications` added to `required`.
- `scripts/render-editorial.mjs` — two new sections added: Scope Statement (single editable field) and Organisational Implications (opening as static context, pattern fields editable, closing as static context).
- `scripts/compile-editorial.mjs` — `setField` extended to handle top-level scalars (e.g. `scope_statement`) and array element paths (e.g. `organisational_implications.patterns.0.pattern_name`).
- `audit/material-ui/v3.2/mui-editorial-v3.2.json` — schema_version bumped to 1.1, fields populated (3 patterns: documentation low across all surfaces, strong components with documentation unreachable from design file, parity gap).
- `audit/carbon/v3.2/carbon-editorial-v3.2.json` — schema_version bumped to 1.1, fields populated (4 patterns: Figma documentation entirely absent, full token coverage with zero explanation, strong governance with documentation workflow gap, parity gap structural but undocumented).

---

## What is not changing

- Existing fields in the editorial schema are unchanged (additive-only principle within v1.x).
- v3.1 editorial JSON files retain schema_version "1.0" and are not updated. They pre-date this field.
- Dashboard rendering of the new sections is out of scope here. Handled in a separate front-end handoff.
