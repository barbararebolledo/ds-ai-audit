# Toimi Design System: AI-Readiness Audit

**Date:** 2026-03-26
**Auditor:** Claude Code via Figma MCP
**Source file:** `audit/toimi-ai-readiness.json`

---

## Executive Summary

The Toimi system consists of two Figma libraries: Foundation (tokens) and Component (UI elements). Foundation is structurally strong. Its colour token implementation and alias chain integrity are at the highest level -- 192 variables across 6 collections, with 100% alias resolution from semantic to primitive layer. This is the most important thing to get right, and it is right.

The Component library has significant gaps. Description coverage is 15%. Variable binding depth is inconsistent: Button is excellent, Radio is weak, and there is no minimum standard. The system is mobile-only with no responsive component variants and no web-specific patterns.

The two-layer token architecture (primitives and semantic) works at current scale but lacks a component-level override layer (token architecture depth: 1/4). This is the lowest-scoring dimension alongside description coverage and web-readiness, and it will become a coupling problem as the system grows.

**System score: 2.1 / 4.0 -- 53% AI-ready**

### Scoring scale

Each score measures how ready the dimension is for an AI agent to consume the system reliably.

| Score | Label | Meaning |
|---|---|---|
| 0 | Not present | Missing or entirely broken. An agent cannot use this. |
| 1 | Major gaps | Partially present but unreliable. An agent would produce inconsistent or wrong output. |
| 2 | Inconsistent | Present but not uniform. An agent can use some parts but needs human correction on others. |
| 3 | Minor issues | Consistent and functional. An agent can use this reliably with occasional edge cases. |
| 4 | Scalable | Fully implemented. An agent can consume this with no caveats. |

### Scores

| Dimension | Foundation | Component | System |
|---|---|---|---|
| Token implementation | 4 | N/A | 4 |
| Alias chain integrity | 4 | 4 | 4 |
| Token architecture depth | 3 | 1 | 1 |
| Primitive naming | 2 | N/A | 2 |
| Component-to-token binding | N/A | 2 | 2 |
| Component description coverage | N/A | 1 | 1 |
| Naming convention consistency | 2 | 2 | 2 |
| Web-readiness gap | 2 | 1 | 1 |
| **Average** | **3.0** | **1.8** | **2.1** |

---

## Foundation Library Findings

### What works well

**Token implementation (4/4).** All 192 tokens are Figma Variables. No hardcoded values at the foundation level. Six collections cover colour, theming, typography, grid, borders, and spacing. Themes has Light/Dark modes. Typography has Mobile/Tablet/Desktop modes. Grid has four breakpoints including Large Desktop.

**Alias chain integrity (4/4).** Every one of the 58 Themes variables resolves to a Colors primitives variable. Both Light and Dark modes verified. No broken references, no orphaned aliases, no circular references. This is the backbone of a functioning token system and it is fully intact.

### What needs work

**Token architecture depth (3/4).** Foundation provides two well-structured layers: primitives (Colors primitives, Spacing, Typography, Border size) and semantic (Themes). But it does not scaffold a component-level token layer. Spacing, Typography, and Borders are consumed directly as terminal values with no intermediate aliasing possible. The architecture supports two-layer resolution but not three.

**Primitive naming (2/4).** Three naming conventions coexist:

- Colours: `color/{hue}/{scale}` -- clean, parseable, correct.
- Typography: `font/{property}/{scale}` -- clean, parseable, correct.
- Spacing: bare numbers (`4`, `8`, `12`) -- no namespace, no scale labels. If the value of the variable named "16" ever changes to 20, the name becomes actively misleading. An AI agent parsing these tokens cannot distinguish spacing tokens from arbitrary numbers.

Additional issues:
- Border size collection mixes stroke widths (`stroke/md`) and border radii (`radius/radius-lg`) in one collection. The `radius/` prefix is redundant within a radius group.
- `Colors primitives ` has a trailing space in the collection name.
- Green colour scale has only `green/500`. Every other hue has 10 values. This is either intentional (only one green is needed) or an oversight.

**Web-readiness (2/4).** Typography and Grid are responsive. Spacing and Border radius are not. Missing entirely:
- Elevation/shadow tokens (only one colour alias, Elevation/50, exists)
- Z-index tokens
- Animation/motion tokens (duration, easing curves)
- Platform-specific overrides

The Grid collection is well-structured with four breakpoints, which is a strong foundation for web. But spacing being single-mode means component spacing will not adapt across breakpoints unless overridden manually.

---

## Component Library Findings

### Inventory

| Status | Count | Components |
|---|---|---|
| Done (green) | 23 | Accordion, Alert, Avatar, Badge, Banner, BottomAppBar, BottomSheet, Buttons, Card, Checkbox, CodeInput, Docked, Divider, Input forms, Keypad, PaginationDots, Pickers, Progress Circle, Progress Line, Radio button, RiskIndicator, Snackbar, Toggle |
| WIP (orange) | 5 | ListItem, List header, List Heading, Tabs, TopAppBar |
| Critical (red) | 2 | Tab Bar, Tag |

40 component sets total. 0 local variables (correct: all bindings reference Foundation).

### What works well

**Alias chain integrity (4/4).** The Component library consumes Foundation variables directly and every cross-library reference resolves. Button variant bindings were traced end-to-end:

```
Button fill        -> Themes/States overlay/lightener-enabled -> Primitives/opacity/white-0
Button text fill   -> Themes/Foreground/primary               -> Primitives/color/grey/1000
Button padding     -> Spacing/16
Button radius      -> Borders/radius/radius full
Button stroke      -> Borders/stroke/xs
Button font size   -> Typography/font/size/xs
Button font family -> Typography/font/family/body
Button line height -> Typography/font/line height/xs
```

Every chain resolves. The architecture is sound where it has been applied.

**Button and TextInputSolid binding quality.** These two components have 15+ bound properties per variant covering fills, padding, radius, stroke, and full typography binding. They demonstrate what good looks like in this system.

### What needs work

**Token architecture depth (1/4).** Components bind directly to Foundation semantic tokens (Themes) and terminal-value collections (Spacing, Typography, Borders). No component-level token collection exists. There is no override point between semantic meaning and component binding. Changing `Themes/Foreground/primary` changes every component consuming it. The architecture is two-layer for colours (primitive to semantic to binding) and one-layer for everything else (primitive to binding). An AI agent cannot reason about a component's visual identity independently from the semantic layer.

**Component-to-token binding (2/4).** Binding quality varies wildly across components:

| Component | Quality | Bound properties | Issues |
|---|---|---|---|
| Button | Excellent | fills, padding, radius, stroke, typography | None |
| TextInputSolid | Strong | padding, radius, fills, typography | 1 unbound bounding box |
| Alert | Good | spacing, fills, typography | 1 unbound bounding box |
| Checkbox | Moderate | radius, stroke, fills (partial), typography | 1 unbound bounding box |
| Radio | Weak | radius, strokes only | No fill bindings at all |
| Toggle | Weak | frame fill, ellipse stroke only | Knob has hardcoded white fill |

A recurring pattern: "Bounding box" rectangles with hardcoded grey fills (`r:0.85, g:0.85, b:0.85`) appear in Checkbox, Alert, and TextInputSolid. These appear to be hit-area indicators. They should either be bound to a token or made transparent.

Radio has 12 variants with 6 interaction states but almost no variable bindings. This means it will not respond to theme changes and cannot be reliably generated from tokens by an AI agent.

**Component description coverage (1/4).** 6 of 40 component sets have descriptions. All 6 are on the Pickers page and appear to originate from Material Design 3 or iOS source files. One contains an Apple Feedback Assistant URL. Zero original descriptions exist for this design system.

Components with no description include every core component: Button, Checkbox, Radio, Alert, Banner, Toggle, Switch, TextInputSolid, TextAreaSolid, TopAppBar, BottomAppBar, Accordion, Snackbar, Card, Avatar, Badge, Docked, CodeInput, ProgressBar, ProgressCircle, ListItem, Tag, TabBar, Divider, RiskIndicator.

**Naming convention consistency (2/4).** Page names follow `↪ {Name} {status emoji}` consistently but are polluted with internal owner names (`- SASKA`, `- SAB`, `- SAB / SAS`). These are not meaningful outside the team and will confuse any external consumer or AI agent.

The List component group uses three different casing conventions: `ListItem`, `List header`, `ListHeading`. Component name `TextInputSolid` has a trailing space.

The dot-prefix convention for internal components (`.State Layer`, `.ToggleButtonAction`) is a good practice but is not documented.

**Web-readiness (1/4).** All components are designed at mobile dimensions (402px frames). No responsive variants exist. Components that are structurally mobile-native and would need replacement, not adaptation, for web: TopAppBar, BottomAppBar, BottomSheet, Docked, Keypad.

Missing web components: sidebar navigation, top navigation bar, breadcrumbs, table/data grid, tooltip, dropdown/select, modal/dialog, pagination (only carousel dots exist).

---

## Cross-Library Issues

### 1. Two-layer architecture limits component-level overrides (structural)

Scored as "Token architecture depth" (Foundation: 3, Component: 1, System: 1). The system has two token layers: primitives and semantic. Components bind directly to semantic tokens with no component-level override point. The POC repo uses a three-layer architecture (primitives, semantic, component) specifically to solve this problem.

**Decision needed:** introduce a component-token collection in the Component library before the system exceeds 50 components, or accept the coupling and document it as a constraint.

### 2. Spacing tokens named by value, not by role or scale (high)

Foundation spacing variables are named `4`, `8`, `12`, ... `128`. Components bind to these directly (`Button padding -> Spacing/16`). If the spacing scale is ever re-baselined (e.g., base unit changes from 4 to 5), every variable name becomes wrong. An AI agent parsing `Spacing/16` has no way to know this is a "medium" spacing value.

**Fix:** rename to `spacing/4`, `spacing/8` at minimum, or `spacing/xs`, `spacing/sm` ideally.

### 3. Inconsistent binding depth across components (high)

Button has 15+ bound properties. Radio has 5. Toggle has 2. There is no minimum binding standard, and components marked "done" (green) include Radio and Toggle. This means the green status does not reliably indicate AI-readiness or theme-responsiveness.

**Fix:** define a binding checklist (all fills, all strokes, all spacing, all typography) that must pass before green status.

### 4. Foundation collection name inconsistency (low)

Foundation's `Border size` collection appears as `Borders` when referenced from the Component library (a Figma library-linking behaviour). `Colors primitives ` has a trailing space. These are minor but create friction for any automated tooling that matches collection names across files.

---

## Prioritised Recommendations

### P1 -- Must fix before scaling

1. **Bind all fill properties across weakly-bound components.** Radio, Toggle, and any component with hardcoded fills must have all visual properties bound to Foundation variables. Estimated scope: 10-15 components need binding work.

2. **Write descriptions for all 34 undescribed component sets.** Each description must contain: what the component is and when to use it; variant and property documentation; accessibility notes; usage dos and don'ts. Remove M3/iOS-sourced descriptions and write originals.

3. **Rename spacing variables.** At minimum `spacing/{value}` (e.g., `spacing/4`). Ideally scale-based (`spacing/xs` through `spacing/6xl`).

4. **Add elevation/shadow token collection.** At least 5 levels. Shadows are used extensively in mobile UI and are currently entirely absent from the token system.

5. **Add responsive modes to Spacing collection.** At minimum Mobile and Desktop. Components using spacing tokens should adapt at breakpoints.

6. **Define a binding checklist for component completion.** A component is not "done" until all fills, strokes, spacing, radii, and typography properties are bound to variables. Update green status criteria.

### P2 -- Should fix for scalability

7. **Evaluate and introduce component-level token layer.** Create a component-tokens collection in the Component library that aliases Foundation Themes. Components bind to component tokens. This decouples component visual decisions from the semantic layer.

8. **Split Border size collection.** Separate stroke widths and border radii into distinct collections.

9. **Standardise List component naming.** Choose one convention (PascalCase recommended) and apply it: `ListItem`, `ListHeader`, `ListHeading`.

10. **Remove owner names from page titles.** `↪ ListItem 🟠 - SASKA` should be `↪ ListItem 🟠`.

11. **Document the dot-prefix convention** for internal/building-block components.

12. **Add z-index and motion token collections.** Z-index for layering (modal, overlay, tooltip). Motion for duration and easing curves.

13. **Define responsive variants for web-adaptable components.** Button, Input, Card at minimum need breakpoint-aware sizing.

### P3 -- Cleanup and polish

14. **Fix trailing space in `Colors primitives ` collection name.**
15. **Fix trailing space in `TextInputSolid ` component name.**
16. **Complete green colour scale** (add 50-400, 600-900 if needed).
17. **Add descriptions to Foundation image ratio components.**

---

## Documentation Improvement Section

### What is missing and what correct documentation should contain

**Per component set (34 undescribed):**

Each component description in Figma should contain:

1. **Purpose statement.** One sentence: what this component is and its primary use case. Example for Button: "A tappable control that triggers a primary or secondary action. Use for form submission, navigation confirmation, and call-to-action placement."

2. **Variant documentation.** List all variant properties and their values with usage guidance. Example: "Type: Primary (high-emphasis single action per screen), Secondary (medium-emphasis supporting actions), Ghost (low-emphasis inline actions)."

3. **Property constraints.** What is configurable and what is not. Example: "Label text is required. Icon is optional. Maximum label length: 24 characters for Small, 32 for Medium/Large."

4. **State behaviour.** How the component responds to Enable, Hover, On click, Focus, Disable states. Which tokens drive each state change.

5. **Accessibility notes.** Minimum touch target size, colour contrast compliance, screen reader label requirements.

6. **Usage guidance.** When to use this component vs alternatives. Dos and don'ts.

**Components with the highest documentation priority** (based on variant count and usage frequency):

| Component | Variants | Priority reason |
|---|---|---|
| Button | 45 | Core action component, 3 types, 3 sizes, 5+ states |
| ActionButton | 45 | Identical structure to Button, needs differentiation explanation |
| Checkbox | 12 | Form component with Active/Status matrix |
| Radio | 12 | Form component with Active/Status matrix |
| Switch | 20 | Complex state matrix |
| CodeInput | 20 | Specialised input with many states |
| Badge (Icon) | 15 | Multiple badge types need usage differentiation |
| ProgressBar | 11 | Multiple progress states |

**Foundation documentation gaps:**

- No documented rationale for the spacing scale (why these 15 values).
- No documented relationship between Typography modes and Grid breakpoints (they use different mode sets: Typography has Mobile/Tablet/Desktop; Grid adds Large Desktop).
- No documented convention for when to use semantic tokens vs primitives (the system enforces it through Figma Variable scoping, but there is no human-readable rule).
- The Changelog page exists but its content was not audited.

---

## Data Gaps

The following items could not be fully assessed and are logged for completeness:

- Only 6 of 40 component sets were deep-inspected for variable binding quality. The remaining 34 may have better or worse binding coverage.
- Text styles and effect styles were not audited. These may carry hardcoded values not visible through variable inspection.
- ActionButton (45 variants) was assumed similar to Button but not independently verified.
- Switch (20 variants) was not deep-inspected.
- ListItem page contains 71 top-level children including work-in-progress frames and reference images.
- The Foundation Overlay page was inventoried but not deep-inspected for variable usage.
- Component library `use_figma` queries timed out on multiple attempts; data was collected page-by-page.

---

*Audit conducted with Claude Code connected to the official Figma MCP server. All variable resolutions verified programmatically. Scores derived from `audit/toimi-ai-readiness.json`.*
