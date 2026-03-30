# Audit dimensions (restructured v2.0)

These are the dimensions the audit scores against, organised into seven clusters.
Each dimension documents its evidence sources (Figma, Code, or Both). When a code
repository is not available, code-only dimensions score null (not assessed) and
cluster scores are calculated from available dimensions only.

Prompt files reference these dimensions. They do not redefine them. If a dimension
changes, update it here first, then update the prompt.

---

## Cluster 0: Prerequisites

Scored first. A failing score (below 2) flags all downstream clusters as
conditionally valid.

### 0.1 Platform Architecture Clarity

Does the system have a coherent, documented strategy for serving its target
platforms, and is that strategy legible to an AI agent?

Checks: single source of truth for tokens and components across platforms;
explicit documentation of where and why platforms differ; principled token
handling for platform-specific values (platform aliases or separate token sets,
not hardcoded overrides); component APIs that expose platform-aware behaviour
explicitly; platform convention documentation (iOS HIG, Material Design, web
accessibility standards) where applicable.

For systems that are explicitly single-platform, this dimension scores the
clarity of that declaration and whether the system is structured to remain
single-platform or could extend. Score as the evidence supports, not
automatically as a pass.

Evidence: Figma + Code

---

## Cluster 1: Token and Variable System

The foundation layer. If this cluster fails, nothing above it can be trusted.

### 1.1 Token implementation

Are design tokens implemented as Figma Variables? Are hardcoded values present
where tokens should be used?

Evidence: Figma (REST API)

### 1.2 Alias chain integrity

Are semantic tokens correctly aliased to primitive tokens? Are alias chains
intact, unbroken, and resolvable? Requires REST API for Figma (MCP returns
resolved values only).

Evidence: Figma (REST API)

### 1.3 Token architecture depth

Does the system implement all three layers: primitive, semantic, and
component-level tokens? Are the layers correctly separated or collapsed?

Evidence: Figma + Code

### 1.4 Primitive naming

Do primitive tokens follow a defined, machine-parseable naming convention using
full words and slashes? Is the primitive scale defined rather than an exhaustive
numeric range? Are tokens named for intent rather than value?

Evidence: Figma + Code

### 1.5 Token format and machine-readability

Are code-side tokens in a format an AI agent can parse without transformation
(JSON, DTCG-compliant, CSS custom properties)? If tokens are defined
programmatically (e.g. createTheme()), has an extraction script been run to
produce normalised JSON?

Evidence: Code

### 1.6 Token documentation

Are token descriptions or metadata present in both Figma and code? Can an agent
determine when to use a token from its name and description alone?

Evidence: Figma + Code

---

## Cluster 2: Component Quality

The structural layer built on top of tokens.

### 2.1 Component-to-token binding

Are component properties (fill, stroke, spacing, typography) bound to tokens
rather than hardcoded values? The REST API confirms what components exist. MCP
spot-checks on a sample of components verify actual node-level bindings. Both
sources must be used.

Evidence: Figma (REST API + MCP spot-checks)

### 2.2 Component API composability

Are component APIs explicit, typed, and constrained to valid system values?
Are components built to compose (compound components, slot patterns, children
APIs) or are they monolithic? Does the system prevent invalid combinations at
the API level, or rely on documentation and convention?

Evidence: Code only. Not assessable from Figma.

### 2.3 Variant completeness

Are all meaningful visual and interactive states represented as named variants
rather than style overrides? States include: default, hover, focus, active,
disabled, error, loading, selected, empty.

Evidence: Figma + Code

### 2.4 Escape hatch usage

Are className, style, or equivalent overrides available on components? How
frequently are they used in the consuming codebase? High escape hatch usage
signals the API is insufficient and AI-generated code will misuse them.

Evidence: Code only. Not assessable from Figma.

---

## Cluster 3: Documentation and Intent

Whether the system can explain itself to an agent.

### 3.1 Component description coverage

Do components have descriptions? Of those with descriptions, what percentage
carry functional intent (when to use, when not to use, expected behaviour)
rather than visual description or implementation detail?

See intent definition in the Intent section of this file.

Evidence: Figma (description fields) + Code (JSDoc, README, Storybook)

### 3.2 Documentation structure and machine-readability

Is component documentation structured (frontmatter, typed fields, consistent
schemas) or primarily narrative prose? Are usage examples written as runnable
code or as screenshots? Could an agent query the documentation and retrieve
a reliable answer to "when should I use ComponentX vs ComponentY"?

Evidence: Code (Storybook, MDX, docs site)

### 3.3 Intent quality

Is the documentation well-structured, appropriately concise, free of
redundancy, and useful to an agent rather than just a developer? Distinct
from 3.1 (which asks whether intent exists). This dimension asks whether it
is good.

Evidence: Figma + Code

### 3.4 Usage guidance formalisation

Are usage constraints expressed as explicit rules (enforceable) or as
qualitative guidance (aspirational)? Are do/don't patterns documented as
structured rules or as prose recommendations?

Evidence: Code (docs, Storybook)

### 3.5 Documentation frame metadata

Can structural metadata be extracted from Figma documentation pages? What
component anatomy, variant inventory, and composition patterns are readable
from the file structure? The reader schema is adapted per test vehicle.

Evidence: Figma (MCP inspection of documentation frames)

---

## Cluster 4: Craft Baseline

Universal quality criteria scored without client context. Two tiers.

### Tier 1: Measurable (scored 0-4)

#### 4.1 Interaction targets

Minimum touch/click target sizes per platform. Mobile: 44x44pt (iOS), 48x48dp
(Android). Web: 24x24px. Scored by checking component dimensions against
platform minimums.

Evidence: Figma + Code

#### 4.2 Contrast ratios

WCAG AA minimum: 4.5:1 normal text, 3:1 large text and UI components.
Derivable from the token alias chain when tokens resolve to colour values.
AAA (7:1 / 4.5:1) noted as bonus, not required for passing score.

Evidence: Figma (token chain resolution) + Code (token values)

#### 4.3 Type scale consistency

Is there a mathematical relationship between type scale steps (modular scale,
e.g. 1.25 ratio)? Scored by comparing intervals between defined type sizes.
Consistent ratio indicates intentional design; irregular intervals indicate
ad-hoc decisions.

Evidence: Figma + Code

#### 4.4 Type completeness

Does the type system define size, line height, letter spacing, weight, and case
for every semantic role (display, heading levels, body, caption, label, code)?
Partial definitions force AI to interpolate.

Evidence: Figma + Code

#### 4.5 Spacing scale regularity

Is the spacing system built on a base unit (4pt, 8pt) with consistent
progression? Scored by checking whether spacing token values are multiples of
a common factor.

Evidence: Figma + Code

#### 4.6 Grid and layout system

Is there a defined column grid with documented gutters, margins, and
breakpoints? Are safe areas and platform chrome accounted for?

Evidence: Figma + Code

#### 4.7 Motion duration ranges

UI transitions in 100-500ms range. Entry animations 200-300ms, exit animations
150-250ms. Values outside these ranges flagged. Scored only if motion tokens
exist.

Evidence: Code (motion tokens or animation values)

#### 4.8 Motion easing

Standard easing defined (ease-out for entries, ease-in for exits). Linear
easing flagged. Bounce/elastic flagged unless documented as intentional. Scored
only if easing tokens exist.

Evidence: Code (easing tokens or animation definitions)

#### 4.9 Focus state presence

Every interactive component has a visible focus state. WCAG 2.4.7 requirement.

Evidence: Figma (focus variants) + Code (focus styles)

#### 4.10 Error state coverage

Input components define error, success, and disabled states. Forms define
error summary behaviour.

Evidence: Figma (variants) + Code (component states)

#### 4.11 Loading state coverage

Asynchronous actions have defined loading states. Skeleton screens, spinners,
or progress indicators exist as system patterns.

Evidence: Figma (loading components) + Code (loading patterns)

#### 4.12 Empty state coverage

Lists, tables, and data-dependent views define empty states as system patterns.

Evidence: Figma (empty state components) + Code (empty state patterns)

#### 4.13 Colour system structure

Primitive palette has defined steps per hue (not arbitrary). Semantic colours
are role-based (feedback/error, surface/primary) not hue-based (red-500).

Evidence: Figma (variable structure) + Code (token naming)

#### 4.14 Icon sizing consistency

Icons use a defined size scale (e.g. 16, 20, 24, 32) aligned with spacing
system.

Evidence: Figma (icon components) + Code (icon size props)

#### 4.15 Elevation/shadow system

Shadows or elevation follow a defined scale, not arbitrary per-component values.

Evidence: Figma (effect styles or variables) + Code (elevation tokens)

### Tier 2: Evidence of consideration (scored 0/1/2)

Scoring: 0 = not addressed, 1 = partially addressed, 2 = systematically
addressed. These check whether the system has considered each principle, not
whether the specific choices are good.

#### 4.16 Visibility of system status

Does the system define patterns for communicating state? Loading, progress,
feedback (success, error, pending), real-time validation.

#### 4.17 Match between system and real world

Are component and variant names user-facing rather than developer-internal?
Are content guidelines documented?

#### 4.18 User control and freedom

Are undo, cancel, dismiss, and back navigation defined as system patterns?
Do destructive actions have confirmation patterns?

#### 4.19 Consistency and standards

Are interaction patterns consistent across similar components? Are similar
components structured consistently?

#### 4.20 Error prevention

Do form components define validation rules? Are input constraints part of
the component API?

#### 4.21 Recognition rather than recall

Are component options constrained to enumerated values? Are they documented
with visual examples and decision trees?

#### 4.22 Flexibility and efficiency

Are density variants available? Are shortcut and progressive disclosure
patterns documented?

#### 4.23 Aesthetic and minimalist design

Is there a defined visual hierarchy system? Are information density and
truncation rules documented?

#### 4.24 Error recovery

Are error messages structured (what happened, why, what to do)? Are recovery
actions defined as patterns?

#### 4.25 Help and documentation

Do components have descriptions explaining when to use them? Is there a
searchable pattern library? Are X vs Y decisions documented?

#### 4.26 Visual hierarchy

Are elevation/layering rules documented? Are grouping patterns defined with
spacing rules? Are size/weight relationships consistent across heading levels?

#### 4.27 Visual rhythm and proportion

Is vertical spacing governed by a system? Are component internal proportions
consistent? Is there a documented spatial model?

Evidence for all Tier 2: Figma + Code (documentation, component APIs, patterns)

---

## Cluster 5: Governance and Ecosystem

The system's ability to maintain itself over time.

### 5.1 Naming convention consistency

Are naming conventions consistent across tokens, components, styles, and files?
Do names use full words and slashes for machine parseability?

Evidence: Figma + Code

### 5.2 Versioning and changelog discipline

Is there a structured changelog? Semantic versioning in use? Reliable version
history for an agent to reason about upgrade paths?

Evidence: Code

### 5.3 Contribution standards

Are there explicit, machine-readable contribution guidelines? These are the
operating constraints an agent uses when proposing changes.

Evidence: Code

### 5.4 Deprecation patterns

Are deprecated components and tokens clearly marked with migration paths? An
agent trained on the codebase will otherwise use deprecated patterns.

Evidence: Figma + Code

### 5.5 Test coverage

Are components covered by visual regression tests, unit tests, or accessibility
tests?

Evidence: Code only. Not assessable from Figma.

### 5.6 Adoption visibility

Is there tooling to understand which consuming applications use which
components at which versions?

Evidence: Code only. Not assessable from Figma.

### 5.7 Code consistency and pattern predictability

Do components follow consistent internal structure (file organisation, hook
patterns, style co-location)? Are conventions enforced by linting? How much
structural divergence exists across similar component types?

Evidence: Code only. Not assessable from Figma.

---

## Cluster 6: Design-to-Code Parity

Cross-platform coherence. Requires both evidence sources simultaneously. When
code repo is absent, the entire cluster scores null (not assessed).

### 6.1 Token value parity

Do the token values in code match those in the Figma Variables? Drift here means
an agent working from Figma will generate incorrect code, and vice versa.

Evidence: Both required.

### 6.2 Token naming parity

Do the token names in code match the Figma Variable names? Misalignment forces
human translation.

Evidence: Both required.

### 6.3 Component naming parity

Do component names, variant names, and prop names align between Figma and code?

Evidence: Both required.

### 6.4 Variant and state coverage parity

Are all Figma-defined states implemented in code? Are all coded states
specified in Figma?

Evidence: Both required.

### 6.5 Behaviour parity

Are there interactive behaviours in code (hover, focus management, loading
transitions, keyboard navigation, error handling) with no corresponding Figma
specification? And the reverse: states defined in Figma that are not
implemented in code? This reveals where design decisions are being made
unilaterally.

Evidence: Both required.

### 6.6 Documentation of parity gaps

Are known gaps between Figma and code tracked and documented? Undocumented
gaps become silent agent errors.

Evidence: Both required.
