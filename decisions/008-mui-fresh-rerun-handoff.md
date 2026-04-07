# 008: MUI Fresh Re-run Handoff Brief

Date: 2026-04-06
Origin: Thinking Track review of Carbon v2.2 audit output
Status: Ready for execution

---

## Context

A detailed review of `audit/carbon/v2.2/carbon-audit-v2.2.json` against `audit/material-ui/v2.2/mui-audit-v2.2.json` found five structural problems in the MUI file that prevent reliable comparison. The MUI v2.2 file is effectively a v2.1 audit in a v2.2 wrapper -- it was migrated to the v2.2 schema without recalculating scores or fixing legacy issues. A fresh re-run is needed.

Additionally, the MUI audit was run without code-side evidence or documentation site inspection, while the Carbon audit included full GitHub repo inspection and coverage of carbondesignsystem.com. This creates a structural asymmetry: Carbon scores on 56 dimensions with code + docs evidence, MUI scores on 47 with Figma-only evidence.

---

## What needs to happen

### 1. Fix three structural issues (before or during re-run)

**A. Finding dimension IDs must use full prefixed keys.**

All 14 MUI findings reference dimensions using short names (e.g. `"token_implementation"`). They must use the full prefixed format matching the dimension keys in the clusters object (e.g. `"1.1_token_implementation"`). Carbon's findings already use the correct format. This is required for programmatic cross-referencing between findings and dimensions.

**B. Overall score must use the weighted formula.**

The current MUI overall score (55.3) equals the simple unweighted average of all scored dimension percentages. The weights config (`config/scoring-weights.json`) defines the formula as `sum of (cluster_score x cluster_weight)`. Carbon's overall score (62.5) correctly uses this formula. Apply the same formula to MUI. The cluster scores themselves are correct (simple averages of scored dimensions within each cluster).

**C. Severity thresholds must be consistent with Carbon.**

MUI assigns severity "note" to Tier 2 dimensions scoring 1/2. Carbon assigns "warning" to the same scores on the same dimensions. Use Carbon's approach: 1/2 on a Tier 2 dimension = warning. This affects dimensions 4.17, 4.18, 4.20, 4.22, 4.23, 4.26, 4.27.

Also: MUI dimension 5.4 (deprecation_patterns) scores 1/4 but has severity "warning". Per the threshold rule (0-1 = blocker), this should be "blocker".

### 2. Expand evidence sources

**A. Add MUI GitHub repository.**

Repository: `https://github.com/mui/material-ui`

Key packages to inspect:
- `packages/mui-material/src/` -- component source, TypeScript types, prop definitions
- `docs/data/material/components/` -- MDX documentation pages per component
- `packages/mui-material/src/styles/` -- theme structure, default theme
- `test/` -- test coverage (visual regression, unit, accessibility)

This fills the 9 currently-null dimensions: 2.2 (composability), 2.4 (escape hatches), 3.2 (doc structure), 3.4 (usage guidance), 5.3 (contribution standards), 5.5 (test coverage), 5.6 (adoption visibility), 5.7 (code consistency), 6.5 (behaviour parity).

Use `extract-code-tokens.mjs` with `--system mui` for token extraction. Use GitHub raw file inspection for documentation and governance dimensions (same approach as the Carbon audit).

**B. Add MUI documentation site.**

Site: `https://mui.com/material-ui/`

The MUI docs site has per-component pages with:
- Component overview and description (maps to 3.1, 3.3 levels 1-2)
- Usage guidance and "when to use" sections (maps to 3.3 level 4, 3.4)
- Props/API documentation (maps to 3.3 level 2-3)
- Accessibility notes (maps to Cluster 4)
- Examples and demos

Inspect component documentation pages to score dimensions 3.1, 3.2, 3.3, 3.4, and 4.25 with external docs evidence. This is the same approach used for Carbon, where carbondesignsystem.com documentation contributed to intent quality and usage guidance scores.

The audit should note in dimension narratives where documentation exists on the docs site but not in Figma, and flag the co-location gap (documentation exists but is not accessible to an agent working from the Figma file alone).

### 3. Run a fresh full audit

Do not patch the existing file. Run the complete two-phase audit from scratch:

- Phase 1: Fresh REST API discovery (component count, variables, styles)
- Phase 2: Full scoring across all 56 dimensions with all evidence sources
- Output to `audit/material-ui/v2.2/mui-audit-v2.2.json` (overwrite existing)
- Include `version_delta` referencing the current v2.2 as previous (audit_id: `material-ui-v2.2-2026-04-06`, score: 55.3)
- Use the same prompt version (v2.2) and weights config (v2.1) as the Carbon audit

### 4. Post-run validation

After the re-run, verify:
- All 56 dimensions scored (0 nulls expected with code repo in scope)
- Overall score = sum of (cluster_score x cluster_weight), verified against `config/scoring-weights.json`
- All finding dimension references use full prefixed keys (e.g. `1.1_token_implementation`)
- Tier 2 severity thresholds: score 1/2 = warning (not note)
- Score 0 or 1 on 0-4 dimensions = blocker
- Finding_ids in dimensions cross-reference to actual findings
- Evidence_sources populated on every scored dimension
- Remediation items have id (REM-NNN), value_framing, and impact_categories

### 5. Update benchmarks manifest

Update `data/benchmarks/benchmarks-manifest.json` with the new MUI audit metadata.

---

## Files to reference

- `CLAUDE.md` -- architectural rules, dimension definitions
- `config/scoring-weights.json` -- weights and severity thresholds
- `audit/schema/audit-schema.json` -- output schema
- `prompts/audit-prompt.md` -- audit prompt v2.2
- `audit/carbon/v2.2/carbon-audit-v2.2.json` -- reference for structural consistency

---

## What not to change

- Do not modify the schema, prompt, or weights config
- Do not change Carbon's audit file
- Do not add new dimensions or clusters
- The methodology question about formalising external documentation scoring is deferred to v2.3
