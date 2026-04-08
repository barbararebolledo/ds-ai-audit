# Front-End Build Handoff

This document is a self-contained briefing for building the AI-Readiness Audit
front-end. Read it fully, then plan the work and build the complete working app.
Visual polish will be done separately in Cursor after the first build is running.

---

## Goal

Build a React front-end that reads static JSON files produced by the audit tool
and renders them as an interactive dashboard. The front-end is read-only -- it
does not write to any files, call any APIs, or compute scores. All scores are
pre-computed in the JSON.

The front-end lives in its own repo, separate from the audit tool repo
(`ds-ai-audit`). The only interface between them is the JSON files.

---

## Local paths

The front-end repo is `ds-audit-dashboard`. The audit data lives in a sibling repo.
During development, read JSON files directly from the audit repo by relative path.
Do not copy files. Copying into `public/data/` is a deployment concern handled later.

```
/Users/barbara.rebolledo/Github repo/
├── ds-audit-dashboard/          ← you are here (front-end repo)
├── ds-ai-audit/                 ← audit tool repo (read-only, do not modify)
│   ├── audit/material-ui/v3.1/  ← MUI audit + remediation + editorial JSON
│   ├── audit/carbon/v3.1/       ← Carbon audit + remediation + editorial JSON
│   ├── audit/schema/            ← JSON schemas (for reference, not runtime)
│   ├── data/dimension-reference.json
│   └── config/scoring-weights.json
└── design-from-variant/         ← reference page prototypes (read-only)
```

- **Audit tool repo:** `../ds-ai-audit/` -- produces the JSON data. Do not modify.
- **Reference pages:** `../design-from-variant/` -- four React page prototypes with
  the visual design. All use hardcoded data from an older audit version. The design
  (dark theme, cream accent, card layout, typography) should be preserved. The data
  wiring must be replaced entirely.

---

## Data files the front-end consumes

### Per audit run (in `audit/[system]/[version]/`)

Three files joined by `audit_id`:

1. **`[system]-audit-[version].json`** -- Immutable scores, findings, structural
   facts. Schema: `audit/schema/audit-schema.json` (v3.0).
2. **`[system]-remediation-[version].json`** -- Prioritised action plan. Schema:
   `audit/schema/remediation-schema.json` (v1.0).
3. **`[system]-editorial-[version].json`** -- Prose overrides for client-facing
   polish. Schema: `audit/schema/editorial-schema.json` (v1.0).

Current benchmark runs:
- `audit/material-ui/v3.1/mui-audit-v3.1.json` (63.6/100, 4 blockers)
- `audit/material-ui/v3.1/mui-remediation-v3.1.json`
- `audit/material-ui/v3.1/mui-editorial-v3.1.json`
- `audit/carbon/v3.1/carbon-audit-v3.1.json` (62.5/100, 6 blockers)
- `audit/carbon/v3.1/carbon-remediation-v3.1.json`
- `audit/carbon/v3.1/carbon-editorial-v3.1.json`

### Global reference files

- **`data/dimension-reference.json`** -- All 56 dimensions with names,
  descriptions, evidence sources, and scoring rubrics (score level descriptions
  for each 0-4 value). Keyed by dimension ID.
- **`config/scoring-weights.json`** -- Cluster weights (sum to 1.00), dimension
  weights within each cluster, severity thresholds, phase readiness thresholds.

---

## Editorial merge rule

The front-end loads audit JSON + editorial JSON together. **Editorial wins when
present.** When an editorial field is missing or the entire editorial JSON is
absent, fall back to the audit JSON value.

Fields that can be overridden:

| Audit JSON location | Editorial JSON key path | What it overrides |
|---|---|---|
| `clusters[key].cluster_summary` | `clusters[key].narrative` | Cluster narrative |
| `clusters[key].dimensions[key].narrative` | `dimensions[key].narrative` | Dimension narrative |
| `findings[].summary` | `findings[finding_id].summary` | Finding one-liner |
| `findings[].description` | `findings[finding_id].description` | Finding detail |
| `findings[].recommendation` | `findings[finding_id].recommendation` | Finding fix |
| Remediation `items[].action` | `remediation[item_id].action` | Remediation action |
| Remediation `items[].value_framing` | `remediation[item_id].value_framing` | Operational consequence |

Editorial-only fields (no audit counterpart):
- `report.executive_summary` -- stakeholder summary, shown at top of dashboard
- `report.title` -- client-facing report title
- `report.methodology_note` -- brief methodology explanation
- `clusters[key].value_framing` -- operational impact per cluster

Merge pseudocode:
```js
const merge = (auditValue, editorialValue) => editorialValue ?? auditValue;
```

---

## Data shapes (abbreviated)

### Audit JSON

```
{
  meta: {
    schema_version, system_name, audit_date, run_id, audit_id,
    timestamp, auditor, prompt_version, git_tag, target_system,
    figma_files, evidence_sources
  },
  summary: {
    overall_score,          // 0-100 number
    phase_readiness,        // "pass" | "conditional_pass" | "not_ready"
    phase_readiness_detail: {
      blocking_dimensions,  // dimension key[]
      warning_dimensions,   // dimension key[]
      conditions_for_advancement  // string[]
    },
    top_blockers,           // finding ID[], max 3
    blocker_count,          // integer
    dimension_scores,       // { dimension_key: 0-100 | null }
    cluster_scores,         // { cluster_key: 0-100 }
    dimensions_scored,      // integer
    dimensions_total,       // integer
    dimensions_null,        // integer
    component_count         // optional integer
  },
  clusters: {
    [cluster_key]: {
      cluster_name,         // "Token and Variable System"
      cluster_summary,      // one-sentence headline
      cluster_score,        // 0-100
      dimensions: {
        [dimension_key]: {
          score,            // 0-4 integer or null
          score_max,        // 4 (Tier 1) or 2 (Tier 2)
          severity,         // "blocker" | "warning" | "note" | "pass" | null
          tier,             // 1 or 2 (Cluster 4 only)
          narrative,        // prose summary
          finding_ids,      // finding ID[]
          evidence_sources,
          sub_check_scores  // optional { sub_check_id: 0-4 }
        }
      }
    }
  },
  findings: [
    {
      id,                   // "CDC-001" pattern
      dimension,            // dimension key
      severity,             // "blocker" | "warning" | "note" | "pass"
      severity_rank,        // 0-3 (0=pass, 3=blocker)
      summary,              // one-line for list views
      description,          // full detail for drill-down
      evidence,             // string or string[]
      recommendation,       // actionable fix
      contract_ref,         // optional { type, level, path, field }
      affected_components,  // optional string[]
      auto_fixable          // optional boolean
    }
  ],
  data_gaps: [
    { id, description, reason, affected_components, impact }
  ],
  config_ref: { path, version },
  version_delta: { ... }    // optional, for run comparison
}
```

### Remediation JSON

```
{
  meta: { audit_id, system_name, schema_version, generated_at },
  items: [
    {
      id,                       // "REM-001"
      action,                   // what to do
      affected_cluster,         // cluster key
      affected_dimensions,      // dimension key[]
      effort_estimate,          // "hours" | "days" | "weeks"
      ownership,                // "design" | "engineering" | "both"
      priority_tier,            // 1 | 2 | 3
      remediation_type,         // "relocate" | "refactor" | "rebuild"
      value_framing,            // optional, operational consequence
      impact_categories,        // optional ["correction_cycles", ...]
      projected_score_improvement,  // optional string
      finding_ids               // optional finding ID[]
    }
  ]
}
```

Priority tiers:
- 1 = necessary for agent readability (maps to "Quick Wins" in the reference design)
- 2 = high leverage, low effort (maps to "Foundational")
- 3 = important but high effort (maps to "Post-Migration")

Sort order: priority_tier asc, effort_estimate asc (hours < days < weeks),
severity_rank desc.

### Editorial JSON

```
{
  meta: { schema_version, audit_ref, last_edited_by, last_edited_at },
  report: { title, executive_summary, methodology_note },
  clusters: { [cluster_key]: { narrative, value_framing } },
  dimensions: { [dimension_key]: { narrative } },
  findings: { [finding_id]: { summary, description, recommendation } },
  remediation: { [item_id]: { action, value_framing } }
}
```

All sections except `meta` are optional.

### Dimension Reference

```
{
  version: "2.3",
  dimensions: {
    [dimension_key]: {
      name,               // "Token Implementation"
      cluster,            // "1_token_and_variable_system"
      description,        // what this dimension measures
      evidence_sources,   // ["Figma", "Code"]
      score_levels: {
        "0": "description...",
        "1": "description...",
        "2": "description...",
        "3": "description...",
        "4": "description..."
      }
    }
  }
}
```

Tier 2 dimensions (4.16-4.27) have keys "0", "1", "2" only.

---

## Identifier system

```
audit_id         links audit + remediation + editorial
                 e.g. "material-ui-v3.1-2026-04-08"

cluster_key      "1_token_and_variable_system"
                 used in: audit clusters, editorial clusters,
                 remediation affected_cluster, scoring-weights

dimension_key    "1.1_token_implementation"
                 used in: audit dimensions (nested in clusters),
                 audit summary.dimension_scores, editorial dimensions,
                 dimension-reference, scoring-weights

finding_id       "CDC-001"
                 used in: audit findings[].id, dimension finding_ids,
                 editorial findings

remediation_id   "REM-001"
                 used in: remediation items[].id, editorial remediation
```

---

## Cluster quick reference

| Key | Name | Weight |
|---|---|---|
| `0_prerequisites` | Prerequisites | 0.05 |
| `1_token_and_variable_system` | Token and Variable System | 0.25 |
| `2_component_quality` | Component Quality | 0.15 |
| `3_documentation_readiness` | Documentation Readiness | 0.25 |
| `4_design_quality_baseline` | Design Quality Baseline | 0.10 |
| `5_governance_and_ecosystem` | Governance and Ecosystem | 0.08 |
| `6_design_to_code_parity` | Design-to-Code Parity | 0.12 |

---

## Scoring system

- **Dimension scores:** 0-4 integers. Tier 2 (4.16-4.27): 0-2.
- **Severity from score:** 0-1 = blocker, 2 = warning, 3 = note, 4 = pass.
- **Cluster score:** average of scored dimensions (nulls excluded) x 25 → 0-100.
- **Overall score:** sum of (cluster_score x cluster_weight) → 0-100.
- **Phase readiness:** pass (>=75, 0 blockers), conditional_pass (>=50, 0 blockers), not_ready (any blocker OR <50).

All scores are pre-computed in the JSON. The front-end does not recalculate.

---

## Reference pages → views mapping

### 1. overview-dashboard.js → Dashboard

Current hardcoded state: 55.3% score, old cluster names, old blocker codes.

Wire to:
- `summary.overall_score` → headline score
- `summary.phase_readiness` → status badge
- `meta.system_name` → system title
- `meta.audit_date` → last audited date
- `summary.cluster_scores` → cluster score cards (7 clusters)
- `summary.top_blockers` → resolve to `findings[]` for blocker cards
- `editorial.report.executive_summary` → top narrative (if present)
- Remediation summary sidebar: count `remediation.items` by `priority_tier`

Cluster names come from `clusters[key].cluster_name`. Do not hardcode.
Cluster descriptions come from `clusters[key].cluster_summary` merged with
`editorial.clusters[key].narrative`.

Severity colour mapping:
- blocker → red (`#FF6B6B`)
- warning → amber (`#F5A623`)
- note/pass → green (`#4ADE80`)

### 2. benchmark-dashboard.js → Benchmark Comparison

Current hardcoded state: MUI 63.6 vs Carbon 62.5, hardcoded bar widths.

Wire to: load both audit JSONs simultaneously. For each cluster, compute the
delta between the two `cluster_scores`. The diverging bar chart shows which
system leads per cluster.

- `summary.overall_score` per system → headline comparison
- `summary.cluster_scores` per system → per-cluster bars
- `summary.blocker_count` per system → blocker badge
- Shared blockers: findings with the same dimension + severity=blocker in both
- System profiles: clusters where one system leads by >2 points

### 3. impact-dashboard.js → Impact Calculator

This page is mostly standalone (slider-driven cost model). The connection to
audit data is:
- `summary.overall_score` → current score display
- `summary.blocker_count` → total blockers count
- `findings[]` where severity=blocker → top blocker references per cost category
- `editorial.clusters[key].value_framing` → cost category descriptions

The cost multipliers and formulas can stay as local constants for now.

### 4. remediation-roadmap.js → Remediation Roadmap

Current hardcoded state: three tiers with manual items.

Wire to:
- `remediation.items[]` grouped by `priority_tier` (1/2/3)
- Filter buttons: map to `ownership` field ("design" / "engineering" / "both")
- Per item: `action` (merged with editorial), `affected_cluster`, `effort_estimate`,
  `projected_score_improvement`
- `value_framing` (merged with editorial) → impact description

Priority tier labels:
- Tier 1 → "Quick Wins" (green dot)
- Tier 2 → "Foundational" (amber dot)
- Tier 3 → "Post-Migration" (dimmed)

### 5. Dimension drill-down (NEW -- not in reference pages)

Not in the prototypes but needed. When a user clicks a cluster card or dimension:
- Dimension score, severity, narrative (merged with editorial)
- Score rubric from `dimension-reference.json` → `score_levels`
- List of findings for this dimension (resolve `finding_ids`)
- Each finding: `summary` in list, `description` + `recommendation` on expand

### 6. Finding list (NEW -- not in reference pages)

Flat list of all findings, sortable by `severity_rank`, filterable by cluster
and severity. Uses the same card design as the blocker cards in overview.

---

## Design system (from reference pages)

The visual design is consistent across all four reference pages:

**Colours:**
- Background: `#0C0C0C` / `#0B0B0B` / `#111111` (slight variations, normalise to one)
- Card background: `#161616` / `#1A1A1A`
- Card hover: `#1A1A1A` / `#222222`
- Text primary: `#F5E9C8` (cream)
- Text secondary: `rgba(245, 233, 200, 0.5-0.7)`
- Text inverse: `#0C0C0C` (on cream backgrounds)
- Border subtle: `rgba(245, 233, 200, 0.1)`
- Red (blocker): `#FF6B6B`
- Amber (warning): `#F5A623`
- Green (pass): `#4ADE80`
- Blue (parity): `#4C8BFF` (impact page only)

**Typography:**
- Font: Inter (Google Fonts)
- Label caps: 11px, uppercase, letter-spacing 0.08em, opacity 0.6, weight 500
- Headline score: 96px / 64px / 48px depending on context
- Body: 13-16px, leading relaxed
- Nav: 13px uppercase, tracking wider

**Layout:**
- Max width: 1400px, centered
- Grid: 12-column with 24px gap (Tailwind `gap-6`)
- Cards: border-radius 32px (large) / 24px (small)
- Padding: 40px (large cards) / 24px (small cards)
- All pages use Tailwind CSS utility classes

**Components to extract as shared:**
- `Header` / `Nav` -- appears in all pages, has active state
- `LabelCaps` -- reusable label style
- `ProgressBar` -- score visualisation
- `DimensionCard` -- cluster/dimension score card
- `BlockerCard` -- finding card with severity dot
- `FilterButton` -- active/inactive toggle
- `SeverityBadge` -- blocker/warning/note/pass pill
- `ImpactBadge` -- score improvement indicator

---

## System selector

The front-end needs a way to switch between audit runs (MUI vs Carbon).
Options:
- Dropdown/toggle in the header
- The benchmark page always shows both; other pages show the selected system
- A simple manifest array listing available audits:

```json
[
  { "system_name": "Material UI", "version": "v3.1", "path": "audit/material-ui/v3.1/" },
  { "system_name": "Carbon", "version": "v3.1", "path": "audit/carbon/v3.1/" }
]
```

This can be a static JSON file or hardcoded initially.

---

## Tech stack

- React (the reference pages already use React + React Router)
- Tailwind CSS (the reference pages use Tailwind utility classes extensively)
- Static JSON loading (fetch or import -- no API server)
- Vite or Next.js for build (either works; Vite is simpler for a static site)

---

## What the front-end does NOT do

- No score calculation -- all scores are pre-computed
- No Markdown rendering -- the `.md` editorial files are for human editing only
- No API calls to Figma, GitHub, or any external service
- No write operations
- No editorial compilation -- that is handled by scripts in the audit repo

---

## Build order

Build the complete working app in this session. Visual polish happens later in
Cursor (free tier is fine for CSS/Tailwind tweaks).

1. **Project setup** -- React + Vite + Tailwind. Configure Vite to resolve the
   audit data from `../ds-ai-audit/` during development.
2. **Data layer** -- loader functions that fetch the three JSONs + dimension
   reference, apply editorial merge, and expose typed data to components.
3. **Shared components** -- extract Header, Nav, cards, badges from reference pages.
4. **Overview dashboard** -- port `overview-dashboard.js`, wire to real data.
5. **Remediation roadmap** -- port `remediation-roadmap.js`, wire to remediation JSON.
6. **Benchmark comparison** -- port `benchmark-dashboard.js`, load both systems.
7. **Impact calculator** -- port `impact-dashboard.js`, connect top blockers.
8. **Dimension drill-down** -- new view, extend from cluster cards.
9. **Finding list** -- new view, flat list with filters.

Get everything rendering with real data first. Don't spend time on pixel-perfect
alignment -- that is the Cursor phase.
