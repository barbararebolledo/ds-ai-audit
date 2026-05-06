# Editorial: carbon-v3.2-2026-04-10
<!-- audit_ref: carbon-v3.2-2026-04-10 -->

> This file is the editing surface for non-technical reviewers.
> Edit the content between `<!-- field: ... -->` and `<!-- /field -->` delimiters.
> Run `node scripts/compile-editorial.mjs --system carbon --version v3.2` to compile back to JSON.

---

## Report

### Executive Summary

<!-- field: report.executive_summary -->
Carbon has exceptional governance and component coverage, but AI tools working from the design file cannot read any component purpose or token meaning -- everything they need is in code, not in Figma.
<!-- /field -->

### Methodology Note

<!-- field: report.methodology_note -->
This audit checks whether the design system can explain itself to an AI agent without human intervention. It scores 56 dimensions across seven clusters using Figma and code evidence. A higher score means less manual correction when AI tools generate or select UI.
<!-- /field -->

---

## Scope Statement

> Register note: the "edges, not gaps" framing in paragraph 3 is non-negotiable.
> Do not soften "It does not claim to measure" with "fully" or "comprehensively".
> All four scope-list items must be retained.
> {overall_score} and {phase_readiness} are placeholders interpolated by the front-end at render time.

<!-- field: scope_statement -->
The audit measures the design system as an artefact. Tokens, components, documentation, governance, parity. It scores these through an AI consumption lens: whether the content is right, whether the mechanism delivers it to the AI consumer, whether the consumer in fact uses what arrives. That is the instrument.

There are things this instrument does not measure. Organisational capacity to operate the system at AI speed sits outside the artefact and outside the score. So does designer judgement under tension: knowing which rule to break, against which brief, for which moment. So does accessibility-in-the-trenches, the ongoing practice of working with disabled users that sits behind the accessibility properties measurable at the artefact level. So does brand-as-lived-practice, the accumulated decisions that give a product its character, distinct from brand-as-encoded-rules.

These are not gaps in the audit. They are the instrument's edges. The audit is a focused diagnostic of one layer. It does not claim to measure the team that builds the system, the judgement that shapes individual decisions, or the cultural fabric that holds brand expression together. Those questions need other tools.

A score of {overall_score}/100 on this audit means the artefact is {phase_readiness} for AI consumption. It does not mean the system is AI-ready in the broader organisational sense, and it does not relieve the team of the harder work that sits above the artefact layer.
<!-- /field -->

---

## Organisational Implications

> Register note: opening and closing are invariant -- do not edit them.
> Edit only the pattern blocks. "Often suggests" is the required modal phrase.
> "We'd like to validate this with you in Phase 2" closes every pattern without variation.

### Opening (invariant)

> The audit measures the artefact, not the team. The artefact carries traces of how the team works, and the patterns below are inferences read from the score profile. They are suggestions, not diagnoses. The audit invites validation in Phase 2.

### Patterns

#### Pattern 1

**Pattern name**

<!-- field: organisational_implications.patterns.0.pattern_name -->
Figma documentation entirely absent
<!-- /field -->

**Cluster or dimension reference**

<!-- field: organisational_implications.patterns.0.cluster_or_dimension_reference -->
Dimensions 3.1 (Functional Intent Coverage) and 3.5 (In-File Documentation Structure)
<!-- /field -->

**Score value**

<!-- field: organisational_implications.patterns.0.score_value -->
0/100 and 25/100
<!-- /field -->

**Supporting observation**

<!-- field: organisational_implications.patterns.0.supporting_observation -->
94.9% of Carbon's 2856 components have no Figma description and the file has no structured documentation frame convention, while the carbondesignsystem.com docs site scores 3.4 (Usage Guidance Structure) at 100%
<!-- /field -->

**Artefact pattern described**

<!-- field: organisational_implications.patterns.0.artefact_pattern_described -->
excellent documentation written for the docs site but with no route to the design file -- an AI tool reading the Figma API receives no component purpose, no usage guidance, no constraints
<!-- /field -->

**Organisational implication**

<!-- field: organisational_implications.patterns.0.organisational_implication -->
documentation may be owned by a content or developer experience team that publishes to the site but has no workflow for keeping Figma component descriptions synchronised with what is published. We'd like to validate this with you in Phase 2.
<!-- /field -->

#### Pattern 2

**Pattern name**

<!-- field: organisational_implications.patterns.1.pattern_name -->
Full token coverage, zero token explanation
<!-- /field -->

**Cluster or dimension reference**

<!-- field: organisational_implications.patterns.1.cluster_or_dimension_reference -->
Dimensions 1.1 (Token Implementation) and 1.6 (Token Documentation)
<!-- /field -->

**Score value**

<!-- field: organisational_implications.patterns.1.score_value -->
100/100 and 0/100
<!-- /field -->

**Supporting observation**

<!-- field: organisational_implications.patterns.1.supporting_observation -->
1804 variables across 34 collections with four theme modes, but only 5 of those 1804 variables carry any description
<!-- /field -->

**Artefact pattern described**

<!-- field: organisational_implications.patterns.1.artefact_pattern_described -->
a comprehensively tokenised system where the tokens themselves carry no explanation of what they mean or when to use them
<!-- /field -->

**Organisational implication**

<!-- field: organisational_implications.patterns.1.organisational_implication -->
token implementation may have been executed as a technical migration effort, with description-writing deferred as a lower-priority follow-on task that has not yet been resourced. We'd like to validate this with you in Phase 2.
<!-- /field -->

#### Pattern 3

**Pattern name**

<!-- field: organisational_implications.patterns.2.pattern_name -->
Strong governance, documentation workflow gap
<!-- /field -->

**Cluster or dimension reference**

<!-- field: organisational_implications.patterns.2.cluster_or_dimension_reference -->
Cluster 5 (Governance and Ecosystem) and Cluster 3 (Documentation Readiness)
<!-- /field -->

**Score value**

<!-- field: organisational_implications.patterns.2.score_value -->
82.1/100 and 45.0/100
<!-- /field -->

**Supporting observation**

<!-- field: organisational_implications.patterns.2.supporting_observation -->
formal deprecation patterns (100%), three-tier test coverage (100%), and a comprehensive developer contribution handbook alongside a Cluster 3 score anchored by zero Figma-side intent coverage
<!-- /field -->

**Artefact pattern described**

<!-- field: organisational_implications.patterns.2.artefact_pattern_described -->
a governance-mature system that has built strong process around code but has not extended that process discipline to the design file as a documentation surface
<!-- /field -->

**Organisational implication**

<!-- field: organisational_implications.patterns.2.organisational_implication -->
governance investment may have been driven by engineering leadership, with the design file treated as a source for handoff rather than as a maintained documentation artefact in its own right. We'd like to validate this with you in Phase 2.
<!-- /field -->

#### Pattern 4

**Pattern name**

<!-- field: organisational_implications.patterns.3.pattern_name -->
Parity gap structural but undocumented
<!-- /field -->

**Cluster or dimension reference**

<!-- field: organisational_implications.patterns.3.cluster_or_dimension_reference -->
Cluster 6 (Design-to-Code Parity)
<!-- /field -->

**Score value**

<!-- field: organisational_implications.patterns.3.score_value -->
54.2/100
<!-- /field -->

**Supporting observation**

<!-- field: organisational_implications.patterns.3.supporting_observation -->
518 code-only tokens and 1164 Figma-only tokens with no parity gap register, alongside a naming convention mismatch between Figma (kebab-case) and code (camelCase) that is systematic but undocumented
<!-- /field -->

**Artefact pattern described**

<!-- field: organisational_implications.patterns.3.artefact_pattern_described -->
a large token gap that likely reflects a deliberate architectural difference -- Figma variables and code tokens were not designed to be 1:1 -- but has never been written down, making it indistinguishable from drift
<!-- /field -->

**Organisational implication**

<!-- field: organisational_implications.patterns.3.organisational_implication -->
the Figma token architecture and code token architecture may have been developed by different teams or at different points in the system's history, without a shared contract establishing which differences are intentional. We'd like to validate this with you in Phase 2.
<!-- /field -->

### Closing (invariant)

> These are the implications the audit can read in the artefact. They are not the totality of the organisational picture. They are the parts visible from the design system's score profile. Phase 2 is where these patterns get tested against the team's reality.

---

## Clusters

### 0_prerequisites

#### Narrative

<!-- field: clusters.0_prerequisites.narrative -->
Platform architecture is documented and clearly scoped, giving AI tools enough context to navigate the system correctly.
<!-- /field -->

#### Value Framing

<!-- field: clusters.0_prerequisites.value_framing -->
The system's multi-platform scope is clear enough that AI tools know which guidelines to follow for each target platform.
<!-- /field -->

### 1_token_and_variable_system

#### Narrative

<!-- field: clusters.1_token_and_variable_system.narrative -->
The design file has an exceptionally rich set of design values, but none of them are labelled -- AI tools cannot tell what any of them mean.
<!-- /field -->

#### Value Framing

<!-- field: clusters.1_token_and_variable_system.value_framing -->
Theme colour changes update automatically, but AI tools cannot apply the right values because token descriptions are almost entirely absent.
<!-- /field -->

### 2_component_quality

#### Narrative

<!-- field: clusters.2_component_quality.narrative -->
Components are composable and well-structured, but token connections are inconsistent -- some components update with themes, others need manual fixes.
<!-- /field -->

#### Value Framing

<!-- field: clusters.2_component_quality.value_framing -->
Most components respond to theme changes automatically, but a subset require manual updates every time a brand change is applied.
<!-- /field -->

### 3_documentation_readiness

#### Narrative

<!-- field: clusters.3_documentation_readiness.narrative -->
Excellent guidance exists on the Carbon website, but the design file has no component descriptions -- AI tools get no guidance from the file itself.
<!-- /field -->

#### Value Framing

<!-- field: clusters.3_documentation_readiness.value_framing -->
Every AI-assisted component selection requires a human to verify it -- the design file gives AI tools nothing to work with.
<!-- /field -->

### 4_design_quality_baseline

#### Narrative

<!-- field: clusters.4_design_quality_baseline.narrative -->
Strong foundations across colour, spacing, grid, and interactive states. Two gaps stand out: no motion specifications in the design file, and no empty state patterns.
<!-- /field -->

#### Value Framing

<!-- field: clusters.4_design_quality_baseline.value_framing -->
Most screens build correctly from the system, but animated interactions need engineering input on every component, and every data-dependent view needs custom empty state design.
<!-- /field -->

### 5_governance_and_ecosystem

#### Narrative

<!-- field: clusters.5_governance_and_ecosystem.narrative -->
Formal deprecation, three-tier testing, and a comprehensive developer handbook make this the most mature governance score of either benchmark system.
<!-- /field -->

#### Value Framing

<!-- field: clusters.5_governance_and_ecosystem.value_framing -->
AI tools can trust that components they select are current and tested -- the system actively flags and retires outdated patterns.
<!-- /field -->

### 6_design_to_code_parity

#### Narrative

<!-- field: clusters.6_design_to_code_parity.narrative -->
Component names match perfectly between design and code. Token coverage gaps are large but structural -- they reflect a deliberate architectural difference, not accidental drift.
<!-- /field -->

#### Value Framing

<!-- field: clusters.6_design_to_code_parity.value_framing -->
Designs hand off correctly for visual properties, but the 1682 unmatched tokens mean every automated parity check triggers a false alarm until gaps are documented.
<!-- /field -->

---

## Dimensions

### 1.6_token_documentation

#### Narrative

<!-- field: dimensions.1.6_token_documentation.narrative -->
Every token variable should have a description explaining its semantic purpose so an agent can select the correct token without inference. Carbon has 5 of 1804 variables (0.3%) with descriptions -- the lowest coverage of either benchmark system. The Colors collection (135 vars), Theme semantics (548 vars), Spacing (28 vars), Type Primitives (329 vars), Breakpoint (212 vars) all have zero descriptions. Without descriptions, an agent reading the variable data cannot determine token purpose, scope, or constraints from the Figma API alone.
<!-- /field -->

### 4.7_motion_duration_ranges

#### Narrative

<!-- field: dimensions.4.7_motion_duration_ranges.narrative -->
Motion duration tokens should exist in both Figma and code so design and engineering share the same timing values and agents can read motion specifications from the design file. Code defines well-structured motion durations (fast01: 70ms through slow02: 700ms) with productive/expressive variants. These do not exist as Figma Variables or styles. An agent reading only the Figma file would find no motion specifications.
<!-- /field -->

### 4.12_empty_state_coverage

#### Narrative

<!-- field: dimensions.4.12_empty_state_coverage.narrative -->
Data-dependent components should include empty state variants defining what displays when a dataset is empty, so agents can render complete product flows. No empty state patterns, components, or variants exist in the Carbon Figma library. Data Table, Dropdown, and List have no empty state definitions. There is no dedicated EmptyState component. Empty states are a critical pattern for data-driven interfaces -- their absence forces every consuming team to design them independently.
<!-- /field -->

### 6.6_documentation_of_parity_gaps

#### Narrative

<!-- field: dimensions.6.6_documentation_of_parity_gaps.narrative -->
Known gaps between Figma and code should be documented in a parity gap register so agents can distinguish intentional differences from accidental drift. No parity register exists. The token diff reveals 518 code-only tokens and 1164 Figma-only tokens with no documentation explaining whether gaps are intentional (different architectures) or unresolved drift. The naming convention differences, motion tokens existing only in code, and grid styles existing only in Figma are all undocumented. Without this register, automated drift detection generates false positives on every gap.
<!-- /field -->

### 3.1_functional_intent_coverage

#### Narrative

<!-- field: dimensions.3.1_functional_intent_coverage.narrative -->
Component descriptions in Figma should carry functional intent -- what each component does, when to use it, and what to expect -- so an agent can select the correct component without opening code documentation. 147 of 2856 components (5.1%) have any description in Figma. All 147 are Tree View spec implementation notes. Zero components carry functional intent descriptions. Excellent code-side MDX documentation exists but has no declared path from Figma component metadata -- an agent reading the Figma API receives no guidance on component purpose.
<!-- /field -->

### 3.5_in_file_documentation_structure

#### Narrative

<!-- field: dimensions.3.5_in_file_documentation_structure.narrative -->
Figma files should contain structured documentation frames alongside component definitions so an agent reading the file gets documentation without an external lookup. Carbon has 196 COMPONENT_SET nodes with rich structural data (4047 variants, 447 variant axes) but 0 of 196 have Figma descriptions on the COMPONENT_SET node. The Slot component description (a tutorial link) is the only exception. The file has no structured documentation frame convention.
<!-- /field -->

---

## Findings

### CDC-001

#### Summary

<!-- field: findings.CDC-001.summary -->
94.9% of components have no Figma description -- zero functional intent
<!-- /field -->

#### Description

<!-- field: findings.CDC-001.description -->
147 of 2856 components (5.1%) have any description in Figma. All 147 are Tree View spec notes ('Follow specs for levels...'), not functional intent descriptions. No component carries a description that would help an agent decide whether to use it. The code-side MDX documentation is excellent but is not accessible through the Figma API.
<!-- /field -->

#### Recommendation

<!-- field: findings.CDC-001.recommendation -->
Add functional intent descriptions to the COMPONENT_SET root entries for the 45 primary components (one per page). Start with the 10 most-used components. Use the code-side MDX overview paragraphs as the source.
<!-- /field -->

### TD-001

#### Summary

<!-- field: findings.TD-001.summary -->
0.3% of Figma variables have descriptions -- agent cannot determine token purpose
<!-- /field -->

#### Description

<!-- field: findings.TD-001.description -->
Only 5 of 1804 Figma variables (0.3%) have descriptions. None of the major collections have descriptions: Colors primitives (135), Theme semantics (548), Spacing (28), Type Primitives (329), Breakpoint (212). Without descriptions, an agent reading the variable data cannot determine token purpose, scope, or constraints from the Figma API alone.
<!-- /field -->

#### Recommendation

<!-- field: findings.TD-001.recommendation -->
Add descriptions to all variable collections, prioritising Theme semantics (548 vars) and Colors primitives (135 vars). At minimum, add collection-level descriptions and descriptions for the 20 most-used semantic tokens.
<!-- /field -->

### DFM-001

#### Summary

<!-- field: findings.DFM-001.summary -->
Zero sub-component descriptions in Figma frame structure
<!-- /field -->

#### Description

<!-- field: findings.DFM-001.description -->
196 COMPONENT_SET nodes found with rich structural data (4047 variants, 447 variant axes). However, 0 of 196 have Figma descriptions on the COMPONENT_SET node. Carbon does not use a structured documentation frame convention.
<!-- /field -->

#### Recommendation

<!-- field: findings.DFM-001.recommendation -->
Add descriptions to COMPONENT_SET nodes. The description field is structured (not canvas text) and returned by the REST API components endpoint.
<!-- /field -->

### MOT-001

#### Summary

<!-- field: findings.MOT-001.summary -->
Motion duration tokens exist in code but not in Figma Variables
<!-- /field -->

#### Description

<!-- field: findings.MOT-001.description -->
Code defines well-structured motion durations (fast01: 70ms, fast02: 110ms, moderate01: 150ms, moderate02: 240ms, slow01: 400ms, slow02: 700ms) with productive/expressive variants. These do not exist as Figma Variables or styles. An agent reading only the Figma file would find no motion specifications.
<!-- /field -->

#### Recommendation

<!-- field: findings.MOT-001.recommendation -->
Create a Motion variable collection in Figma with duration and easing tokens matching the code definitions. Alternatively, document the absence as intentional and ensure the motion specifications are referenced in component documentation frames.
<!-- /field -->

### ES-001

#### Summary

<!-- field: findings.ES-001.summary -->
No empty state patterns in Figma component library
<!-- /field -->

#### Description

<!-- field: findings.ES-001.description -->
Data-dependent components (Data Table, Dropdown, List, Contained list) do not include empty state variants. No dedicated empty state utility component exists. Their absence forces designers and agents to improvise.
<!-- /field -->

#### Recommendation

<!-- field: findings.ES-001.recommendation -->
Create empty state variants for data-dependent components or create a reusable EmptyState component pattern. Document when to use empty states and what content they should contain.
<!-- /field -->

### DPG-001

#### Summary

<!-- field: findings.DPG-001.summary -->
No parity gap register -- 1682 unmatched tokens undocumented
<!-- /field -->

#### Description

<!-- field: findings.DPG-001.description -->
518 code-only tokens and 1164 Figma-only tokens have no documentation explaining whether gaps are intentional or bugs. The naming convention differences are undocumented. Without a gap register, automated drift detection will generate false positives, and agents cannot distinguish intentional omissions from actual gaps.
<!-- /field -->

#### Recommendation

<!-- field: findings.DPG-001.recommendation -->
Create a parity gap register documenting: (1) known architectural differences, (2) intentional omissions, (3) naming convention mapping. Store as a structured JSON file alongside the token definitions.
<!-- /field -->

---

## Remediation

### REM-001

#### Action

<!-- field: remediation.REM-001.action -->
Move: Port functional intent descriptions from code-side MDX overview paragraphs to Figma COMPONENT_SET root entries for all 45 primary components. Start with the 10 most-used components.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-001.value_framing -->
Without component descriptions, an AI agent cannot determine component purpose from the Figma API. Every agent interaction requires manual lookup, adding correction cycles to every design-to-code handoff.
<!-- /field -->

### REM-002

#### Action

<!-- field: remediation.REM-002.action -->
Create: Write descriptions for Figma variable definitions, prioritising Theme semantics (548 vars) and Colors primitives (135 vars). At minimum, add descriptions for the 20 most-consumed semantic tokens.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-002.value_framing -->
Without token descriptions, an AI agent cannot distinguish tokens by purpose. Token selection errors propagate to every component generated, requiring theme rework on each affected component.
<!-- /field -->

### REM-003

#### Action

<!-- field: remediation.REM-003.action -->
Create: Build a parity gap register as a structured JSON file documenting architectural differences, intentional omissions, and naming convention mapping between Figma and code.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-003.value_framing -->
Without a gap register, automated drift detection generates false positives on 1682 tokens. Every parity check requires manual triage, blocking CI/CD integration of token sync tooling.
<!-- /field -->

### REM-004

#### Action

<!-- field: remediation.REM-004.action -->
Create: Build a Motion variable collection in Figma with duration and easing tokens matching the code definitions, or create a documentation page in the Figma file linking to packages/motion.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-004.value_framing -->
Motion specifications exist in code but are invisible from Figma. An agent building from Figma alone will produce static components with no motion guidance, requiring post-generation correction on every animated interaction.
<!-- /field -->

### REM-005

#### Action

<!-- field: remediation.REM-005.action -->
Rework: Add YAML frontmatter to MDX documentation files with structured fields: component_name, purpose, category, status, related_components. Apply to all 126 component MDX files.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-005.value_framing -->
Without structured metadata, an agent must parse prose to extract component purpose and status. Frontmatter enables instant structured lookup, reducing per-component context processing.
<!-- /field -->

### REM-006

#### Action

<!-- field: remediation.REM-006.action -->
Create: Build a naming convention mapping as a structured JSON file documenting Figma slash-separated paths and their code camelCase/kebab-case equivalents.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-006.value_framing -->
Without a naming map, every token parity check must fall back to value matching. Name-based matching is faster, more reliable, and catches value drift that value-only matching misses.
<!-- /field -->

### REM-007

#### Action

<!-- field: remediation.REM-007.action -->
Create: Publish tokens in DTCG format alongside the existing JS exports to enable standard tooling interop without replacing the JS-primary workflow.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-007.value_framing -->
Custom JS token format requires Carbon-specific extraction logic. DTCG format would enable any standard token tool to consume Carbon tokens without custom parsing.
<!-- /field -->

### REM-008

#### Action

<!-- field: remediation.REM-008.action -->
Rework: Update code-side component tokens to alias semantic theme tokens instead of hardcoding hex values, completing the three-layer alias chain in code.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-008.value_framing -->
Broken alias chain at the component level means theme changes require manual hex updates in component-tokens/ instead of cascading automatically.
<!-- /field -->

### REM-009

#### Action

<!-- field: remediation.REM-009.action -->
Rework: Audit all components for token binding completeness using Text Input/Accordion binding depth as the target standard. Prioritise the 10 most-used interactive components.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-009.value_framing -->
Inconsistent token binding means an agent generates theme-aware code for some components but hardcoded values for others. This creates per-component rework when switching themes.
<!-- /field -->

### REM-010

#### Action

<!-- field: remediation.REM-010.action -->
Rework: Add Error handling and Edge cases sections to the 10 most-used component MDX files to complete levels 5 and 6 of the documentation hierarchy.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-010.value_framing -->
Missing error handling and edge case documentation means agents produce components that work for happy paths but fail on boundary conditions.
<!-- /field -->

### REM-011

#### Action

<!-- field: remediation.REM-011.action -->
Create: Build empty state variants for data-dependent components (Data Table, Dropdown, List, Contained List) or create a reusable EmptyState component pattern.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-011.value_framing -->
Without empty state patterns, every data-dependent view requires custom empty state design, adding design debt to every consuming team.
<!-- /field -->

### REM-012

#### Action

<!-- field: remediation.REM-012.action -->
Create: Add skeleton/loading state variants to async-capable components (Data Table, Dropdown, Select) or document the Loading component wrapper pattern.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-012.value_framing -->
Inconsistent loading patterns mean agents must decide per-component whether to use a dedicated skeleton or a wrapper Loading component.
<!-- /field -->

### REM-013

#### Action

<!-- field: remediation.REM-013.action -->
Rework: Standardise typography binding in Figma -- choose either individual variable bindings or composite text styles as the canonical approach, and apply consistently across all components.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-013.value_framing -->
Inconsistent typography binding means an agent extracting type styles gets different data shapes from different components. Standardisation enables reliable automated typography extraction.
<!-- /field -->

