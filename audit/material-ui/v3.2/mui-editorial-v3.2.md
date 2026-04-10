# Editorial: material-ui-v3.2-2026-04-10
<!-- audit_ref: material-ui-v3.2-2026-04-10 -->

> This file is the editing surface for non-technical reviewers.
> Edit the content between `<!-- field: ... -->` and `<!-- /field -->` delimiters.
> Run `node scripts/compile-editorial.mjs --system mui --version v3.2` to compile back to JSON.

---

## Report

### Executive Summary

<!-- field: report.executive_summary -->
MUI has strong component foundations but one structural gap means AI tools cannot select the right component without a human reviewing every choice.
<!-- /field -->

### Methodology Note

<!-- field: report.methodology_note -->
This audit checks whether the design system can explain itself to an AI agent without human intervention. It scores 56 dimensions across seven clusters using Figma and code evidence. A higher score means less manual correction when AI tools generate or select UI.
<!-- /field -->

---

## Clusters

### 0_prerequisites

#### Narrative

<!-- field: clusters.0_prerequisites.narrative -->
Platform architecture is documented and discoverable from code evidence, meeting the minimum threshold for downstream cluster validity.
<!-- /field -->

#### Value Framing

<!-- field: clusters.0_prerequisites.value_framing -->
The system's structure is clear enough that AI tools can navigate it without a human explaining the layout.
<!-- /field -->

### 1_token_and_variable_system

#### Narrative

<!-- field: clusters.1_token_and_variable_system.narrative -->
Colour theming updates automatically across components, but spacing and typography still require manual edits in multiple places.
<!-- /field -->

#### Value Framing

<!-- field: clusters.1_token_and_variable_system.value_framing -->
Colour theming updates automatically, but spacing and typography changes still require manual work across every component.
<!-- /field -->

### 2_component_quality

#### Narrative

<!-- field: clusters.2_component_quality.narrative -->
Components are well-structured and composable in code, but inconsistent token connections mean some components break when themes change.
<!-- /field -->

#### Value Framing

<!-- field: clusters.2_component_quality.value_framing -->
Most components respond to theme changes automatically, but a handful require manual fixes every time a theme is updated.
<!-- /field -->

### 3_documentation_readiness

#### Narrative

<!-- field: clusters.3_documentation_readiness.narrative -->
Rich guidance exists on the docs site but is invisible to AI tools working from the design file.
<!-- /field -->

#### Value Framing

<!-- field: clusters.3_documentation_readiness.value_framing -->
AI tools cannot pick the right component on their own -- someone needs to review every selection before it ships.
<!-- /field -->

### 4_design_quality_baseline

#### Narrative

<!-- field: clusters.4_design_quality_baseline.narrative -->
The system handles colour, spacing, and interactive states well, but has no guidance for when data is missing or loading.
<!-- /field -->

#### Value Framing

<!-- field: clusters.4_design_quality_baseline.value_framing -->
Most screens build correctly from the system, but every table or list that can be empty needs custom design work to handle that state.
<!-- /field -->

### 5_governance_and_ecosystem

#### Narrative

<!-- field: clusters.5_governance_and_ecosystem.narrative -->
Code contributions and releases are well-managed, but the design file has no way of flagging outdated or retired components.
<!-- /field -->

#### Value Framing

<!-- field: clusters.5_governance_and_ecosystem.value_framing -->
Developers get clear signals when components are outdated, but designers working from the Figma file may unknowingly use components that have been replaced.
<!-- /field -->

### 6_design_to_code_parity

#### Narrative

<!-- field: clusters.6_design_to_code_parity.narrative -->
Token names match perfectly between design and code, but gaps in behaviour documentation mean implementations frequently need engineering fixes after handoff.
<!-- /field -->

#### Value Framing

<!-- field: clusters.6_design_to_code_parity.value_framing -->
Designs hand off cleanly for visual properties, but interactive behaviour -- keyboard navigation, animations, accessibility -- has to be added by engineers after every handoff.
<!-- /field -->

---

## Dimensions

### 3.1_component_description_coverage

#### Narrative

<!-- field: dimensions.3.1_component_description_coverage.narrative -->
Component descriptions in Figma should carry functional intent -- what each component does, when to use it, and what to expect -- so an agent can select the correct component without opening code documentation. 370 of 1034 components (35.8%) have any description, but 356 of those (96.2%) are code import snippets: 'import TextField from "@mui/material/TextField"' carries zero functional intent. At the component set level, 0 of 40 sets have intent-carrying descriptions. Rich intent documentation exists on mui.com but is not declared or linked from Figma component metadata.
<!-- /field -->

### 1.6_token_documentation

#### Narrative

<!-- field: dimensions.1.6_token_documentation.narrative -->
Every token variable should have a description explaining its semantic purpose -- what property it controls, when to use it, and what it communicates -- so an agent can select the correct token without inference. Only 98 of 532 variables (18.4%) have descriptions, all in the palette collections. The 252 material/colors primitives, all 20 spacing variables, all breakpoints, and all shape variables have no descriptions. The 98 existing descriptions are mechanical reflections rather than intent documentation: 'Reflects the text.primary variable from the theme object' carries no actionable guidance.
<!-- /field -->

### 4.12_empty_state_coverage

#### Narrative

<!-- field: dimensions.4.12_empty_state_coverage.narrative -->
Data-dependent components should include empty state variants defining what displays when a dataset is empty, so agents can render complete product flows. No empty state patterns, components, or variants exist anywhere in the MUI system. Data Grid, Table, List, and Image List have no empty state definitions. There is no EmptyState component and no documented pattern for zero-data scenarios.
<!-- /field -->

### 6.6_documentation_of_parity_gaps

#### Narrative

<!-- field: dimensions.6.6_documentation_of_parity_gaps.narrative -->
Known gaps between Figma and code should be documented in a parity gap register so agents can distinguish intentional differences from accidental drift. No parity register exists. The token diff identifies 7 value mismatches, 125 code-only tokens, and 123 Figma-only tokens -- none of these are tracked, classified as intentional or unintentional, or assigned owners. An agent encountering a mismatch cannot determine whether it should follow Figma, follow code, or flag for human review.
<!-- /field -->

---

## Findings

### CDC-001

#### Summary

<!-- field: findings.CDC-001.summary -->
96.2% of component descriptions are code import snippets with zero functional intent
<!-- /field -->

#### Description

<!-- field: findings.CDC-001.description -->
370 of 1034 components (35.8%) have descriptions, but 356 of those (96.2%) are code import snippets (e.g. 'import TextField from "@mui/material/TextField"'). Only 14 components have real descriptions. At the component set level: 0 of 40 sets carry functional intent descriptions. The docs site has rich intent descriptions for every component, but these are not linked from or declared in Figma component metadata.
<!-- /field -->

#### Recommendation

<!-- field: findings.CDC-001.recommendation -->
Port functional intent descriptions from the docs site to Figma component set root entries. At minimum: one-sentence purpose + 'when to use' + 'when not to use'. Add docs site URL to the Figma component link field to establish co-location.
<!-- /field -->

### TD-001

#### Summary

<!-- field: findings.TD-001.summary -->
81.6% of token variables have no description
<!-- /field -->

#### Description

<!-- field: findings.TD-001.description -->
Only 98 of 532 variables (18.4%) have descriptions. All 252 material/colors primitives have no description. All spacing, typography, breakpoints, and shape variables have no description. The 98 described palette variables use mechanical descriptions ('Reflects the text.primary variable from the theme object') rather than intent-driven documentation.
<!-- /field -->

#### Recommendation

<!-- field: findings.TD-001.recommendation -->
Add descriptions to all token collections, prioritising semantic palette tokens and component-level tokens. Descriptions should explain the token's purpose and when to use it, not just mirror its name.
<!-- /field -->

### ES-001

#### Summary

<!-- field: findings.ES-001.summary -->
Zero empty state coverage -- no patterns or components for zero-data scenarios
<!-- /field -->

#### Description

<!-- field: findings.ES-001.description -->
No empty state patterns or components exist. Data Grid, Table, List, and other data-dependent views have no defined empty state variants. No EmptyState component. No documented pattern for zero-data scenarios.
<!-- /field -->

#### Recommendation

<!-- field: findings.ES-001.recommendation -->
Create empty state patterns for data-dependent components (Table, List, Data Grid). Define at minimum: illustration/icon + message + action template. Add empty state variants to data display components.
<!-- /field -->

### DPG-001

#### Summary

<!-- field: findings.DPG-001.summary -->
No parity gap register -- 248 unmatched tokens and 7 value mismatches undocumented
<!-- /field -->

#### Description

<!-- field: findings.DPG-001.description -->
The token diff identifies 125 code-only tokens, 123 Figma-only tokens, and 7 value mismatches. These gaps are not documented or tracked anywhere in the system. No process exists for reviewing or resolving parity differences. An agent cannot distinguish intentional differences from accidental drift.
<!-- /field -->

#### Recommendation

<!-- field: findings.DPG-001.recommendation -->
Create a parity gap register (JSON file in the repo) documenting each gap: whether it is intentional or needs resolution, which platform is authoritative, and target resolution date.
<!-- /field -->

---

## Remediation

### REM-001

#### Action

<!-- field: remediation.REM-001.action -->
Move: Port functional intent descriptions from the docs site (mui.com) to Figma component set root entries. For each of the 40 component sets: add a one-sentence purpose statement, 'when to use', and 'when not to use' guidance. Add the docs site URL to the Figma component link field.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-001.value_framing -->
Without intent descriptions, an agent generating UI from MUI components cannot select the right component for a given context. Every component selection requires a human reviewer to verify, adding a correction cycle per component per generation.
<!-- /field -->

### REM-002

#### Action

<!-- field: remediation.REM-002.action -->
Create: Write descriptions for all token variables, prioritising semantic palette tokens (136 vars) and component-level tokens (68 vars). Descriptions should explain the token's purpose and when to use it: 'Primary action colour for buttons and interactive elements in the default theme'.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-002.value_framing -->
Without token descriptions, an agent cannot determine which token to apply to a new component. It must guess from naming conventions or copy from existing components, producing inconsistent theme application that requires manual correction.
<!-- /field -->

### REM-003

#### Action

<!-- field: remediation.REM-003.action -->
Create: Build a parity gap register (JSON file in the repo) documenting the 7 known token value mismatches, 125 code-only tokens, and 123 Figma-only tokens. For each gap: mark whether intentional or needs resolution, which platform is authoritative, and target resolution date.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-003.value_framing -->
Without a parity register, an agent consuming both Figma and code tokens cannot distinguish intentional differences from drift. Every mismatch triggers a parity defect investigation.
<!-- /field -->

### REM-004

#### Action

<!-- field: remediation.REM-004.action -->
Rework: Formalise usage guidance on the docs site -- add structured 'When to use' and 'When not to use' sections to component MDX pages. Create a machine-readable frontmatter field (e.g. usage_guidance) with structured do/don't rules for the top 20 components.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-004.value_framing -->
Unstructured prose guidance requires natural language parsing. Structured rules are reliably agent-parseable, reducing component selection errors.
<!-- /field -->

### REM-005

#### Action

<!-- field: remediation.REM-005.action -->
Create: Build a three-layer token architecture for non-colour categories in Figma. Create semantic alias layers for spacing and component-level tokens for typography.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-005.value_framing -->
Without layered architecture for non-colour tokens, theme switching and contextual overrides cannot work for spacing or typography. Multi-theme support is colour-only.
<!-- /field -->

### REM-006

#### Action

<!-- field: remediation.REM-006.action -->
Move: Document key code-side behaviours in Figma -- for each interactive component, add keyboard interaction patterns, transition specifications, and ARIA requirements to the component description or documentation frames.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-006.value_framing -->
Without behaviour documentation in Figma, an agent generating a component from the design file will produce visually correct but behaviourally incomplete implementations, requiring engineering correction.
<!-- /field -->

### REM-007

#### Action

<!-- field: remediation.REM-007.action -->
Create: Add deprecation markers to Figma components and variants for all items deprecated in code. Build a cross-platform deprecation register tracking deprecated items in both Figma and code with migration guidance.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-007.value_framing -->
Without Figma-side deprecation markers, an agent may select deprecated components for new designs, creating technical debt that requires manual review to catch.
<!-- /field -->

### REM-008

#### Action

<!-- field: remediation.REM-008.action -->
Create: Build empty state patterns for data-dependent components (Table, List, Data Grid, Image List). Define at minimum: illustration/icon + message + action template. Add empty state variants to data display component sets in Figma.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-008.value_framing -->
Without empty state patterns, every data-dependent view requires custom empty state design, producing inconsistent zero-data experiences across the product.
<!-- /field -->

### REM-009

#### Action

<!-- field: remediation.REM-009.action -->
Rework: Audit and strengthen component-to-token bindings across all 34 component sets. Ensure fills, strokes, spacing, and typography on all components reference Variables rather than hardcoded values.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-009.value_framing -->
Inconsistent token bindings mean theme switches produce visual breaks on unbound components. Each unbound property requires manual correction per theme.
<!-- /field -->

### REM-010

#### Action

<!-- field: remediation.REM-010.action -->
Create: Build motion token Variables in Figma for duration and easing values matching the code-side theme.transitions definitions. Alternatively, declare the code theme as the authoritative motion token source in CLAUDE.md.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-010.value_framing -->
Motion tokens in code only means designers cannot specify or verify transition behaviour from the design file. Implementations may diverge from design intent.
<!-- /field -->

### REM-011

#### Action

<!-- field: remediation.REM-011.action -->
Create: Extract lineHeight and letterSpacing as standalone Variables alongside fontSize, enabling flexible typographic composition outside predefined roles.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-011.value_framing -->
Missing standalone lineHeight/letterSpacing Variables limit typographic flexibility and prevent automated lineHeight calculations for custom text sizes.
<!-- /field -->

### REM-012

#### Action

<!-- field: remediation.REM-012.action -->
Create: Document error recovery and visual hierarchy patterns -- add error-to-resolved transition guidance, retry patterns, and visual hierarchy composition guidelines to the docs site.
<!-- /field -->

#### Value Framing

<!-- field: remediation.REM-012.value_framing -->
Without documented recovery and hierarchy patterns, each product team invents their own, producing inconsistent user experiences.
<!-- /field -->

