# 004 — Audit dimensions updated to v1.4

Status: closed
Date: 2026-03-30

## Decision

The audit dimensions are updated from ten to eleven, effective Release 1.4.
The changes are based on findings from the Material UI v1.3 audit and a
review of the dimension set for client-agnostic applicability.

## Changes

**Dimension 8 renamed:** web-readiness gap → platform-readiness gap.
Platform-specific checks (ARIA roles for web, accessibility labels for
mobile) are now configured in the client scoring config, not hardcoded
into the core dimension. The core question remains: does the Figma file
carry the metadata the target platform needs?

**Dimension 11 added:** accessibility intent coverage. Scores structural
accessibility signals in the Figma file: focus state variants, touch
target sizes, contrast derivability from the token alias chain, keyboard
navigation documentation, and accessibility mentions in descriptions.
Scoped to what is auditable from the file -- runtime compliance deferred
to a later phase.

**Dimension 5 clarified:** component-to-token binding now explicitly
requires MCP spot-checks on a sample of components alongside the REST API
data. The REST API alone cannot confirm node-level bindings.

**Dimensions 6 and 10 boundary sharpened:** Dimension 6 scores coverage
(does intent exist?). Dimension 10 scores quality (is the documentation
well-structured and useful to an agent?). These are distinct questions
and should not overlap in scoring.

## Rationale

Web-readiness was too narrow for a client-agnostic tool -- a mobile
library does not have ARIA roles and should not be penalised for their
absence. Platform-readiness generalises the question correctly.

Accessibility intent is genuinely separate from platform-readiness.
A component can pass platform-readiness (ARIA role present) and fail
accessibility intent (no focus state defined, no keyboard navigation
documented). The MUI audit confirmed this gap was invisible in the
previous dimension set.

## Evidence

Material UI v1.3 audit findings:
- No focus state variants found in component inventory
- Colour contrast not derivable from token alias chain without
  component-level token layer (blocked by TA-001)
- Zero accessibility mentions in any component description

## Impact

Prompt v1.3 covers ten dimensions. Prompt v1.4 must cover eleven.
Schema v1.3 is additive-only -- Dimension 11 is added as a new entry
in the dimensions array, no breaking changes.
Scoring weights config must be updated to include Dimension 11.