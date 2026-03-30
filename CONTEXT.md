# Context

## What this practice is building toward

The hypothesis is that design systems can be made machine-readable enough that AI agents produce reliable, reviewable output from them. Not perfect output, but output with a known quality level that correlates to measurable properties of the system. If a system scores 4/4 on token implementation and 1/4 on component descriptions, an agent working with it will resolve colours correctly but generate incorrect usage guidance. The audit is the measurement tool that makes this correlation visible. The goal is a repeatable methodology that Accenture Song can apply to any client design system to determine its AI-readiness and prioritise remediation.

## What exists in this repo

The **three-layer token system** (system/tokens/) demonstrates the architecture that makes a design system machine-readable: primitives hold raw values, semantic tokens alias primitives by role, component tokens alias semantic tokens by component property and state. Alias chains must remain unbroken. This architecture was built from scratch for the POC.

The **Button POC** (system/contracts/button.contract.json, system/docs/button.md) is a single component implemented against the three-layer architecture with all properties bound to Figma Variables. It proves that a component defined this way can be fully resolved from tokens by an AI agent without human intervention.

The **component contract format** (system/contracts/) defines the schema for describing a component's properties, variants, states, and token bindings in JSON. It is the interface between Figma (where the component lives) and the agent (which reads the contract to understand how to use it).

The **audit structure** (audit/toimi/) contains versioned AI-readiness assessments of the Toimi Foundation and Component libraries. Each version has a JSON source of truth and a Markdown summary derived from it. Audits are organised by library and version (v1.0, v1.2).

The **decisions directory** (decisions/) records architecture decision records for the audit methodology and its evolution.

## Open questions

Whether audit scores correlate to remediation success over time has not been tested. v1.0 is a baseline. If scores improve after remediation and agent output quality improves correspondingly, the methodology is validated. If scores improve but output quality does not, the dimensions are wrong.

Whether the current eight dimensions (plus governance as the ninth) are the right ones is an open question. Future audits against different design systems may surface gaps that require new dimensions or reveal that existing ones overlap.

Whether Figma-to-code synchronisation checks are feasible at scale with the current MCP tooling is unproven. The v1.0 audit hit timeout limits on full-file queries and required page-by-page workarounds. A mature system with hundreds of components may require a different tooling approach.

## Session update — March 2026

### Reorientation: from POC script to auditing agent

The tool has been reoriented around a clearer target state. The four-phase sequence
is: Audit (Phase 1), MVP (Phase 2), Beta (Phase 3), Stable (Phase 4). Phase 4 is the
vision: multiple agents active, the system learns, designers define intent. Every
decision made now should be reversible or extensible toward it.

The audit tool is now explicitly client-agnostic. To apply it to a specific client,
duplicate the repo and create client-specific prompt and config variants. The core
script, schema, and dimensions are not modified for client needs.

### Dimensions expanded to ten

A tenth dimension has been added: documentation quality and intent coverage. It scores
whether component documentation captures functional intent rather than visual
description. It reads from the component description field first; falls back to
documentation frames if the description is absent or thin. This dimension is also an
AI-readiness signal because bloated or low-intent documentation pollutes RAG retrieval
in Phase 3.

The full ten dimensions are defined in CLAUDE.md as the stable reference. Prompt files
reference them rather than redefining them.

### Test vehicle change

The Toimi library served as the initial POC test vehicle. From Release 1.3 onward the
primary test vehicle is Material UI (Figma community file + GitHub repository). It is
a well-documented public system with known gaps between the Figma and code
representations -- good for stress-testing the diff logic. A studio-built library
follows in Release 2.1 for a more realistic real-world test.

### Findings must reference contract fields

Every finding in the audit JSON must reference which contract field it relates to:
token definition, component contract, documentation contract, or governance rule.
This is required for future codegen pipeline compatibility. The finding structure was
designed in the schema session and written to disk as audit-schema.json (originally audit-schema_v1.3.json).

### JSON schema is the continuity layer

The audit JSON schema (audit/schema/audit-schema.json) is the continuity layer across
all releases. Additive changes only after v1.3. Every release produces a versioned
prompt file committed alongside the findings it produced. The prompt version is
recorded in the audit JSON.

### What the audit is not doing yet

The script does not write to Figma, does not automate remediation, does not run as a
continuous agent, and does not build a Figma plugin. These are Phase 2 and later
capabilities. The plugin question is assessed at Release 3.0 with evidence.

### Open questions carried forward

The eight questions from the original open questions section remain open. Additional
open items from the skills review and gap analysis are tracked in decisions/ as
numbered ADR files. Key items pending: reading the Edenspiekermann audit-design-system
skill source, reading the Firebender sync-figma-token skill source, confirming the
Material UI Figma community file URL, confirming the MUI code token format, and
aligning the schema with the colleague working on the write side of the POC.