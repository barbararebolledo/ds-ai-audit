# Decision 004: Release 2.0 Research Scan and Dimension Restructure

**Status:** Proposed  
**Date:** 2026-03-30  
**Release:** 2.0 (planning)

---

## Context

Release 1.4 is committed and pushed. The audit methodology has eleven dimensions, all scoring the Figma file in isolation. Release 2.0 introduces two workstreams: code-side token diff (Figma Variables vs GitHub repo token definitions) and a documentation frame reader. Before building either, a research scan was required.

Separately, the dimension set needs restructuring. The original architecture treated Figma and code as separate evidence sources to be connected later. "Later" is now. A colleague's independent audit prompt (ten dimensions covering generative readiness and craft readiness) exposed five code-layer gaps and a missing prerequisite gate (Platform Architecture Clarity). The restructure integrates both Figma and code evidence into a unified dimension set with a cluster-based information architecture.

---

## Research scan findings

### 1. Existing open-source tools for token diff

No off-the-shelf tool does what workstream 1 needs. The closest options:

**Style Dictionary** is a build/transform pipeline, not a diff tool. It can normalise token formats but does not read from Figma. Using it as a parser adds significant plumbing for a problem that is simpler to solve directly.

**Tokens Studio** syncs tokens between Figma (via plugin) and Git repos. Tightly coupled to its own plugin workflow and format. Not useful as a library for this purpose.

**Firebender /sync-figma-token skill** syncs tokens bidirectionally with drift detection. Write-oriented (it writes to Figma). The drift detection concept is architecturally relevant but the skill is designed for sync, not audit. Source code could not be fully reviewed in this session. Worth inspecting in Claude Code but unlikely to provide reusable logic.

**Decision:** Build the diff logic from scratch. The comparison is straightforward once both sides are normalised.

### 2. MUI GitHub repo token format

MUI does not use a standalone token file format (no Style Dictionary JSON, no W3C DTCG files). Tokens are defined programmatically in JavaScript/TypeScript via `createTheme()` in `packages/mui-material/src/styles/`. The theme is constructed at runtime: `createTheme()` takes a `ThemeOptions` object with `palette`, `typography`, `shape`, `spacing`, `shadows`, `zIndex`, and `breakpoints`. Palette colours auto-generate `light`, `dark`, and `contrastText` variants from just the `main` value.

**Decision:** Write a Node script that installs `@mui/material`, calls `createTheme()` with default options, and serialises the resulting theme object to JSON. This produces the full default token set in a diffable format.

**General principle for CLAUDE.md:** The audit tool should not assume a specific token format. The instruction is: inspect the repository, identify how tokens are defined, and if the format is not directly comparable to the Figma Variable export, write a one-off extraction script that produces normalised JSON. The MUI script is the first instance of this pattern, not a special case.

### 3. MUI Figma documentation frames

The MUI Figma community file contains documentation frames structured as auto layout frames with components inside. Each component page (e.g. Card) has a top-level frame with child Grid frames containing component variants organised by sub-component (CardHeader, CardActions, CardContent, CardMedia, Card Elements Bundled, composed Card). A `*Library / Component Heading` instance sits at the top.

The structure is a visual variant catalogue, not intent documentation. The reader can extract structural metadata (component anatomy, variant inventory, composition patterns) but will not find usage guidance or functional intent. This is consistent with the v1.3 finding that 96.2% of descriptions were code snippets.

**Decision:** The documentation frame reader for MUI extracts structural metadata. Intent scoring remains low. The reader schema must be defined from a full MCP inspection of the file before building.

### 4. Figma-only fallback

When no code repository is available, the audit runs the same dimension set. Code-side evidence fields score as "not assessed" (null in JSON) rather than zero. The audit remains valid for the Figma layer. The schema must handle partial evidence gracefully.

### 5. Code token extraction as a general instruction

Added to CLAUDE.md: when inspecting a repository, identify the token format. If it is not directly comparable to the Figma Variable export, write a one-off extraction script that produces normalised JSON. Supported formats to detect: Style Dictionary JSON, W3C DTCG, CSS custom properties, Tokens Studio JSON, programmatic theme construction (React, Swift, Kotlin), or other. The extraction script is committed to the repo alongside the audit output so the run is reproducible.

---

## Dimension restructure

### Problem

The original eleven dimensions all score the Figma file. Five code-layer gaps were identified: Component API Composability, Design-to-Code Parity, Code Consistency and Pattern Predictability, Test Coverage/Adoption Visibility (sub-checks of Governance), and Accessibility as Enforced Constraints. Additionally, Platform Architecture Clarity is missing as a prerequisite gate, and craft quality has no universal baseline.

### Approach

Restructure the dimension set to cover both Figma and code as one system. Introduce a cluster-based information architecture for readability. Add universal craft baseline criteria (Tier 1: measurable, Tier 2: evidence of consideration). Implement incrementally: define all dimensions now, activate code-side evidence as implementation reaches each cluster.

### Cluster architecture

The restructured dimensions are organised into seven clusters (0 through 6). Each cluster groups related dimensions. The front-end report shows clusters as the primary view with drill-down into individual dimensions.

**Cluster 0: Prerequisites**
Scored first. A failing score conditions the validity of all downstream clusters.

- 0.1 Platform Architecture Clarity

**Cluster 1: Token and Variable System**
The foundation layer. If this cluster fails, nothing above it can be trusted.

- 1.1 Token implementation (Figma Variables vs hardcoded values)
- 1.2 Alias chain integrity (three-layer chain intact and resolvable)
- 1.3 Token architecture depth (primitive, semantic, component layers present and separated)
- 1.4 Primitive naming (machine-parseable, full words, intent-based)
- 1.5 Token format and machine-readability (code-side: JSON, DTCG, CSS, programmatic)
- 1.6 Token documentation (descriptions and metadata present on token definitions)

Evidence: Figma (REST API for Variables) + Code (repo token files or extraction script)

**Cluster 2: Component Quality**
The structural layer built on top of tokens.

- 2.1 Component-to-token binding (properties bound to tokens, not hardcoded)
- 2.2 Component API composability (typed props, constrained enums, composition patterns) [code-only]
- 2.3 Variant completeness (all meaningful states as named variants, not style overrides)
- 2.4 Escape hatch usage (className/style override frequency in codebase) [code-only]

Evidence: Figma (MCP spot-checks) + Code (component source files)

**Cluster 3: Documentation and Intent**
Whether the system can explain itself to an agent.

- 3.1 Component description coverage (percentage with descriptions, percentage with intent)
- 3.2 Documentation structure and machine-readability (structured vs prose, frontmatter, schemas)
- 3.3 Intent quality (functional purpose vs visual description vs implementation detail)
- 3.4 Usage guidance formalisation (do/don't rules vs qualitative guidance, decision trees)
- 3.5 Documentation frame metadata (structural data extractable from Figma documentation pages)

Evidence: Figma (description fields, documentation frames) + Code (Storybook, MDX, README, inline docs)

**Cluster 4: Craft Baseline**
Universal quality criteria scored without client context.

- 4.1 Interaction targets (touch/click target minimums per platform)
- 4.2 Contrast ratios (WCAG AA derivable from token alias chain)
- 4.3 Type scale consistency (mathematical relationship between steps)
- 4.4 Type completeness (size, line height, letter spacing, weight, case per semantic role)
- 4.5 Spacing scale regularity (base unit, consistent progression)
- 4.6 Grid and layout system (columns, gutters, margins, breakpoints, safe areas)
- 4.7 Motion duration ranges (100-500ms, entries slower than exits)
- 4.8 Motion easing (standard easing defined, linear flagged)
- 4.9 Focus state presence (every interactive component)
- 4.10 Error state coverage (error, success, disabled on input components)
- 4.11 Loading state coverage (async actions have loading patterns)
- 4.12 Empty state coverage (data-dependent views have empty states)
- 4.13 Colour system structure (defined steps per hue, role-based semantic naming)
- 4.14 Icon sizing consistency (defined scale aligned with spacing system)
- 4.15 Elevation/shadow system (defined scale, not arbitrary per-component)
- 4.16 Visibility of system status (loading, progress, feedback patterns exist)
- 4.17 Match between system and real world (user-facing naming, content guidelines)
- 4.18 User control and freedom (undo, cancel, dismiss, navigation patterns)
- 4.19 Consistency and standards (interaction patterns consistent across similar components)
- 4.20 Error prevention (validation rules, input constraints in API)
- 4.21 Recognition rather than recall (enumerated values, visual examples, decision trees)
- 4.22 Flexibility and efficiency (density variants, shortcuts, progressive disclosure)
- 4.23 Aesthetic and minimalist design (hierarchy system, density rules, truncation)
- 4.24 Error recovery (error message structure, recovery action patterns)
- 4.25 Help and documentation (descriptions, searchable patterns, X vs Y guidance)
- 4.26 Visual hierarchy (elevation rules, grouping patterns, size/weight relationships)
- 4.27 Visual rhythm and proportion (stack spacing, internal proportions, spatial model)

Dimensions 4.1-4.15 are Tier 1 (measurable). Dimensions 4.16-4.27 are Tier 2 (scored as evidence of consideration: not addressed / partially addressed / systematically addressed).

Evidence: Figma (tokens, variants, documentation) + Code (component APIs, motion values, enforcement)

**Cluster 5: Governance and Ecosystem**
The system's ability to maintain itself over time.

- 5.1 Naming convention consistency (across tokens, components, styles, files)
- 5.2 Versioning and changelog discipline (semantic versioning, structured changelog)
- 5.3 Contribution standards (explicit, machine-readable guidelines)
- 5.4 Deprecation patterns (marked, documented, migration paths)
- 5.5 Test coverage (visual regression, unit, accessibility) [code-only]
- 5.6 Adoption visibility (dependency tracking, version consumption) [code-only]
- 5.7 Code consistency and pattern predictability (file structure, hook patterns, linting) [code-only]

Evidence: Figma (naming, governance traces) + Code (versioning, tests, linting, adoption tooling)

**Cluster 6: Design-to-Code Parity**
Cross-platform coherence. Requires both evidence sources simultaneously.

- 6.1 Token value parity (Figma Variable values vs code token values)
- 6.2 Token naming parity (Figma Variable names vs code token names)
- 6.3 Component naming parity (Figma component names vs code component names)
- 6.4 Variant and state coverage parity (Figma variants vs code states)
- 6.5 Behaviour parity (coded interactive behaviours vs Figma specifications, both directions)
- 6.6 Documentation of parity gaps (known gaps tracked and documented)

Evidence: Both required. Cannot be scored from Figma alone. When code repo is absent, scores as "not assessed".

---

## Scoring

### Scale

0-4 integers (unchanged from v1.3). Meanings tied to agent output quality:

- 0: Absent. No evidence. Agent cannot operate on this dimension.
- 1: Minimal. Evidence exists but is insufficient. Agent output requires heavy human correction.
- 2: Partial. Some structure present. Agent output requires moderate correction.
- 3: Functional. Adequate for agent operation. Minor corrections needed.
- 4: Complete. Fully supports agent operation. No corrections expected.

Tier 2 craft dimensions (4.16-4.27) use a simplified scale:

- 0: Not addressed
- 1: Partially addressed
- 2: Systematically addressed

### Cluster scores

Each cluster produces a weighted average of its dimensions. Weights are configurable in `config/scoring-weights.json` (client variants use `scoring-weights-[clientname].json`). Cluster 0 is a gate: if it scores below 2, all downstream clusters carry a conditional validity flag.

### Partial evidence

When code repo is absent, code-only dimensions score null (not zero). Cluster scores are calculated from available dimensions only. The report states which evidence sources were available and which dimensions were not assessed.

---

## Release 2.0 build scope

Path A: define all dimensions now, implement only the two originally scoped workstreams.

**Workstream 1: Code-side token diff**
- Node script to extract MUI default theme to normalised JSON
- Diff logic comparing Figma Variables (REST API) against extracted theme JSON
- Output feeds Cluster 6 dimensions (6.1, 6.2) and enriches Cluster 1 dimensions (1.5, 1.6)
- General instruction added to CLAUDE.md for format-agnostic code token extraction

**Workstream 2: Documentation frame reader**
- MCP inspection of MUI Figma file to define the reader schema
- Reader module that extracts structural metadata from documentation frames
- Output feeds Cluster 3 dimension (3.5)
- Reader schema is adapted per test vehicle (documented in client adaptation instructions)

**Deferred to Release 2.1+:**
- Cluster 2 code-only dimensions (2.2, 2.4)
- Cluster 5 code-only dimensions (5.5, 5.6, 5.7)
- Cluster 6 dimensions beyond token parity (6.3, 6.4, 6.5, 6.6)
- Craft baseline config file (`config/craft-baseline_vX.X.json`)
- Report information architecture (overview / diagnostic / remediation split)
- Tone of voice and writing rules for report output

---

## Open questions

- Craft baseline config file format: flat JSON list of criteria with thresholds, or structured by tier and cluster?
- Cluster 6 behaviour parity (6.5): what evidence-gathering method? Static analysis of code event handlers vs Figma variant names, or deeper inspection?
- Platform Architecture Clarity (0.1): how to score for systems that are explicitly single-platform? Score as N/A or auto-pass?
- Tier 2 criteria: the simplified 0/1/2 scale is less granular than the 0-4 scale used elsewhere. Acceptable, or should Tier 2 use the full scale?
