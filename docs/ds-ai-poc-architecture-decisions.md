# DS AI POC — Architecture Decisions and Scaling Guide

**Project:** AI-Ready Design System POC  
**System:** Banking CTA Button  
**Repo:** github.com/barbararebolledo/ds-ai-poc  
**Version:** 0.1.1  
**British English. No em dashes.**

---

## What the POC proves

The loop works: Claude Code reads a Figma file via the official Figma MCP, extracts Variable definitions via the Figma REST API, generates a structured component contract, and produces human-readable documentation from that contract. No component code required. Figma is the source. The repo is the intelligence layer.

---

## What was built

### Figma file
- Three Variable collections: `primitives`, `semantic`, `component`
- Three-layer alias chain: component tokens alias semantic tokens, semantic tokens alias primitives, no shortcuts
- Button component with 12 variants (3 sizes x 4 states)
- All properties bound directly to component-level Variables
- No hardcoded values anywhere in the component
- Component description written

### Repo structure
```
ds-ai-poc/
├── CLAUDE.md                  -- governance file, entry point for Claude Code
├── manifest.json              -- entry point with real Figma file key and node ID
├── tokens/
│   ├── primitives.json        -- 49 raw values extracted from Figma Variables
│   ├── semantic.json          -- 34 aliases to primitives, role-based naming
│   └── component.json         -- 30 aliases to semantic tokens, button-scoped
├── index/
│   ├── components.index.json  -- machine-readable catalogue
│   └── components.index.md    -- human-readable catalogue
├── contracts/
│   └── button.contract.json   -- 143 lines, machine-readable component contract
└── docs/
    └── button.md              -- 153 lines, generated from contract
```

### Token architecture
Three layers, all defined as Figma Variables:

**Primitives** -- raw values, named by scale position
```
color/blue/600    #2563EB
color/neutral/0   #FFFFFF
spacing/4         16
radius/md         8
```

**Semantic** -- aliases to primitives, named by role
```
color/action/primary          → primitives/color/blue/600
color/text/on-action          → primitives/color/neutral/0
spacing/component-md          → primitives/spacing/4
```

**Component** -- aliases to semantic tokens, named by property and state
```
button/color/background       → semantic/color/action/primary
button/color/background-hover → semantic/color/action/primary-hover
button/spacing/padding-x-md   → semantic/spacing/component-md
```

---

## Naming conventions

Four decisions, each with a reason.

**Slash as separator**  
`color/blue/600` not `color-blue-600` or `colorBlue600`  
Figma uses the slash to create group hierarchy in the Variables panel. The official Figma MCP returns token paths using slashes. Claude Code can parse `color/blue/600` as category, subcategory, scale step without additional metadata.

**Numeric scales for primitives**  
`blue/600` not `blue/dark` or `blue/primary`  
Numbers are honest. They let you insert values above and below without renaming. They match the Tailwind scale convention. Dark compared to what? If you add a darker blue later, numbers accommodate it without breaking names.

**Role-based names for semantic tokens**  
`color/action/primary` not `color/blue/brand` or `color/button-background`  
Semantic tokens describe intent, not appearance or location. Claude Code can reason from "this is a primary action" to `color/action/primary` without being told explicitly.

**Property-and-state for component tokens**  
`button/color/background-hover` not `button/hover-background` or `button/bg-h`  
Structure is always: component / property-type / property-state. Predictable. If you know a component has a `background` token, you can infer it also has `background-hover`, `background-active`, `background-disabled`. Claude Code can do the same without reading every token individually.

**In code**  
Slashes do not carry over to code directly. Style Dictionary transforms them:
- CSS custom properties: slashes become hyphens (`--button-color-background`)
- JS/TS objects: slashes become nested keys (`tokens.button.color.background`)
- The Figma MCP reads Code Syntax fields if set, passing the exact code variable name to Claude Code

---

## Why Variables, not Styles

Three reasons Styles are insufficient for an AI-readable system:

**Alias chains**  
Styles store raw hex values. They cannot point to another Style. The entire token architecture -- primitive to semantic to component -- requires aliasing. Styles cannot do it.

**Modes**  
Dark mode, platform variants, theming all require the same token to resolve differently per context. Variables have modes built in. Styles have no equivalent.

**MCP readability**  
The Figma MCP reads Variable bindings via `get_variable_defs`. It does not traverse Style-to-Variable relationships. A component bound to Styles produces incomplete MCP output. A component bound directly to Variables produces a clean, fully traceable contract.

**Style-with-Variable-alias**  
A Style whose value is driven by a Variable is better than a raw Style -- it gets mode support. But the MCP still sees the Style name, not the Variable chain. It scores better than raw Styles in an audit but lower than direct Variable bindings.

---

## Variable collection structure

### Current POC (single platform, single theme)
```
primitives    -- 47 variables, raw values
semantic      -- 36 variables, aliases to primitives
component     -- 30 variables, aliases to semantic
```

### At scale: multi-theme
Add modes to the semantic and component collections:
```
semantic      modes: Light / Dark
component     modes: Light / Dark
```
Primitives do not change per theme. Only the alias targets in semantic change.

### At scale: multi-platform
Figma Variables support one mode dimension per collection. You cannot have a native matrix of platform x theme. Two approaches:

**Option 1: Explicit mode combinations (avoid at scale)**
```
Modes: Light-Mobile / Dark-Mobile / Light-Web / Dark-Web
```
Works but scales badly. Three platforms x two themes = six modes.

**Option 2: Two separate collections (recommended)**
```
semantic-theme      modes: Light / Dark    -- colour tokens
semantic-platform   modes: Mobile / Tablet / Web  -- spacing, typography, radius
```
Colour responds to theme. Spacing responds to platform. The separation reflects a real distinction in token behaviour. Components bind to both collections.

---

## Contract and documentation

**The contract** (`button.contract.json`) is for machines. Structured JSON. Claude Code reads it to reason about the component. It is the source of truth.

**The documentation** (`button.md`) is for humans. Generated from the contract. Never written independently. If the contract updates, the documentation is regenerated. One source, two outputs. No drift.

**The contract contains:**
- Identity: name, category, version, Figma file key, Figma node ID
- Intent: what this component is for in plain language
- Props: all variant properties with types, values, and defaults
- Tokens: complete map of which token controls which property, per variant where relevant
- When to use: explicit rules for correct usage
- When not to use: explicit rules for incorrect usage
- Constraints: what cannot be changed or overridden
- Alternatives: what to use if this component does not fit

**The index** (`components.index.json`) includes a `notYetDefined` array -- an explicit list of components that do not exist yet. This prevents Claude Code from inventing components by inferring from the alternatives section of a contract.

---

## Tooling used

| Tool | Purpose | Scope |
|---|---|---|
| Official Figma MCP | Read component structure and design context | Read only |
| Figma REST API | Extract raw Variable data with alias chains | Read (POC), Write (dark mode POC) |
| Claude Code | Generate contracts, documentation, index | Reads Figma, writes to repo |
| CLAUDE.md | Govern Claude Code behaviour per session | Persistent |
| GitHub | Version control | Persistent |

---

## Things that need rethinking at scale

**Token file structure**  
Three flat JSON files work for one component. At scale: one token file per component, organised into folders. The extraction script splits by component prefix automatically.
```
tokens/
  primitives.json
  semantic.json
  component/
    button.json
    input.json
    card.json
```

**Manual token extraction**  
Currently triggered manually via REST API with a personal access token. At scale: CI/CD pipeline triggered automatically when Variables change in Figma. Commits updated token files to the repo without human intervention.

**Single CLAUDE.md**  
One governance file works for one component. At scale: root CLAUDE.md for repo-level rules, component-level context files, pattern-level rules. A single file becomes too long and Claude Code misses instructions buried in the middle.

**Contract schema**  
Contracts are currently hand-generated from a prompt. At scale: a validated JSON schema (`contract.schema.json`) that every contract must conform to. Automated validation blocks commits if a contract has missing or malformed fields.

**No validation layer**  
At scale: a script that checks every contract against the schema, flags missing fields, and blocks the commit if validation fails.

**Index maintenance**  
The index was generated once and will drift when new components are added without updating it. At scale: the index is generated automatically from the contract files, not maintained manually.

**Personal access token**  
Acceptable for a two-person POC. At scale: a service account with a long-lived token managed in a secrets manager, or OAuth for organisation-level access. Tokens expire in 90 days.

---

## Things that break if you change them

These are architectural invariants. They apply at POC scale and at production scale equally.

**The alias chain**  
Component tokens must alias semantic tokens. Semantic tokens must alias primitives. No shortcuts. If a component token aliases a primitive directly, the semantic layer is bypassed, token auditing breaks, and the contract cannot correctly identify the role of that token.

**The slash naming convention**  
The Figma MCP returns variable paths using slashes. The token JSON uses dots inside alias references (`{color.blue.600}`). The contract and index are built on these conventions. Mixed separators -- hyphens, dots, camelCase -- prevent Claude Code from parsing the structure reliably.

**Variable bindings on components**  
Every property on every component must be bound to a component-level Variable. If components use Styles, hardcoded values, or Style-with-Variable-alias, the MCP output is incomplete and the contract generator produces inaccurate results.

**JSON-first principle**  
The Markdown is derived from the contract. The contract is the source of truth. Editing the Markdown directly instead of updating the contract creates drift between the two files. The generation direction -- contract first, documentation second -- must be enforced as a governance rule.

**CLAUDE.md as entry point**  
Claude Code reads CLAUDE.md first, every session. If the file is removed, renamed, or its navigation instructions become inaccurate, every Claude Code session starts from a broken state. CLAUDE.md must be kept accurate as the repo evolves.

---

## Things that could be different versus things that must be the same

### Must be the same at any scale
- Unbroken alias chain: component → semantic → primitive
- Slash naming convention in Figma Variables
- Direct Variable bindings on all component properties
- Contract as source of truth, documentation as derivative
- CLAUDE.md as the entry point for every Claude Code session
- No hardcoded values in semantic or component layers

### Could be different
- Token file organisation in the repo (flat vs nested by component)
- How token extraction is triggered (manual vs CI/CD)
- Number and structure of Variable collections (single semantic vs semantic-theme + semantic-platform)
- Contract generation method (prompted vs scripted)
- Index maintenance (manual vs auto-generated)
- Authentication method for Figma API access
- Which MCP plugin is used for write operations
- Whether documentation is rendered as a static site or stays as Markdown

---

## Version history

| Version | Description |
|---|---|
| v0.1.0 | Primitives: three-layer token system established. Naming conventions defined. Light mode only. |
| v0.1.1 | Component: Button 12 variants (3 sizes x 4 states), all properties token-bound. Full alias chain intact. Component description written. No hardcoded values. |

---

## Open threads

- Dark mode: add second mode to semantic and component Variable collections. Colleague POC using Figma REST API write endpoints.
- Audit POC: point Claude Code at an existing design system file, produce AI-readiness report as JSON and Markdown. JSON designed to feed a Figma plugin UI.
- Second component: validate contract schema holds beyond Button before scaling.
- Frontend for documentation: static site or Next.js app rendering Markdown files.
- Write-back to Figma: annotations, component descriptions.
- Cursor as alternative execution environment.
- Junior designer explainer document.
- Multi-platform token architecture: semantic-theme + semantic-platform collection split.
- Contract schema validation: JSON schema and automated validation script.
- CI/CD pipeline: automated token extraction on Variable change.
