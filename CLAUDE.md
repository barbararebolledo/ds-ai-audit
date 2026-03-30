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

Note: community Figma files must be published to a team library before
`/components` and `/styles` return data. Unpublished files return empty arrays.

---

## Architectural rules — never break these

- **Markdown is always derived from JSON.** Never write the markdown report
  independently. The JSON is the source of truth. The markdown is a rendering of it.

- **Schema changes are additive only after v1.3.** No breaking changes to the audit
  schema once v1.3 is committed. New fields are optional. Existing fields are not
  removed or renamed.

- **REST API is the primary data source.** MCP cannot enumerate components or styles
  comprehensively. Use REST API for all four calls before scoring. Use MCP for
  spot-checks on sampled components to verify node-level bindings (Dimension 5).

- **Prompt files are versioned and committed.** Every audit run is paired with the
  prompt version that produced it. Prompt files live in `prompts/` and are never
  deleted. The prompt version is recorded in the audit JSON output.

- **Findings reference contract fields.** Every finding in the audit JSON must
  reference which contract field it relates to: token definition, component contract,
  documentation contract, or governance rule. Required for future codegen pipeline
  compatibility.

- **Scoring weights are configurable, not hardcoded.** Dimension weights live in
  `config/scoring-weights_vX.X.json`. Not embedded in the script or the prompt.
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

Dimensions 6 and 10 both score intent coverage but measure different things.
Dimension 6 scores coverage: does intent exist at all in the description field?
Dimension 10 scores quality: is the documentation well-structured, appropriately
concise, and free of redundancy -- useful to an agent, not just a developer?

The absence of intent is not the same as the absence of a description. A description
can exist and still carry no intent. The MUI audit found that 96.2% of existing
descriptions were code snippets -- descriptions were present but intent was absent.

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
- 3.3 Intent quality (functional purpose vs visual description). Evidence: Figma + Code
- 3.4 Usage guidance formalisation (rules vs qualitative guidance). Evidence: Code
- 3.5 Documentation frame metadata (structural data from Figma pages). Evidence: Figma

**Cluster 4: Craft Baseline**
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
│   │   └── audit-schema_vX.X.json   # Versioned -- additive changes only after v1.3
│   ├── toimi/                       # Toimi library audits (initial POC)
│   │   ├── v1.0/
│   │   └── v1.2/
│   ├── material-ui/                 # Material UI audits (current test vehicle)
│   │   └── v1.3/
│   ├── baseline/                    # Baseline run for diff comparison
│   ├── latest/                      # Most recent run
│   └── diffs/                       # Diff reports between runs
├── prompts/                         # Versioned audit prompt files
│   └── audit-prompt_vX.X.md
├── config/                          # Configurable parameters
│   └── scoring-weights_vX.X.json    # Dimension weights -- adjusted per client
├── decisions/                       # Architecture decision records (numbered)
│   ├── 001-audit-methodology-v1.0.md
│   ├── 002-governance-dimension.md
│   └── 003-material-ui-test-vehicle.md
├── docs/                            # Reserved for GitHub Pages output (v1.3+)
│   └── exploration-plan.md          # Full release plan
├── CLAUDE.md                        # This file
├── CONTEXT.md                       # Strategic context and learnings
├── CHANGELOG.md                     # What changed and when
├── manifest.json                    # System manifest -- read this first
└── README.md
```

---

## Naming conventions

- Versioned files use the pattern `filename_vX.X` before the extension.
- Client-specific variants append the client name: `filename_vX.X-clientname`.
- Audit output files include the test vehicle and version:
  `[vehicle]_findings_v[X.X].json`, `[vehicle]_report_v[X.X].md`.
- Do not use abbreviations in token or component names. Full words and slashes only.

---

## Client adaptation

To apply this tool to a specific client or project:

1. Duplicate the repo.
2. Create a client-specific prompt variant: `prompts/audit-prompt_vX.X-[clientname].md`
3. Create a client-specific scoring config: `config/scoring-weights_vX.X-[clientname].json`
4. Inspect the client file structure before running anything. Document variable
   collection naming, documentation frame conventions, component description coverage,
   and code token format in `decisions/`.
5. Adapt the documentation frame reader for the client's specific frame structure.
6. Configure platform-specific thresholds for Dimension 8 and Dimension 11 in the
   client scoring config.
7. Do not modify the base prompt, base schema, or base scoring config.

---

## Current state

Update this section at the end of each release session.

| Field | Value |
|---|---|
| Current release | 2.0 (in progress) |
| Active test vehicle | Material UI -- Figma community file (published to team) + GitHub repo |
| Last prompt version | v1.3 |
| Schema version | v1.3 |
| Last audit run | Material UI v1.3 -- 44.3/100 not ready |
| Dimensions | 7 clusters / 44 dimensions (restructured v2.0) |
| Nordea status | Access pending -- adaptation sprint is Release 3.0 |
| Release 2.0 planning | Complete -- decision record 005, dimensions restructured |

---

## Release sequence (summary)

Full plan in `docs/exploration-plan.md`.

- **1.3** -- Complete. Stable audit script. Ten dimensions. REST API primary source.
  Material UI 44.3/100 not ready. Four blockers identified.
- **1.4** -- Scoring thresholds, phase readiness recommendation, eleven dimensions
  active.
- **2.0** -- Code-side token diff (Figma vs repository). Documentation frame reader.
- **2.1** -- Studio library application. First real-world stress test.
- **2.2** -- Repeatability and baseline diff mode.
- **3.0+** -- Client application sprint. Agent wrapper decision point.

---

## What this repo is not doing yet

- Writing to Figma
- Automating remediation
- Running as a continuous agent
- Building a Figma plugin
- Generating components from contracts
