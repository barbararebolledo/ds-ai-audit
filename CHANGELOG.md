# Changelog

## [v1.4] -- 2026-03-30

Scoring methodology formalised and weight redistribution based on MUI v1.3 audit evidence.

### Scoring methodology

- Two-layer scoring system: sub-checks scored 0-4, dimension scores derived as
  average of sub-check scores x 25 (producing 0-100). Documented aggregation
  formula replaces v1.3 implicit scoring.
- 41 sub-checks defined across eleven dimensions. Each has an ID, description,
  data source, and scoring guidance.
- Override rule: any sub-check scoring 0 forces dimension severity to blocker
  regardless of composite score.
- Severity thresholds configurable per dimension with client overrides.
- v1.3 and v1.4 scores are not directly comparable due to methodology change.

### Weight redistribution

- Flat v1.3 weights replaced with three-tier system:
  - Tier 1 (agent cannot operate): token_architecture_depth (0.14),
    component_to_token_binding (0.14), component_description_coverage (0.12),
    documentation_quality (0.12). Total: 0.52.
  - Tier 2 (output quality degrades): token_implementation (0.10),
    alias_chain_integrity (0.08), accessibility_intent_coverage (0.08),
    platform_readiness_gap (0.07). Total: 0.33.
  - Tier 3 (system hygiene): primitive_naming (0.06),
    naming_convention_consistency (0.05), governance (0.04). Total: 0.15.
- Rationale: MUI v1.3 audit scored 72 on token implementation (v1.3 highest
  weight) but was not ready. The four blockers were all in dimensions that
  v1.3 weighted lowest. Weights now reflect observed impact on AI agent
  operability.

### Dimensions

- Dimension 8 renamed from web_readiness_gap to platform_readiness_gap.
  Platform-specific checks configured in client scoring config.
- Dimension 11 added: accessibility_intent_coverage with WCAG 2.2 Level AA
  default thresholds. Five sub-checks: focus states, touch targets, contrast
  derivability, keyboard navigation, accessibility mentions.

### Schema

- audit-schema.json (was audit-schema_v1.4.json): additive extension of v1.3.
- Added accessibility_intent_coverage and platform_readiness_gap dimension keys.
- Added sub_check_scores (optional) to DimensionEntry.
- Added phase_readiness_detail (optional) to Summary.
- Added AIC and PRG finding ID abbreviations.
- web_readiness_gap retained for backward compatibility, marked deprecated.

### Phase readiness

- phase_readiness_detail added as required output: blocking dimensions, warning
  dimensions, and explicit conditions for advancement.
- Phase readiness logic unchanged: pass (>= 75, 0 blockers), conditional_pass
  (>= 50, 0 blockers), not_ready (any blocker OR < 50).

### Config

- scoring-weights.json (was scoring-weights_v1.4.json): scoring_methodology,
  severity_thresholds, sub_checks blocks added. Dimension weights updated to
  tiered distribution.

## [v1.3] -- 2026-03-30

Audit complete: Material UI 44.3/100 not ready
Four blockers: token architecture depth, component-to-token binding, component description coverage, documentation quality
Key finding: 96.2% of existing MUI descriptions are code snippets not functional intent -- validates intent hypothesis
REST API required for all calls including component enumeration, not just variables
Three token scopes required: file_content:read, file_variables:read, library_content:read
Dimensions expanded from 10 to 11:
- Dimension 8 renamed from web-readiness gap to platform-readiness gap
- Dimension 11 added: accessibility intent coverage
- Intent defined explicitly as a standalone reference in CLAUDE.md

### Reorientation and planning

- Tool reoriented as client-agnostic. Core script, schema, and dimensions are not
  modified for client needs. Client adaptation uses a duplicate repo plus
  client-specific prompt and config variants.
- Target state defined: four-phase sequence (Audit, MVP, Beta, Stable). Phase 4 is
  the vision -- multiple agents active, designers define intent.
- Release plan documented in docs/exploration-plan.md covering Releases 1.3 to 3.0+.
- Test vehicle changed from Toimi to Material UI (Figma community file + GitHub repo)
  for Releases 1.3 through 2.1. Studio library follows in Release 2.1.

### Dimensions

- Dimension 10 added: documentation quality and intent coverage. Reads from component
  description field first; falls back to documentation frames if absent or thin.
- Full ten dimensions now defined in CLAUDE.md as stable reference. Prompt files
  reference them rather than redefining them.

### Schema

- audit-schema.json (originally audit-schema_v1.3.json) designed and written to disk.
- Findings now reference contract fields (type, level, path, field) for future
  codegen pipeline compatibility.
- contract_id gap identified: contracts currently referenced by path only. Adding a
  contract_id field to contracts is deferred to v1.4.
- Schema is additive-only from v1.3 onward. No breaking changes after this version.

### Repo and documentation

- CLAUDE.md updated to reflect client-agnostic architecture, ten dimensions, client
  adaptation instructions, and current state.
- CONTEXT.md updated with reorientation decisions and session learnings.
- decisions/ open items added covering skills review findings and gap analysis
  (Edenspiekermann, Firebender, MUI file confirmation, code token format,
  colleague schema alignment).
```

---

That is everything. Once you have added this to `CHANGELOG.md` and the `CONTEXT.md` update from the previous message, you have one clean commit that covers the full reorientation session.

Commit message suggestion:
```
docs: reorientation session -- CLAUDE.md, CONTEXT.md, CHANGELOG.md, schema v1.3

## [v1.2] -- in progress

### Repo restructure

- Separated into audit/ (versioned audit outputs) and system/ (POC tokens, contracts, index, docs)
- Audit outputs moved to audit/toimi/v1.0/
- POC system files moved to system/contracts/, system/tokens/, system/index/, system/docs/
- Deleted superseded docs (architecture decisions, infrastructure guide) in favour of decisions/ ADRs and CONTEXT.md
- CLAUDE.md, CONTEXT.md, manifest.json updated with new paths
- docs/ at root reserved for GitHub Pages output in v1.3

### Planned audit changes

- Governance added as dimension 9, scored programmatically
- Full inspection of all 40 components (v1.0 inspected 6)
- Text and effect styles audited for hardcoded values
- ActionButton and Switch independently verified
- Spacing tokens audited post-rename

## [v1.0] -- 2026-03-26

### Audit scope

- Libraries: Toimi Foundation, Toimi Component
- Dimensions: 8 (token implementation, alias chain integrity, token architecture depth, primitive naming, component-to-token binding, component description coverage, naming convention consistency, web-readiness gap)
- Components deep-inspected: 6 of 40 (Button, TextInputSolid, Alert, Checkbox, Radio, Toggle)
- Governance: not scored in v1.0; identified as missing dimension during post-audit review

### Key findings

- Foundation scores 3.0 / 4.0. Token implementation and alias chain integrity are both 4/4. Spacing naming and primitive organisation drag the average.
- Component scores 1.8 / 4.0. Binding quality varies from excellent (Button) to minimal (Radio, Toggle). Description coverage is 15%, with 6 existing descriptions copied from M3/iOS.
- System score: 2.1 / 4.0 (53% AI-ready)

### Methodology decisions recorded

- decisions/001-audit-methodology-v1.0.md
- decisions/002-governance-dimension.md
