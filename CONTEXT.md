# Context

## What this practice is building toward

The hypothesis is that design systems can be made machine-readable enough that AI agents produce reliable, reviewable output from them. Not perfect output, but output with a known quality level that correlates to measurable properties of the system. If a system scores 4/4 on token implementation and 1/4 on component descriptions, an agent working with it will resolve colours correctly but generate incorrect usage guidance. The audit is the measurement tool that makes this correlation visible. The goal is a repeatable methodology that Accenture Song can apply to any client design system to determine its AI-readiness and prioritise remediation.

## What exists in this repo

The **three-layer token system** (system/tokens/) demonstrates the architecture that makes a design system machine-readable: primitives hold raw values, semantic tokens alias primitives by role, component tokens alias semantic tokens by component property and state. Alias chains must remain unbroken. This architecture was built from scratch for the POC.

The **Button POC** (system/contracts/button.contract.json, system/docs/button.md) is a single component implemented against the three-layer architecture with all properties bound to Figma Variables. It proves that a component defined this way can be fully resolved from tokens by an AI agent without human intervention.

The **component contract format** (system/contracts/) defines the schema for describing a component's properties, variants, states, and token bindings in JSON. It is the interface between Figma (where the component lives) and the agent (which reads the contract to understand how to use it).

The **audit structure** (audit/toimi/) contains versioned AI-readiness assessments of the Toimi Foundation and Component libraries. Each version has a JSON source of truth and a Markdown summary derived from it. Audits are organised by library and version (v1.0, v1.2).

The **decisions directory** (decisions/) records architecture decision records for the audit methodology and its evolution.

## Open questions

Whether audit scores correlate to remediation success over time has not been tested. v1.0 is a baseline. If scores improve after remediation and agent output quality improves correspondingly, the methodology is validated. If scores improve but output quality does not, the dimensions are wrong.

Whether the current eight dimensions (plus governance as the ninth) are the right ones is an open question. Future audits against different design systems may surface gaps that require new dimensions or reveal that existing ones overlap.

Whether Figma-to-code synchronisation checks are feasible at scale with the current MCP tooling is unproven. The v1.0 audit hit timeout limits on full-file queries and required page-by-page workarounds. A mature system with hundreds of components may require a different tooling approach.

## Session update — March 2026

### Reorientation: from POC script to auditing agent

The tool has been reoriented around a clearer target state. The four-phase sequence
is: Audit (Phase 1), MVP (Phase 2), Beta (Phase 3), Stable (Phase 4). Phase 4 is the
vision: multiple agents active, the system learns, designers define intent. Every
decision made now should be reversible or extensible toward it.

The audit tool is now explicitly client-agnostic. To apply it to a specific client,
duplicate the repo and create client-specific prompt and config variants. The core
script, schema, and dimensions are not modified for client needs.

### Dimensions expanded to ten

A tenth dimension has been added: documentation quality and intent coverage. It scores
whether component documentation captures functional intent rather than visual
description. It reads from the component description field first; falls back to
documentation frames if the description is absent or thin. This dimension is also an
AI-readiness signal because bloated or low-intent documentation pollutes RAG retrieval
in Phase 3.

The full ten dimensions are defined in CLAUDE.md as the stable reference. Prompt files
reference them rather than redefining them.

### Test vehicle change

The Toimi library served as the initial POC test vehicle. From Release 1.3 onward the
primary test vehicle is Material UI (Figma community file + GitHub repository). It is
a well-documented public system with known gaps between the Figma and code
representations -- good for stress-testing the diff logic. A studio-built library
follows in Release 2.1 for a more realistic real-world test.

### Findings must reference contract fields

Every finding in the audit JSON must reference which contract field it relates to:
token definition, component contract, documentation contract, or governance rule.
This is required for future codegen pipeline compatibility. The finding structure was
designed in the schema session and written to disk as audit-schema.json (originally audit-schema_v1.3.json).

### JSON schema is the continuity layer

The audit JSON schema (audit/schema/audit-schema.json) is the continuity layer across
all releases. Additive changes only after v1.3. Every release produces a versioned
prompt file committed alongside the findings it produced. The prompt version is
recorded in the audit JSON.

### What the audit is not doing yet

The script does not write to Figma, does not automate remediation, does not run as a
continuous agent, and does not build a Figma plugin. These are Phase 2 and later
capabilities. The plugin question is assessed at Release 3.0 with evidence.

### Open questions carried forward

The eight questions from the original open questions section remain open. Additional
open items from the skills review and gap analysis are tracked in decisions/ as
numbered ADR files. Key items pending: reading the Edenspiekermann audit-design-system
skill source, reading the Firebender sync-figma-token skill source, confirming the
Material UI Figma community file URL, confirming the MUI code token format, and
aligning the schema with the colleague working on the write side of the POC.

## Session update — April 2026 (Release 2.2-schema)

### Front-end pre-handoff decisions

This session prepares the audit schema and supporting data for the front-end build
(Konsta). Five tasks completed in sequence.

**React framework for front-end.** The front-end will be a React application consuming
the audit JSON directly. No markdown rendering. JSON is the source of truth. The
framework choice aligns with Konsta's stack and with the audit tool's JSON-primary
architecture.

**Static JSON loading.** The front-end loads audit JSON files statically (file import
or fetch from a known path). No API server. No database. The audit tool produces JSON;
the front-end reads it. This keeps the architecture simple and the front-end
deployable as a static site.

**Manifest approach for benchmarks.** When multiple audit outputs exist (different
systems or versions), a manifest file lists available audits. The front-end reads the
manifest to populate a selector. The manifest is a simple JSON array with metadata
(system_name, audit_date, run_id, file path), not embedded in the audit schema.

**Comparison model.** Score comparison between two audit runs uses the existing
version_delta structure in the schema. The front-end renders delta as a side-by-side
or overlay view. No new schema structure needed.

**Dimension reference extraction.** All 56 dimensions extracted from CLAUDE.md and
scoring criteria into `data/dimension-reference.json`. Keyed by dimension ID, each
entry has name, cluster, description, evidence_sources, and score_levels. The
front-end reads this file to render scoring rubrics without parsing CLAUDE.md. Note:
the actual count is 56 dimensions (not 44 as previously stated -- the count increased
when Tier 2 dimensions were expanded in v2.0 but the summary text was not updated).

**Finding summary field.** Each finding now has a `summary` field (one-line overview)
distinct from `description` (full detail). Summary is used in list views; description
in drill-down views. Added to schema v2.2 and backfilled on all 14 MUI v2.1 findings.

**New meta fields.** Three fields added to the meta block:
- `system_name` (string, required) -- human-readable name for display.
- `audit_date` (string, ISO 8601 date, required) -- for date-level grouping.
- `run_id` (string, required) -- UUID for deduplication and cross-referencing.
These complement the existing `audit_id` and `timestamp` fields but serve
front-end display and data management needs specifically.

### Dimension count correction

The CLAUDE.md and exploration plan previously stated "44 dimensions." The actual
count is 56: 1 (Cluster 0) + 6 (Cluster 1) + 4 (Cluster 2) + 5 (Cluster 3) +
27 (Cluster 4: 15 Tier 1 + 12 Tier 2) + 7 (Cluster 5) + 6 (Cluster 6). The MUI
v2.1 audit output already scored all 56. The discrepancy was a documentation lag
from the v2.0 restructure where Tier 2 dimensions (4.16-4.27) were added but the
summary count was not updated. Current state section in CLAUDE.md corrected to 56.

## Session update — April 2026 (Schema v2.2 update)

### Two-JSON architecture formalised

The editorial JSON schema (v1.0) has been defined as the companion to the audit
data JSON. It carries all client-facing prose: edited finding copy, value framing,
cluster narratives, and report-level content. The front-end merges both at render
time, preferring editorial content when present.

The editorial JSON keys into the data JSON by cluster key, dimension ID, finding ID,
and remediation item ID. All sections are optional. An empty editorial JSON (just
the meta block) is valid; the front-end falls back to the data JSON for everything.

### RemediationItem additions

Three fields added to RemediationItem in the audit schema (v2.2):
- `id` (string, required): stable identifier (REM-001 pattern) for editorial JSON
  cross-referencing.
- `value_framing` (string, optional): operational consequence of not fixing this item.
  Audit-generated; can be overridden by the editorial JSON.
- `impact_categories` (array of enum, optional): which impact model categories
  (correction_cycles, theme_rework, parity_defects, token_efficiency) this action
  affects. Connects remediation items to the impact calculator.

`component_count` (optional integer) added to Summary for the impact model.

### Content workflow for Eeva

The editorial JSON is the file Eeva edits (via a markdown extraction and compile-back
workflow). A compile script extracts it to markdown with sections keyed by ID. Eeva
edits the markdown. The script compiles it back to JSON. The front-end consumes the
merged result. The glossary and workflow documentation for Eeva are prerequisites
before she starts editing.