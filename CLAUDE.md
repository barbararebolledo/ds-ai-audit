# CLAUDE.md
# ds-ai-audit — AI-Readiness Audit for Design Systems

This file is the persistent context for Claude Code sessions in this repository.
Read it at the start of every session. Do not override the architectural rules below
without explicit instruction and a documented reason.

---

## What this repo is

The audit measures design system maturity through an AI consumption lens. AI is the diagnostic. It reveals whether intent and context are separated, whether tokens are enforced, whether documentation reaches the consumer, whether contribution scales beyond human throughput. _AI-ready_ is the visible result; maturity is the underlying property the audit scores.

Operationally, the tool is a proof-of-concept audit script that reads an existing design system (Figma library files plus a code repository) and produces a structured maturity report. The audit runs as a script. It does not write to Figma. It does not automate remediation. It flags problems and makes recommendations.

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
### The content + mechanism + delivery pattern

The audit measures three layers, not one. Content is whether the artefact is right: well-named tokens, structured documentation, well-typed APIs, contribution standards. Mechanism is the infrastructure that delivers that content to the AI consumer in a form the consumer can use: CI enforcement of token usage, queryable documentation interfaces, always-on context, contribution rules differentiated for AI contributors. Delivery is whether the consumer actually receives and uses the content as intended: agents reference tokens rather than inventing values, agents query documentation at generation time rather than falling back to training data, agent contributions land in the right tier of the contribution hierarchy.

Content quality is necessary but not sufficient. Tokens defined but not enforced at build produce tokens-as-decoration: an LLM writes `padding: 12px` because 12px is plausible, the build accepts it, the rule does no work. Documentation written but not queryable at generation time produces fallback to training data: agents output system-agnostic code that ignores the system. Contribution rules written for human reviewers but not differentiated for agents produce review bottleneck or quiet erosion as agents multiply contributors faster than review can absorb.

The mechanism layer's central architectural move is partitioning. Same source, different renderings, gated by consumption mode. The audit's mechanism dimensions score whether the system has achieved this partitioning at the relevant layer.

This pattern shapes how cluster narratives read. Each cluster reports content quality and mechanism quality as paired observations, with delivery (agent behaviour) as the consequence the pair predicts. Where mechanism is absent, content quality alone does not predict reliable AI consumption.

----
### Field references and critical positioning

Four voices anchor the methodology choices.

**Nathan Curtis (EightShapes).** Established the structured documentation content model the six-level hierarchy extends. Curtis's 2025 _Components as Data_ position (express components in YAML or JSON because AI favours structured data) supports Dimension 3.2 (documentation indexing). Curtis has publicly walked back earlier federated-friendly governance assumptions, which informs Cluster 5's scoring of contribution standards. The audit holds the structured-data direction as the target state.

**Murphy Trueman.** _Your design system might be AI-ready, your organisation probably isn't._ The audit cannot directly measure team capacity, review bandwidth, or contribution governance. It reads their shadow in artefact patterns and names the implications. Trueman's argument is why the audit positions itself as the structured entry to a two-phase engagement, with the organisational workshop as Phase 2.

**Eric Bailey.** Compliance-theatre critique: frameworks can optimise for _appearing_ AI-ready by ticking visible boxes (machine-readable tokens, MCP server, structured docs) without addressing the harder substrate (organisational capacity, designer judgement, accessibility-in-the-trenches, brand expression). The audit guards against this by scoring mechanism and delivery alongside content, and by reading substrate gaps in the artefact patterns the audit can see.

**Brad Frost.** MCP is on-demand. If the prompt asks for a card, MCP returns card metadata but ignores spacing, typography, and colour, and the LLM fills the gaps from training. Frost's progressive-disclosure model (always-on AGENTS.md plus on-demand component MCP) is the emerging answer. The audit's content + mechanism + delivery pattern surfaces this as a measurable concern: foundation rules need to be present in working context every turn, not fetched on request.

----

## How to navigate this repo

1. Read `manifest.json` first to understand what this system contains.
2. Read `CONTEXT.md` for the strategic rationale behind the methodology choices.
3. Read `system/index/components.index.json` to find what components exist.
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

- **Three-file architecture.** Each audit run produces three files joined by
  `audit_id`: audit JSON (immutable scores, findings, structural facts),
  remediation JSON (living remediation plan, editable between runs), editorial
  JSON (human-written prose overrides). The front-end merges all three at render
  time, preferring editorial content when present. Schemas:
  `audit/schema/audit-schema.json` (v3.0),
  `audit/schema/remediation-schema.json` (v1.0),
  `audit/schema/editorial-schema.json` (v1.1).

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

For a plain-language explanation of what each dimension measures, written for a non-specialist reader, see the `plain_description` field in `data/dimension-reference.json`. The cluster lists below carry the technical definitions and evidence sources. The JSON file carries the plain-language counterparts.

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

**Cluster 3: Documentation Readiness**
Whether the system can explain itself to an agent.

*Discoverability* -- can the agent find the documentation? Absent functional intent forces the agent into expensive learning loops with no accuracy guarantee.
- 3.1 Functional intent coverage (whether functional intent is present in component descriptions, not merely whether a description exists). Evidence: Figma + Code
- 3.5 In-file documentation structure (whether Figma files contain structured documentation readable directly from the file, without external lookup). Evidence: Figma

*Readability* -- does the documentation structure reduce hallucination and assumption? Less structure means more inference. More inference means more tokens and more errors per task.
- 3.2 Documentation indexing (whether documentation is indexed via schemas, frontmatter, or queryable structure an agent can look up rather than read linearly). Evidence: Code
- 3.3 Intent quality -- scored against a six-level documentation hierarchy
  (see Documentation hierarchy below). Components emphasise purpose and
  structure; patterns emphasise use cases and error handling. Evidence: Figma + Code
- 3.4 Usage guidance structure (whether usage constraints are organised with labelled sections and explicit rules rather than narrative prose). Evidence: Code

Patterns are a first-class audit target alongside components. The audit checks
whether documented interaction patterns exist (loading, empty state, error
recovery, validation, navigation, dismissal) and whether they follow the same
documentation hierarchy as components.

When Phase 1 detects documentation frames (frames named with "documentation"
in the title), Dimensions 3.1, 3.3, and 3.5 score against documentation frame
content as well as component description fields. Component descriptions remain
a discoverability signal: an empty description on a component with a populated
documentation frame produces a finding on discoverability (remediation type:
relocate) but does not penalise intent coverage or quality.

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
ds-ai-audit/
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
│   │   ├── audit-schema.json        # v3.0 -- immutable scores and findings
│   │   ├── remediation-schema.json  # v1.0 -- living remediation plan
│   │   └── editorial-schema.json    # v1.1 -- human prose overrides
│   ├── material-ui/                 # Material UI audits (current test vehicle)
│   │   └── v3.2/                    # Latest: audit + remediation + editorial JSON
│   └── carbon/                      # Carbon Design System audits (benchmark)
│       └── v3.2/                    # Latest: audit + remediation + editorial JSON
├── prompts/                         # Audit prompt files
│   └── audit-prompt.md
├── config/                          # Configurable parameters
│   └── scoring-weights.json         # Dimension weights -- adjusted per client
├── decisions/                       # Architecture decision records (numbered)
│   ├── 001-audit-methodology-v1.0.md
│   ├── 002-governance-dimension.md
│   ├── 003-material-ui-test-vehicle.md
│   ├── 004-dimensions-v1.4.md
│   ├── 005-release-2.0-research-scan.md
│   ├── 006-release-2.1-schema-iteration.md
│   ├── 007-release-2.2-scope-and-impact.md
│   ├── 008-mui-fresh-rerun-handoff.md
│   ├── 009-remediation-framework.md
│   ├── 010-cluster-3-taxonomy-and-naming.md
│   ├── 011-client-facing-content-and-display.md
│   ├── 012-documentation-frame-evidence-gathering.md
│   └── 013-editorial-schema-v1.1.md
├── data/                            # Static data for front-end and agent consumption
│   ├── dimension-reference.json     # All dimensions with score levels, keyed by ID
│   └── benchmarks/
│       └── benchmarks-manifest.json # Available audit runs for benchmark comparison
├── scripts/                         # API scripts and editorial workflow
│   ├── output/                      # Cached Figma API responses (committed)
│   ├── render-editorial.mjs         # Generate editable Markdown from editorial JSON
│   ├── compile-editorial.mjs        # Compile edited Markdown back to editorial JSON
│   ├── extract-code-tokens.mjs      # Format-detecting code-token extractor (mui, carbon, w3c, style-dictionary, raw-json) — mode-aware
│   ├── diff-tokens.mjs              # Per-mode token parity comparator (Figma vs code) — feeds 6.1 and 6.2
│   └── *.mjs                        # REST API call scripts (Figma fetch, normalise, doc frames)
├── docs/                            # Documentation
│   ├── release-plan.md              # Full release plan
│   ├── audit-dimensions-v2.0.md     # Full dimension definitions
│   └── onboarding/                  # Onboarding files for new sessions
├── CLAUDE.md                        # This file
├── CONTEXT.md                       # Strategic context and reasoning
├── CHANGELOG.md                     # What changed and when
├── manifest.json                    # System manifest -- read this first
├── package.json                     # Node deps for extract-code-tokens.mjs MUI strategy (@mui/material)
└── node_modules/                    # Required by extract-code-tokens.mjs MUI strategy only
```

---

## Data directory

The `data/` directory contains static reference data for front-end and agent
consumption. These files are derived from CLAUDE.md, the audit dimensions
document, and the scoring weights config. They are not hand-authored.

- `data/dimension-reference.json` -- All 56 dimensions keyed by dimension ID. Each entry has: name, cluster, description (technical), plain_description (a single-sentence plain-language explanation of what the dimension measures, written for a non-specialist reader), evidence_sources, and score_levels (keys "0" through "4" for standard dimensions, "0" through "2" for Tier 2). The front-end reads this file to render dimension names, descriptions, and scoring rubrics without parsing CLAUDE.md.

## Front-end information architecture

The front-end consumes the audit JSON (v3.0 schema), remediation JSON (v1.0),
and the dimension reference directly. No markdown rendering. JSON is the source
of truth.

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
5. **Remediation roadmap** -- Priority-sorted list from remediation JSON. Grouped by
   `priority_tier`, tagged by `remediation_type` (relocate/refactor/rebuild), sorted
   by `effort_estimate` and `severity_rank`. Uses `[system]-remediation.json`.
6. **Benchmark** -- Score comparison between two audit systems or runs. Uses
   `version_delta` and side-by-side system data.
7. **Impact** (update pending) -- Impact calculator projecting annual cost of
   unresolved audit gaps. Currently renders three cost categories (correction cycles,
   theme rework, parity defects) with three client input sliders (team size,
   components per sprint, hourly rate). Needs update: fourth category (token
   efficiency/sustainability) missing, calculation model simplified from
   impact-model.md formulas, cluster key uses old name, "High Confidence Estimate"
   label needs replacing. Full update planned for next front-end session. Uses
   editorial JSON value framings and audit summary scores.

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

**Editorial JSON merge.** The front-end loads both the data JSON and the editorial
JSON (when present). For any field that exists in both, the editorial version takes
precedence. This applies to: cluster narratives (`clusters[key].cluster_summary`),
dimension narratives (`dimensions[key].narrative`), finding prose (`summary`,
`description`, `recommendation`), and remediation prose (`action`, `value_framing`).
When the editorial JSON is absent or a specific override is missing, the data JSON
content is used as-is. The editorial JSON is stored alongside the data JSON in audit
output directories (e.g. `audit/material-ui/v3.2/mui-editorial-v3.2.json`), not in `/data`.

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
| Current release | 3.3 (complete) |
| Active test vehicle | Material UI + Carbon Design System -- both with Figma + GitHub + docs site evidence |
| Last prompt version | v3.3 (prompts/audit-prompt.md) -- `mui-default-theme.json` retired from cached evidence list |
| Schema version | v3.1 (audit/schema/audit-schema.json -- Finding gains optional `mode` field) + remediation v1.0 (audit/schema/remediation-schema.json) + editorial v1.1 (audit/schema/editorial-schema.json) |
| Editorial JSON | v1.1 schema. Adds scope_statement and organisational_implications (required). Pre-populated by audit engine. Editable Markdown template generated by scripts/render-editorial.mjs. Compiled back to JSON by scripts/compile-editorial.mjs. |
| Scoring weights | v2.1 (config/scoring-weights.json) -- cluster-based, 7 clusters sum to 1.00 |
| Last full audit | MUI v3.2 (63.6/100, not_ready, 4 blockers), Carbon v3.2 (62.5/100, not_ready, 6 blockers). Full audit not re-run at v3.3. |
| Last parity refresh | MUI v3.3 (6.1 = 98%, 6.2 = 100% -- light + dark), Carbon v3.3 (6.1 = 95%, 6.2 = 100% -- white, g10, g90, g100). audit/{system}/v3.3/token-parity-findings.json. |
| Token extractor | scripts/extract-code-tokens.mjs -- format detector (W3C, Style Dictionary, raw JSON) + named strategies (mui, carbon). Multi-mode output: `tokens.{path}.values.{mode}`. Per-system manifest at `<repo-root>/<system>-tokens-manifest.json` for generic formats. |
| Token comparator | scripts/diff-tokens.mjs -- per-mode diff with mode alignment (override via manifest or strategy, else lowercased name match). Cross-mode finding dedup (identical findings collapse to `mode: "*"`). |
| Benchmark audits | MUI v3.2 (63.6/100), Carbon v3.2 (62.5/100) |
| Dimensions | 7 clusters / 56 dimensions (56/56 scored on Carbon, 56/56 on MUI) |
| Dimension reference | data/dimension-reference.json -- all 56 dimensions with score levels; 6.1 / 6.2 descriptions clarify per-mode + overall scoring |
| Client status | Access pending -- adaptation sprint is Release 4.0 |
| Release 3.1 | Complete -- benchmark re-runs with v3.1 prompt, ADR 010 naming, editorial workflow (render + compile scripts), read-only Markdown report retired. |
| Release 3.3 | Complete -- format-detecting token extractor (replaces hard-coded mui/carbon dispatch). Multi-mode parity (MUI light/dark, Carbon white/g10/g90/g100). Schema bumped to v3.1 (Finding.mode). Legacy MUI fallback in diff-tokens.mjs removed. Standalone extract-mui-theme.mjs deleted. |

---

## Release sequence (summary)

Full plan in `docs/release-plan.md`.

- **1.3** -- Complete. Stable audit script. Ten dimensions. REST API primary source.
  Material UI 44.3/100 not ready. Four blockers identified.
- **1.4** -- Scoring thresholds, phase readiness recommendation, eleven dimensions
  active.
- **2.0** -- Code-side token diff (Figma vs repository). Documentation frame reader.
  Dimension restructure to 7 clusters / 56 dimensions.
- **2.1** -- Schema iteration (cluster-based, remediation section, severity_rank).
  Two-phase audit. Token reduction. Documentation hierarchy for Dimension 3.3.
  Validation run confirmed zero drift.
- **2.2** -- Complete. Front-end pre-handoff. Schema v2.2: system_name, audit_date,
  run_id in meta. Finding summary field. Dimension reference extracted.
  Editorial JSON schema. Front-end build + knowledge layer.
- **3.0** -- Complete. Three-file output architecture. Schema v3.0. Remediation
  framework (priority_tier, remediation_type, value_framing). Tier 2 narrative
  evidence standard. Benchmark runs: MUI 63.6/100 (4 blockers), Carbon 62.5/100
  (6 blockers). Co-location principle applied to 3.1 and 3.5; extension to 3.4
  deferred to Thinking Track.
- **3.1** -- Complete. Benchmark re-runs with v3.1 prompt. ADR 010 naming applied
  (Cluster 3 renamed to Documentation Readiness, four dimensions renamed).
  Editorial JSON pre-populated by audit engine. Editorial editing workflow:
  render-editorial.mjs generates editable Markdown, compile-editorial.mjs
  compiles edits back to JSON. Read-only Markdown report retired.
- **3.3** -- Complete. Token-extractor architecture reworked: format detector
  (W3C, Style Dictionary, raw JSON) plus strategy router replaces the
  hard-coded mui/carbon dispatch. Multi-mode parity end-to-end: extractor
  emits `tokens.{path}.values.{mode}`, comparator runs per (codeMode,
  figmaMode) pair with mode alignment via manifest or named strategy.
  Audit schema bumped to v3.1 -- Finding gains optional `mode`. Carbon
  source paths updated for the TypeScript migration. Legacy MUI fallback
  in diff-tokens.mjs removed; standalone extract-mui-theme.mjs deleted.
  Parity refresh runs: MUI 6.1=98% / 6.2=100% across light+dark,
  Carbon 6.1=95% / 6.2=100% across white+g10+g90+g100.
- **4.0** -- First client application (Nordea). Adaptation sprint.

---

## What this repo is not doing yet

- Writing to Figma
- Automating remediation
- Running as a continuous agent
- Building a Figma plugin
- Generating components from contracts
