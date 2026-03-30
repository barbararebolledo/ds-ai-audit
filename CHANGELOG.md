# Changelog

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

- audit-schema_v1.3.json designed and written to disk.
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
