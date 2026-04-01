# CLAUDE.md
# ds-ai-poc — AI-Readiness Audit for Design Systems

This file is the persistent context for Claude Code sessions in this repository.
Read it at the start of every session. Do not override the architectural rules below
without explicit instruction and a documented reason.

---

## What this repo is

A proof-of-concept audit tool that reads an existing design system — Figma library
files plus a code repository — and produces a structured AI-readiness report. The
audit runs as a script. It does not write to Figma. It does not automate remediation.
It flags problems and makes recommendations.

The repo also contains a POC design system (system/) built from scratch to validate
the audit methodology. It has no component code. All component definitions live in
Figma. The repo exists to make those definitions legible to AI agents.

The tool is client-agnostic. To apply it to a specific client or project, duplicate
the repo and create a client-specific prompt variant and scoring config. The core
script, schema, and dimensions are not modified for client-specific needs.

The target state is an auditing agent that runs continuously, detects drift, and
answers questions about system health. The current phase is script-based auditing.

Getting there is a sequence, not a rebuild.

---

## How to navigate this repo

1. Read `manifest.json` first to understand what this system contains.
2. Read `system/index/components.index.json` to find what components exist.
3. Read the relevant contract in `system/contracts/` for the component you are
   working with.
4. Read `system/tokens/` files to resolve token values.
5. Never invent structure that is not in the index.

---

## What you are allowed to do

- Read from Figma via the official Figma MCP
- Read from Figma via the REST API using FIGMA_ACCESS_TOKEN from the environment
- Write contract JSON files to `system/contracts/`
- Write Markdown documentation to `system/docs/`
- Write token data to `system/tokens/`
- Write component entries to `system/index/`
- Write audit outputs to `audit/`

## What you are not allowed to do

- Invent component props that are not in the Figma file
- Hardcode hex values -- always resolve to token names
- Create files or folders not in the repo structure below
- Assume a component exists if it is not in the index
- Skip the index -- always check what exists before creating
- Write to Figma canvas (no use of `use_figma` or write-to-canvas tools)
- Automate remediation -- findings are flagged and recommended, not fixed
- Build a Figma plugin -- deferred to Release 3.0 decision point
- Generate components from contracts -- Phase 2 capability, not current arc
- Use MCP for component or style enumeration -- use REST API instead

---

## Figma REST API

The REST API requires a personal access token with all three scopes:

- `file_content:read` -- file structure, page list, node inspection
- `file_variables:read` -- variable collections and alias chains
- `library_content:read` -- published components and styles

The token is available as `FIGMA_ACCESS_TOKEN` in the environment. Export it in
the terminal before launching Claude Code:

```bash
export FIGMA_ACCESS_TOKEN=your_token_here
claude
```

MCP handles its own authentication. MCP is useful for spot-checking specific nodes
by ID. For comprehensive file enumeration, always use the REST API.

**Required REST API calls for a complete audit:**
- `GET /v1/files/{key}?depth=1` -- full page and file structure
- `GET /v1/files/{key}/components` -- published component inventory
- `GET /v1/files/{key}/styles` -- published style inventory
- `GET /v1/files/{key}/variables/local` -- variable collections and alias chains

REST API responses are filtered and cached as JSON in `scripts/output/` before
scoring. The scoring engine reads cached files, not live API responses. See
the token reduction section in `prompts/audit-prompt.md` for filtering rules
and cache file conventions.

Note: community Figma files must be published to a team library before
`/components` and `/styles` return data. Unpublished files return empty arrays.

---

## Architectural rules — never break these

- **Markdown is always derived from JSON.** Never write the markdown report
  independently. The JSON is the source of truth. The markdown is a rendering of it.

- **Schema changes are additive only within a major version.** v2.1 is a breaking
  change from v1.4 (clusters replace flat dimensions). Within v2.x, changes are
  additive only. New fields are optional. Existing fields are not removed or
  renamed.

- **Two-phase audit.** Phase 1 (discovery) runs REST API calls and produces a
  summary: component count, variable collection count, style count, page list.
  Phase 2 (targeted scoring) scores only dimensions with evidence. Skip entire
  clusters when discovery shows no relevant data. For single-component files,
  skip statistical dimensions.

- **REST API is the primary data source.** MCP cannot enumerate components or styles
  comprehensively. Use REST API for all four calls in Phase 1. Use MCP for
  spot-checks on sampled components in Phase 2 (Dimension 2.1, Cluster 4).

- **Prompt files are committed and tagged.** Every audit run is paired with the
  git tag (release) that produced it. Prompt files live in `prompts/` and are
  never deleted. The release tag is recorded in the audit JSON output.

- **Findings reference contract fields.** Every finding in the audit JSON must
  reference which contract field it relates to: token definition, component contract,
  documentation contract, or governance rule. Required for future codegen pipeline
  compatibility.

- **Scoring weights are configurable, not hardcoded.** Dimension weights live in
  `config/scoring-weights.json`. Not embedded in the script or the prompt.
  Adjusted per client context without touching core logic.

- **Client variants are separate files.** Client-specific prompt variants and scoring
  configs are separate files. The base prompt and base config are not modified for
  client needs.

- **Token alias chains must remain unbroken.** Component tokens alias semantic
  tokens. Semantic tokens alias primitives. Never alias primitives directly from
  component tokens.

---

## Definition of intent

**Intent** is the functional purpose of a component: what it does, when to use it,
when not to use it, and what behaviour to expect. It is distinct from visual
description (what it looks like) and implementation detail (how it is built).

A description captures intent if a designer or agent reading it could decide whether
this component is the right one for a given situation, without opening Figma.

**Examples of intent:**
"Use this component for primary actions. Do not use it for destructive actions --
use the Danger variant instead. Disabled state is applied when the form is
incomplete, not when the action is unavailable."

**Examples that are not intent:**
- "Blue button with 8px border radius" -- visual description
- `import { Button } from '@mui/material'` -- implementation detail
- A code snippet showing usage syntax -- implementation detail

Dimensions 3.1 and 3.3 both score intent but measure different things.
Dimension 3.1 scores coverage: does intent exist at all in the description field?
Dimension 3.3 scores quality: does the documentation follow the six-level
hierarchy, is it well-structured, appropriately concise, and free of redundancy
-- useful to an agent, not just a developer?

The absence of intent is not the same as the absence of a description. A description
can exist and still carry no intent. The MUI audit found that 96.2% of existing
descriptions were code snippets -- descriptions were present but intent was absent.

---

## Documentation hierarchy

Dimension 3.3 (intent quality) scores documentation against a six-level hierarchy.
Each level adds depth. A component or pattern does not need all six levels to score
well, but the levels it does cover must be substantive.

1. **Purpose** -- what it does, its scope, what is explicitly out of scope.
2. **Structure** -- anatomy: the named parts and how they relate.
3. **Intended behaviour** -- states, transitions, and what triggers them.
4. **Main use cases** -- the two or three scenarios this component is designed for.
5. **Error handling** -- what happens when things go wrong, and how the component
   communicates failure.
6. **Edge cases** -- boundary conditions, empty states, overflow, truncation,
   internationalisation considerations.

**Weight shift by type:**
- Components emphasise levels 1 and 2 (purpose and structure). A well-documented
  component always has these.
- Patterns emphasise levels 4 and 5 (use cases and error handling). A pattern
  without use cases is not useful.

---

## Documentation meta-principles

These principles apply to all documentation produced or scored by the audit:

- **Thorough.** Cover what matters. Do not leave gaps that force a reader to guess.
- **Succinct.** Say it once, clearly. Remove words that do not add information.
- **Plain language.** Write for a reader who knows the domain but not this system.
  Avoid jargon, abbreviations, and insider shorthand.
- **No duplication.** Do not repeat information that exists elsewhere. Document
  once and link.
- **Link to external frameworks.** When a pattern follows an established standard
  (WCAG, Material Design, platform HIG), reference it rather than restating it.

---

## Token architecture

Three layers, all defined as Figma Variables:

- `system/tokens/primitives.json` -- raw values, named by scale position
- `system/tokens/semantic.json` -- aliases to primitives, named by role
- `system/tokens/component.json` -- aliases to semantic tokens, named by
  component property and state

The token system is Figma-primary in the current arc. From Release 2.0 onward,
code-side token definitions are cross-referenced against Figma variables to detect
drift.

---

## Audit dimensions (restructured v2.0)

These are the dimensions the audit scores against, organised into seven clusters.
Each dimension documents its evidence sources (Figma, Code, or Both). When a code
repository is not available, code-only dimensions score null (not assessed) and
cluster scores are calculated from available dimensions only.

Prompt files reference these dimensions. They do not redefine them. If a dimension
changes, update it here first, then update the prompt.

**Cluster 0: Prerequisites**
Scored first. A failing score (below 2) flags all downstream clusters as
conditionally valid.

- 0.1 Platform Architecture Clarity -- coherent, documented platform strategy
  legible to an AI agent. Evidence: Figma + Code

**Cluster 1: Token and Variable System**
The foundation layer. If this cluster fails, nothing above it can be trusted.

- 1.1 Token implementation (Figma Variables vs hardcoded values). Evidence: Figma
- 1.2 Alias chain integrity (three-layer chain intact and resolvable). Evidence: Figma
- 1.3 Token architecture depth (primitive, semantic, component layers). Evidence: Figma + Code
- 1.4 Primitive naming (machine-parseable, full words, intent-based). Evidence: Figma + Code
- 1.5 Token format and machine-readability (code-side format). Evidence: Code
- 1.6 Token documentation (descriptions and metadata on definitions). Evidence: Figma + Code

**Cluster 2: Component Quality**
The structural layer built on top of tokens.

- 2.1 Component-to-token binding (properties bound to tokens). Evidence: Figma (REST + MCP)
- 2.2 Component API composability (typed, constrained, composable APIs). Evidence: Code only
- 2.3 Variant completeness (all meaningful states as named variants). Evidence: Figma + Code
- 2.4 Escape hatch usage (className/style override frequency). Evidence: Code only

**Cluster 3: Documentation and Intent**
Whether the system can explain itself to an agent.

- 3.1 Component description coverage (percentage with descriptions and intent). Evidence: Figma + Code
- 3.2 Documentation structure and machine-readability. Evidence: Code
- 3.3 Intent quality -- scored against a six-level documentation hierarchy
  (see Documentation hierarchy below). Components emphasise purpose and
  structure; patterns emphasise use cases and error handling. Evidence: Figma + Code
- 3.4 Usage guidance formalisation (rules vs qualitative guidance). Evidence: Code
- 3.5 Documentation frame metadata (structural data from Figma pages). Evidence: Figma

Patterns are a first-class audit target alongside components. The audit checks
whether documented interaction patterns exist (loading, empty state, error
recovery, validation, navigation, dismissal) and whether they follow the same
documentation hierarchy as components.

**Cluster 4: Design Quality Baseline**
Universal quality criteria scored without client context. Two tiers.

Tier 1 (scored 0-4):
- 4.1 Interaction targets (touch/click minimums per platform)
- 4.2 Contrast ratios (WCAG AA derivable from token chain)
- 4.3 Type scale consistency (mathematical relationship between steps)
- 4.4 Type completeness (size, line height, letter spacing, weight, case per role)
- 4.5 Spacing scale regularity (base unit, consistent progression)
- 4.6 Grid and layout system (columns, gutters, margins, breakpoints)
- 4.7 Motion duration ranges (100-500ms, entries slower than exits)
- 4.8 Motion easing (standard easing defined, linear flagged)
- 4.9 Focus state presence (every interactive component)
- 4.10 Error state coverage (error, success, disabled on inputs)
- 4.11 Loading state coverage (async actions have loading patterns)
- 4.12 Empty state coverage (data-dependent views have empty states)
- 4.13 Colour system structure (defined steps, role-based semantic naming)
- 4.14 Icon sizing consistency (defined scale aligned with spacing)
- 4.15 Elevation/shadow system (defined scale, not arbitrary)

Tier 2 (scored 0/1/2: not addressed / partially / systematically):
- 4.16 Visibility of system status
- 4.17 Match between system and real world
- 4.18 User control and freedom
- 4.19 Consistency and standards
- 4.20 Error prevention
- 4.21 Recognition rather than recall
- 4.22 Flexibility and efficiency
- 4.23 Aesthetic and minimalist design
- 4.24 Error recovery
- 4.25 Help and documentation
- 4.26 Visual hierarchy
- 4.27 Visual rhythm and proportion

Evidence for Cluster 4: Figma + Code (tokens, variants, documentation, APIs)

**Cluster 5: Governance and Ecosystem**
The system's ability to maintain itself over time.

- 5.1 Naming convention consistency. Evidence: Figma + Code
- 5.2 Versioning and changelog discipline. Evidence: Code
- 5.3 Contribution standards. Evidence: Code
- 5.4 Deprecation patterns. Evidence: Figma + Code
- 5.5 Test coverage (visual regression, unit, accessibility). Evidence: Code only
- 5.6 Adoption visibility (dependency tracking, version consumption). Evidence: Code only
- 5.7 Code consistency and pattern predictability. Evidence: Code only

**Cluster 6: Design-to-Code Parity**
Cross-platform coherence. Requires both evidence sources. When code repo is absent,
the entire cluster scores null (not assessed).

- 6.1 Token value parity (Figma Variable values vs code token values)
- 6.2 Token naming parity (Figma Variable names vs code token names)
- 6.3 Component naming parity (Figma component names vs code component names)
- 6.4 Variant and state coverage parity (Figma variants vs code states)
- 6.5 Behaviour parity (coded behaviours vs Figma specifications, both directions)
- 6.6 Documentation of parity gaps (known gaps tracked and documented)

Evidence for Cluster 6: Both required.

Full dimension definitions with scoring criteria are in
`docs/audit-dimensions-v2.0.md` and in
`decisions/005-release-2.0-research-scan.md`.

---

## Repo structure

```
ds-ai-poc/
├── system/                          # POC design system
│   ├── tokens/                      # Three-layer token architecture
│   │   ├── primitives.json
│   │   ├── semantic.json
│   │   └── component.json
│   ├── contracts/                   # Component contracts (AI-readable specs)
│   │   └── button.contract.json
│   ├── index/                       # Component index
│   │   └── components.index.json
│   └── docs/                        # Component documentation
│       └── button.md
├── audit/                           # Audit outputs
│   ├── schema/                      # Audit output schema definitions
│   │   └── audit-schema.json        # Additive changes only after v1.3
│   ├── toimi/                       # Toimi library audits (initial POC)
│   │   ├── v1.0/
│   │   └── v1.2/
│   ├── material-ui/                 # Material UI audits (current test vehicle)
│   │   └── v1.3/
│   ├── baseline/                    # Baseline run for diff comparison
│   ├── latest/                      # Most recent run
│   └── diffs/                       # Diff reports between runs
├── prompts/                         # Audit prompt files
│   └── audit-prompt.md
├── config/                          # Configurable parameters
│   └── scoring-weights.json         # Dimension weights -- adjusted per client
├── decisions/                       # Architecture decision records (numbered)
│   ├── 001-audit-methodology-v1.0.md
│   ├── 002-governance-dimension.md
│   └── 003-material-ui-test-vehicle.md
├── data/                            # Static data for front-end and agent consumption
│   └── dimension-reference.json     # All dimensions with score levels, keyed by ID
├── docs/                            # Reserved for GitHub Pages output (v1.3+)
│   └── exploration-plan.md          # Full release plan
├── CLAUDE.md                        # This file
├── CONTEXT.md                       # Strategic context and learnings
├── CHANGELOG.md                     # What changed and when
├── manifest.json                    # System manifest -- read this first
└── README.md
```

---

## Data directory

The `data/` directory contains static reference data for front-end and agent
consumption. These files are derived from CLAUDE.md, the audit dimensions
document, and the scoring weights config. They are not hand-authored.

- `data/dimension-reference.json` -- All 56 dimensions keyed by dimension ID.
  Each entry has: name, cluster, description, evidence_sources, and score_levels
  (keys "0" through "4" for standard dimensions, "0" through "2" for Tier 2).
  The front-end reads this file to render dimension names, descriptions, and
  scoring rubrics without parsing CLAUDE.md.

## Front-end information architecture

The front-end consumes the audit JSON (v2.2 schema) and the dimension reference
directly. No markdown rendering. JSON is the source of truth.

**Primary views:**

1. **Dashboard** -- Overall score, phase readiness, cluster scores as a summary.
   Uses `summary.overall_score`, `summary.phase_readiness`, `summary.cluster_scores`.
2. **Cluster overview** -- One card per cluster with cluster_summary and score.
   Uses `clusters[key].cluster_name`, `cluster_summary`, `cluster_score`.
3. **Dimension drill-down** -- Score, severity, narrative, finding list per dimension.
   Uses `clusters[key].dimensions[key]` joined with `dimension-reference.json` for
   score level descriptions.
4. **Finding list** -- All findings sortable by severity_rank, filterable by
   dimension and cluster. Uses `findings[]` with `summary` for list view and
   `description` for detail view.
5. **Remediation roadmap** -- Three-column layout (quick wins, foundational blockers,
   post-migration). Uses `remediation`.
6. **Comparison** -- Score delta between two audit runs. Uses `version_delta`.

**Benchmark manifest approach:** When multiple audit outputs exist (different
systems or different versions of the same system), a manifest file lists
available audits with their metadata (system_name, audit_date, run_id, path).
The front-end reads the manifest to populate a selector. The manifest is a
simple JSON array, not embedded in the schema.

**New meta fields for front-end:**

- `system_name` -- Display title for the audited system.
- `audit_date` -- ISO 8601 date for grouping and display.
- `run_id` -- UUID for deduplication and cross-referencing.

**Finding summary field:** Each finding has a `summary` (one-line overview for
list views) distinct from `description` (full detail for drill-down views).

---

## Naming conventions

- Core files (schema, prompt, scoring weights) use unversioned names. Git tags
  mark each release. The audit JSON output records the git tag that produced it.
- Client-specific variants append the client name: `audit-prompt-[clientname].md`,
  `scoring-weights-[clientname].json`.
- Audit output files include the test vehicle and are organised by release tag
  in subdirectories: `audit/[vehicle]/[tag]/`.
- Do not use abbreviations in token or component names. Full words and slashes only.

---

## Client adaptation

To apply this tool to a specific client or project:

1. Duplicate the repo.
2. Create a client-specific prompt variant: `prompts/audit-prompt-[clientname].md`
3. Create a client-specific scoring config: `config/scoring-weights-[clientname].json`
4. Inspect the client file structure before running anything. Document variable
   collection naming, documentation frame conventions, component description coverage,
   and code token format in `decisions/`.
5. Adapt the documentation frame reader for the client's specific frame structure.
6. Configure platform-specific thresholds in the client scoring config:
   Cluster 4 dimensions 4.1 (interaction targets), 4.2 (contrast ratios),
   4.9 (focus states), and Cluster 0 dimension 0.1 (platform architecture
   clarity).
7. Do not modify the base prompt, base schema, or base scoring config.

---

## Current state

Update this section at the end of each release session.

| Field | Value |
|---|---|
| Current release | 2.2-schema (in progress) |
| Active test vehicle | Material UI -- Figma community file (published to team) + GitHub repo |
| Last prompt version | v2.1 (prompts/audit-prompt.md) |
| Schema version | v2.2 (audit/schema/audit-schema.json) |
| Scoring weights | v2.1 (config/scoring-weights.json) -- cluster-based, 7 clusters sum to 1.00 |
| Last audit run | Material UI v2.1 -- 55.3/100 not ready, 10 blockers (zero drift from v2.0) |
| Dimensions | 7 clusters / 56 dimensions (38 scored, 9 code-only null in MUI audit) |
| Dimension reference | data/dimension-reference.json -- all 56 dimensions with score levels |
| Client status | Access pending -- adaptation sprint is Release 3.0 |
| Release 2.1 | Complete -- decision record 006, validation run confirmed zero drift |
| Release 2.2 | Schema pre-handoff for front-end build. New meta fields, finding summaries, dimension reference extracted. |

---

## Release sequence (summary)

Full plan in `docs/exploration-plan.md`.

- **1.3** -- Complete. Stable audit script. Ten dimensions. REST API primary source.
  Material UI 44.3/100 not ready. Four blockers identified.
- **1.4** -- Scoring thresholds, phase readiness recommendation, eleven dimensions
  active.
- **2.0** -- Code-side token diff (Figma vs repository). Documentation frame reader.
  Dimension restructure to 7 clusters / 44 dimensions.
- **2.1** -- Schema iteration (cluster-based, remediation section, severity_rank).
  Two-phase audit. Token reduction. Documentation hierarchy for Dimension 3.3.
  Validation run confirmed zero drift.
- **2.2-schema** -- Front-end pre-handoff. Schema v2.2: system_name, audit_date,
  run_id in meta. Finding summary field. Dimension reference extracted to
  data/dimension-reference.json. MUI v2.1 audit backfilled.
- **2.2** -- Front-end build (Konsta) + knowledge layer. React app consuming
  audit JSON. Cluster overview, dimension drill-down, finding list, comparison.
- **2.3** -- Studio or client library stress test.
- **2.4** -- Methodology refinement.
- **2.5** -- Repeatability and baseline diff mode.
- **3.0+** -- Client application sprint. Agent wrapper decision point.

---

## What this repo is not doing yet

- Writing to Figma
- Automating remediation
- Running as a continuous agent
- Building a Figma plugin
- Generating components from contracts
