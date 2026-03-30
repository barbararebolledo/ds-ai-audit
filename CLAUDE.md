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

## Audit dimensions

These are the eleven dimensions the audit scores against. They are the stable
definition of what this system measures. Prompt files reference these dimensions --
they do not redefine them. If a dimension changes, update it here first, then update
the prompt.

**1. Token implementation**
Are design tokens implemented as Figma Variables? Are hardcoded values present where
tokens should be used?

**2. Alias chain integrity**
Are semantic tokens correctly aliased to primitive tokens? Are alias chains intact,
unbroken, and resolvable? Requires REST API -- MCP returns resolved values only.

**3. Token architecture depth**
Does the system implement all three layers: primitive, semantic, and component-level
tokens? Are the layers correctly separated or collapsed?

**4. Primitive naming**
Do primitive tokens follow a defined, machine-parseable naming convention using full
words and slashes? Is the primitive scale defined rather than an exhaustive numeric
range?

**5. Component-to-token binding**
Are component properties (fill, stroke, spacing, typography) bound to tokens rather
than hardcoded values? The REST API confirms what components exist. MCP spot-checks
on a sample of components are required to verify actual node-level bindings. Both
sources must be used -- REST API alone is insufficient for a complete score on this
dimension.

**6. Component description coverage**
Do components have descriptions that capture functional intent? Scores coverage:
what percentage of components have a description, and of those, what percentage
carry functional intent rather than visual description or implementation detail.
See intent definition above. Distinct from Dimension 10 -- this dimension asks
whether intent exists, not whether it is well-structured.

**7. Naming convention consistency**
Are naming conventions consistent across tokens, components, and styles? Do names use
full words and slashes for machine parseability? Are there deviations that would break
automated parsing?

**8. Platform-readiness gap**
Are there gaps between the Figma representation and what the target platform requires
for implementation? The specific checks are configured per client context in the
scoring config -- ARIA roles and keyboard navigation for web, accessibility labels
and touch targets for mobile, and so on. The core question is platform-agnostic:
does the Figma file carry the metadata the target platform needs?

**9. Governance**
Is there evidence of governance rules being applied: naming enforcement, token usage
constraints, role definitions? Are the rules machine-readable or only implicit?

**10. Documentation quality and intent coverage**
Does component documentation capture intent rather than visual description? Scores
quality: is it present, appropriately concise, free of redundancy, and useful to an
agent rather than just a developer? Reads from the component description field first;
falls back to documentation frames in the file if the description is absent or below
threshold. Distinct from Dimension 6 -- this dimension asks whether the documentation
is well-structured and complete, not just whether intent exists. See intent definition
above. The documentation frame reader is adapted per client or test vehicle.

**11. Accessibility intent coverage**
Does the component documentation and structure communicate accessibility requirements?
Scores structural accessibility signals in the Figma file: whether focus states are
defined as variants, whether touch target sizes meet minimum guidelines (44x44px
mobile, 24x24px web), whether colour contrast is derivable from the token alias chain,
whether interactive components define keyboard navigation behaviour, and whether
component descriptions mention accessibility considerations.
This dimension scores what is auditable from the Figma file -- structural signals,
not runtime compliance. Actual rendered contrast ratios and screen reader output
require a plugin or manual inspection and are deferred to a later phase.
Platform-specific thresholds (WCAG AA vs AAA, mobile vs web target sizes) are
configured in the client scoring config.

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
| Current release | 1.4 (next) |
| Active test vehicle | Material UI -- Figma community file (published to team) + GitHub repo |
| Last prompt version | v1.3 |
| Schema version | v1.3 |
| Last audit run | Material UI v1.3 -- 44.3/100 not ready |
| Dimensions | 11 (updated post Release 1.3) |
| Nordea status | Access pending -- adaptation sprint is Release 3.0 |

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
