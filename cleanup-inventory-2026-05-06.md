# Repo cleanup inventory — 2026-05-06

Phase 1 report. No files have been changed. Each section ends with fields for Bárbara's review marks before Phase 2.

---

## 1.1 Active work

Content currently being iterated per CLAUDE.md. These are kept as-is.

| Path | State |
|---|---|
| `audit/material-ui/v3.2/` (4 files + .md) | Current MUI audit — active |
| `audit/carbon/v3.2/` (4 files + .md) | Current Carbon audit — active |
| `audit/schema/` (3 files) | Current schemas: audit v3.0, remediation v1.0, editorial v1.1 — active |
| `prompts/audit-prompt.md` | Current prompt v3.2 — active |
| `config/scoring-weights.json` | Scoring weights v2.1 — active |
| `data/dimension-reference.json` | Dimension reference v2.3, 56 dimensions — active |
| `data/benchmarks/benchmarks-manifest.json` | Benchmark manifest — active |
| `scripts/compile-editorial.mjs` | Editorial workflow — active |
| `scripts/render-editorial.mjs` | Editorial workflow — active |
| `scripts/diff-tokens.mjs` | Token parity scoring (Cluster 6) — active |
| `scripts/extract-code-tokens.mjs` | Audit runs — active |
| `scripts/normalise-figma-variables.mjs` | Audit runs — active |
| `scripts/read-figma-doc-frames.mjs` | Audit runs — active |
| `scripts/output/mui-*` (9 files) | Cached Figma/code API responses for MUI — active |
| `scripts/output/carbon-*` (8 files) | Cached Figma/code API responses for Carbon — active |
| `CLAUDE.md`, `CONTEXT.md`, `CHANGELOG.md` | Persistent context — active |
| `decisions/001–013` | Full ADR chain — active |
| `docs/release-plan.md` | Release plan — active |
| `docs/audit-dimensions-v2.0.md` | Dimension definitions — active |
| `docs/onboarding/` (4 files) | Onboarding docs — active |
| `system/` | POC design system (tokens, contracts, index, docs) — active |
| `manifest.json` | System manifest — active |

---

## 1.2 Archive candidates

Historical or reference content with lasting value but no active iteration. No deletions — move to vault.

### Old audit runs

| Path | Reason | Proposed vault path |
|---|---|---|
| `audit/toimi/v1.0/` | Initial POC audit. Pre-schema v2.0. Old field structure (`audit_metadata` not `meta`). | `Archived-audits/toimi/v1.0/` |
| `audit/toimi/v1.2/` | Same. | `Archived-audits/toimi/v1.2/` |
| `audit/material-ui/v1.3/` | MUI at schema v1.3. Pre-cluster structure, pre-remediation. 5 releases back. | `Archived-audits/material-ui/v1.3/` |
| `audit/material-ui/v2.0/` | MUI at v2.0. Intermediate schema iteration. | `Archived-audits/material-ui/v2.0/` |
| `audit/material-ui/v2.1/` | MUI at v2.1. Single file only (`mui-audit-v2.1.json`). | `Archived-audits/material-ui/v2.1/` |
| `audit/material-ui/v2.2/` | MUI at v2.2. Pre-editorial, pre-cluster 3 renaming. | `Archived-audits/material-ui/v2.2/` |
| `audit/material-ui/v3.0/` | MUI at v3.0. First three-file run but pre-editorial. | `Archived-audits/material-ui/v3.0/` |
| `audit/material-ui/v3.1/` | MUI at v3.1. Previous benchmark (directly superseded by v3.2). | `Archived-audits/material-ui/v3.1/` |
| `audit/carbon/v2.2/` | Carbon at v2.2. Pre-three-file structure. | `Archived-audits/carbon/v2.2/` |
| `audit/carbon/v3.0/` | Carbon at v3.0. Pre-editorial. | `Archived-audits/carbon/v3.0/` |
| `audit/carbon/v3.1/` | Carbon at v3.1. Previous benchmark (directly superseded by v3.2). | `Archived-audits/carbon/v3.1/` |

### PPS POC work

| Path | Reason | Proposed vault path |
|---|---|---|
| `audit/pps/v2.0/` (6 files) | PPS design-file POC audit. Not a current test vehicle. Full three-file audit + supporting JSONs. | `Archived-audits/pps/v2.0/` |
| `audit/pps-design-file-poc/` (3 files) | POC observations and gap notes from the same PPS run. Belongs alongside the audit. | `Archived-audits/pps-design-file-poc/` |
| `scripts/scan-pps-doc-frames.mjs` | Self-described "one-off" in the file comment. PPS-specific. | Alongside PPS archive |
| `scripts/output/pps-*.json` (6 files) | Cached API responses from PPS audit run. Belongs with the PPS output. | Alongside PPS archive |

### Handoff document

| Path | Reason | Proposed vault path |
|---|---|---|
| `docs/front-end-cursor-handoff.md` | One-time handoff doc written for a Cursor session. Not active documentation. | `Archived-docs/` or delete — your call |

**Vault root to confirm:** `/Users/barbara.rebolledo/My Claude Vault/Thinking-tracks/design-x-ai/ds-ai/`

**Mark each row above with `[OK]`, `[KEEP]`, or a path correction before Phase 2.**

---

## 1.3 Deletion candidates

Files git already handles or that have no value. Deletions, not moves.

| Path | Reason |
|---|---|
| `audit/carbon/v3.2/carbon-remediation-v3.2.json.zip` | Manual backup of `carbon-remediation-v3.2.json`, which is already tracked in git. Redundant. |
| `audit/pps/v1.0/` | Empty directory. No files. |
| `scripts/output/home-*.json` (24 files) | Untracked. One-off scan output of a "home" Figma file — `home-branches.json`, `home-file-structure.json`, and 11 pairs of `home-page-*-d2.json` / `home-page-*-full.json`. Not referenced anywhere in CLAUDE.md or any active script. |
| `.DS_Store` (9 instances) | macOS filesystem artefacts. Gitignored and not committed. Local cleanup only — no git action needed. Locations: repo root, `audit/`, `audit/carbon/`, `audit/material-ui/`, `audit/pps/`, `data/`, `docs/`, `node_modules/`, `system/`. |

**Mark each row above with `[OK]` or `[KEEP]` before Phase 2.**

---

## 1.4 Convention violations

Naming rules from CLAUDE.md: hyphens not underscores; full words; audit output files follow `[system]-[type]-[vX.Y].json`.

| File | Violation | Note |
|---|---|---|
| `audit/material-ui/v1.3/material-ui_findings_v1.3.json` | Uses underscores; uses `_findings_` not `-audit-`. | Pre-dates convention. Will be archived anyway — no rename needed. |
| `audit/toimi/v1.0/toimi-ai-readiness.json` (+ v1.2) | Uses `-ai-readiness` suffix not `-audit-v1.0`. | Pre-dates convention. Will be archived anyway — no rename needed. |

No active files have naming violations. Convention fixes are only needed if any of these are kept rather than archived.

---

## 1.5 Scripts directory state

**Active scripts (6):** `compile-editorial.mjs`, `render-editorial.mjs`, `diff-tokens.mjs`, `extract-code-tokens.mjs`, `normalise-figma-variables.mjs`, `read-figma-doc-frames.mjs`

**Vehicle-specific (1):** `extract-mui-theme.mjs` — extracts MUI's JS theme object. Usable for future MUI re-runs but not generalisable to Carbon or other vehicles. No equivalent exists for Carbon (Carbon's tokens are in JSON, not a JS theme export). Ambiguous: not a one-off but also not part of the generic audit toolkit.

**One-off/orphaned (1):** `scan-pps-doc-frames.mjs` — first line of the file reads `// One-off: scan PPS pages at depth 2`. PPS-specific. Archive candidate (see 1.2).

**Package.json:** No `scripts` entries exist for any of these. All run manually with `node scripts/X.mjs`. No CI config references them.

**scripts/output/:** Acts as a cache directory for Figma and code API responses. Currently committed to git — includes active MUI and Carbon caches (should stay) plus PPS and home-page outputs (archive/delete per 1.2 and 1.3 above).

**Proposed changes (confirm before Phase 2):**

1. Archive `scan-pps-doc-frames.mjs` alongside PPS archive (see 1.2).
2. Clarify `extract-mui-theme.mjs` status: keep as MUI-specific utility, or archive alongside old MUI runs? No immediate action if kept.
3. Optional: add named `scripts` entries to `package.json` for `render-editorial` and `compile-editorial` since these are run regularly with flags. Low priority.
4. No structural reorganisation needed. Flat layout is appropriate at this scale.

---

## 1.6 Docs reconciliation

Inconsistencies between CLAUDE.md and current repo state.

| # | Location in CLAUDE.md | Issue |
|---|---|---|
| 1 | Repo structure listing | `README.md` is listed but does not exist. |
| 2 | Repo structure listing | `audit/baseline/`, `audit/latest/`, `audit/diffs/` are listed but do not exist. |
| 3 | Three-file architecture rule | Says `editorial-schema.json (v1.0)` — should be `(v1.1)` following ADR 013. |
| 4 | Decisions list in repo structure | Lists only up to `010-cluster-3-taxonomy-and-naming.md`. ADRs 011, 012, 013 are missing. |
| 5 | Data directory section + repo structure | `data/benchmarks/benchmarks-manifest.json` exists but is not mentioned. |
| 6 | Docs directory in repo structure | `docs/front-end-cursor-handoff.md` exists but is not listed. |
| 7 | "How to navigate this repo" | `CONTEXT.md` is listed in the repo structure but not in the reading-order section. |
| 8 | Nowhere | `node_modules/` + `package.json` with React/MUI dependencies exist but are not mentioned anywhere. The scripts are pure Node.js `.mjs` using only built-in APIs — none of these dependencies are imported by any active script. Appears to be a leftover from a POC of `system/`. Worth investigating whether these can be removed (run `npm ls --depth=0` to confirm nothing imports them). |

Items 1–7 are docs-only fixes (update CLAUDE.md). Item 8 requires a question: **is `node_modules/` with React/MUI an active dependency or a leftover?**

---

## Phase 2 readiness

When you have reviewed and marked each item above, say "execute Phase 2" and I will proceed in order: 2a archive moves → 2b deletions → 2c scripts → 2d convention fixes → 2e docs reconciliation. Each step commits separately.
