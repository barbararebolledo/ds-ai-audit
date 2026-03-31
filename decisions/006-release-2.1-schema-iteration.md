# Decision 006: Release 2.1 -- Schema Iteration and Efficiency Improvements

**Status:** Accepted
**Date:** 2026-03-31
**Release:** 2.1

---

## Context

Release 2.0 restructured the audit from eleven flat dimensions to seven clusters
with 44 dimensions. The v2.0 audit output used a cluster-based JSON structure that
had diverged from the v1.4 schema. Release 2.1 aligns the schema with the v2.0
reality, adds remediation planning, improves audit efficiency, and updates the
documentation scoring methodology.

Four workstreams, all completed in this release.

---

## Workstream 1: Audit schema iteration

### Problem

The v1.4 schema defined flat dimensions with 0-100 scores. The v2.0 audit output
used clusters with nested dimensions, 0-4 scores, evidence_sources, and cluster
scores. The schema no longer described the actual output.

Additionally, the audit produced findings but no actionable remediation plan. Users
had to derive priorities from raw findings.

### Decisions

**Schema aligned with v2.0 structure.** Top-level `dimensions` replaced with
`clusters` containing nested dimensions. This is a breaking change from v1.4. The
v1.4 schema is preserved in git history (tag v2.0).

**Remediation section added.** Three categories: `quick_wins` (hours, immediate
improvement), `foundational_blockers` (days/weeks, required for advancement),
`post_migration` (deferred). Each item has: action, affected_cluster,
affected_dimensions, effort_estimate (hours/days/weeks), ownership
(design/engineering/both), optional projected_score_improvement and finding_ids.

**severity_rank integer added to findings.** 0=pass, 1=note, 2=warning, 3=blocker.
Enables sorting findings by severity without string comparison.

**cluster_summary added to clusters.** One-sentence headline per cluster for
executive summaries and dashboards.

**Recommendations mandatory on all findings.** No finding without a recommendation.
Some v2.0 findings omitted recommendations; this is no longer permitted.

**Schema versioning rule updated.** "Additive only after v1.3" replaced with
"additive only within a major version." v2.1 is a breaking change from v1.4;
within v2.x, changes are additive only.

### Files changed

- `audit/schema/audit-schema.json` -- rewritten for v2.1

---

## Workstream 2: Two-phase audit

### Problem

The v1.4 audit ran all REST API calls and scored all dimensions regardless of
whether evidence existed. For files with few components, few variables, or no code
repository, many dimensions produced null scores after consuming API calls and
context window tokens for no benefit.

### Decisions

**Phase 1 (discovery).** Runs all four REST API calls and produces a summary:
component count, variable collection count, style count, page list, and a
per-cluster evidence availability map. Presented to the user before Phase 2.

**Phase 2 (targeted scoring).** Scores only dimensions with evidence. Skips entire
clusters when discovery shows no relevant data. For single-component files
(component_count <= 1), skips statistical dimensions (3.1, 5.1) where coverage
percentages are meaningless.

**Skip logic rules:**
- Cluster 6 skipped entirely when no code repository is available.
- Code-only dimensions (2.2, 2.4, 3.2, 3.4, 5.3, 5.5, 5.6, 5.7) score null
  without skipping the parent cluster.
- Skipped dimensions have score: null, severity: null, empty finding_ids.

### Files changed

- `prompts/audit-prompt.md` -- procedure rewritten as two-phase
- `CLAUDE.md` -- two-phase audit added as architectural rule

---

## Workstream 3: Token reduction

### Problem

REST API responses contain substantial data not needed for scoring: thumbnail URLs,
user metadata, version history, canvas positions, plugin data, export settings.
This inflates context window usage and slows processing.

MCP `get_design_context` returns the full node tree when only variable definitions
are needed for token binding checks.

### Decisions

**Response filtering.** REST API responses are filtered before processing. Stripped:
thumbnailUrl, user metadata, version history, canvas positions (unless needed for
touch target checks), plugin data, export settings. Kept: component
names/descriptions/variant properties, variable data, styles, page names, node IDs.

**get_variable_defs preference.** For MCP calls that only check token bindings (not
full component structure), use `get_variable_defs` instead of `get_design_context`.

**Pre-compute cache formalised.** All REST API data cached as filtered JSON in
`scripts/output/` with `{target}-` prefix convention. Phase 1 produces cache files,
Phase 2 reads from them. Existing v2.0 cache files (`mui-figma-variables-raw.json`,
`mui-figma-variables-normalised.json`, `mui-default-theme.json`,
`mui-doc-frames.json`) remain valid.

### Files changed

- `prompts/audit-prompt.md` -- token reduction section added
- `CLAUDE.md` -- REST API section updated with cache reference

---

## Workstream 4: Documentation dimension update

### Problem

Dimension 3.3 (intent quality) lacked a structured scoring framework. "Functional
purpose vs visual description" was too vague. Patterns (loading, empty state, error
recovery) were not audited as first-class targets. Cluster 4 needed renaming.

### Decisions

**Six-level documentation hierarchy for Dimension 3.3:**

1. Purpose (what it does, scope, out of scope)
2. Structure (anatomy)
3. Intended behaviour (states, transitions)
4. Main use cases
5. Error handling
6. Edge cases

Weight shift: components emphasise levels 1-2, patterns emphasise levels 4-5.

**Patterns as first-class audit targets.** The audit checks whether documented
interaction patterns exist (loading, empty state, error recovery, validation,
navigation, dismissal) and whether they follow the same documentation hierarchy.

**Cluster 4 renamed** from "Craft Baseline" to "Design Quality Baseline" in
CLAUDE.md, audit-dimensions-v2.0.md, and decision 005. Final name to be decided
in the editorial/tone of voice phase. Historical audit output files (v2.0) not
modified.

**Documentation meta-principles added to CLAUDE.md:** thorough, succinct, plain
language, no duplication, document once and link, link to external frameworks.

### Files changed

- `CLAUDE.md` -- documentation hierarchy, meta-principles, Cluster 4 rename,
  patterns as audit targets, dimension references updated
- `docs/audit-dimensions-v2.0.md` -- Dimension 3.3 expanded, Cluster 4 renamed
- `decisions/005-release-2.0-research-scan.md` -- Cluster 4 renamed

---

## Open questions carried forward

- Scoring weights config needs updating to reflect cluster-based structure. Currently
  still references v1.4 flat dimensions. Deferred to the validation run.
- Whether the six-level documentation hierarchy needs weighted scoring (some levels
  worth more than others) or binary presence scoring is TBD after the validation run.
- Pre-compute cache staleness detection: currently relies on manual comparison of
  Figma file version. Automated staleness check deferred.
