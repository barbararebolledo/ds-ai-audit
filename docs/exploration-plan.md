# Exploration plan: AI-readiness audit
# ds-ai-poc

This document is the release plan for the AI-readiness audit tool.
It covers the sequence from the current POC state to a client-ready,
agent-capable audit system.

Last updated: March 2026

---

## Vision

The target state is an auditing agent that runs continuously or on trigger
against a connected design system (Figma + code repository), maintains a
baseline score across ten dimensions, detects drift when changes are made,
surfaces findings in a structured format that other agents can consume, and
produces human-readable reports calibrated to audience (designer, developer,
system owner).

It knows the difference between a systemic problem and a one-off deviation.
It can be asked questions: "what changed since last week", "which components
are blocking AI readiness", "what is the minimum work required to reach a
passing score."

That is the north star. Every decision made before it is reached should be
reversible or extensible toward it.

---

## Test vehicles

| Phase | Vehicle | Rationale |
|---|---|---|
| Releases 1.3 -- 2.1 | Material UI (Figma community file + GitHub repo) | Public, well-documented, known gaps between Figma and code |
| Release 2.1 | Studio-built library | More realistic inconsistencies, closer to client conditions |
| Release 3.0+ | Client file (first engagement) | Adaptation sprint, not development sprint |

The client file is treated as an application of a tested script, not a
development context. The script is validated before any client work begins.

---

## Release sequence

---

### Release 1.3 -- Stable audit script

**Test vehicle:** Material UI
**Prompt version:** v1.3
**Question:** Can the script reliably audit a public Figma library via MCP
and REST API, produce a structurally stable JSON, and derive a markdown
report from it?

**Tasks:**

- Confirm the canonical Material UI Figma community file URL. Record in
  `decisions/003-material-ui-test-vehicle.md`.
- Locate and read `audit/schema/audit-schema.json` before writing any code.
  The schema drives the output structure -- do not invent structure.
- Implement the MCP / REST API split explicitly in script logic:
  MCP for component metadata, style metadata, and component descriptions;
  REST API for raw variable data with intact alias chains.
- Activate all ten dimensions. Text style variable binding and effect style
  coverage were missing from v1.2 -- both are now explicit dimensions.
- Add documentation quality as Dimension 10. Description field only for now.
  Documentation frame reader is deferred to Release 2.0.
- Run against the Material UI Figma file. Record what the script cannot
  reach, what times out, what returns unexpected data.
- Produce markdown from JSON only. Never write the markdown independently.
- Before running: read the Edenspiekermann `/audit-design-system` skill
  source for MCP query patterns. Time-box to one session. Record findings
  in `decisions/003-skills-edenspiekermann.md`.

**Deliverables:**
```
audit/mui/v1.3/mui_findings_v1.3.json
audit/mui/v1.3/mui_report_v1.3.md
prompts/audit-prompt.md
audit/schema/audit-schema.json       (already designed, confirm on disk)
```

---

### Release 1.4 -- Scoring and readiness recommendation

**Test vehicle:** Material UI
**Prompt version:** v1.4
**Question:** Can the audit make a defensible phase readiness recommendation,
not just list findings?

**Tasks:**

- Define scoring thresholds per dimension: what constitutes a blocker vs
  warning vs note. Document as a config, not hardcoded, so thresholds can
  be adjusted per client context.
- Add weighted scoring. Not all dimensions carry equal weight for AI
  readiness. Token implementation and alias chain integrity are higher weight
  than documentation quality at this stage. Document the weighting rationale.
- Add the phase readiness output: pass / conditional pass / not ready, with
  conditions made explicit.
- Test whether scoring surfaces the right things from Material UI findings.
  If it does not, adjust thresholds and re-run. Record both runs.
- Note dimensions where Material UI is artificially clean (it is a well-
  maintained public system) that will behave differently against a real
  client file.

**Deliverables:**
```
audit/mui/v1.4/mui_findings_v1.4.json
audit/mui/v1.4/mui_report_v1.4.md
prompts/audit-prompt.md
config/scoring-weights.json
```

---

### Release 2.0 -- Code-side integration and documentation frame reader

**Test vehicle:** Material UI (Figma + GitHub token JSON)
**Prompt version:** v2.0
**Question:** Can the audit cross the Figma / code boundary and read
documentation frames?

Two workstreams, both required for this release.

**Code-side diff:**

- Confirm the token format in the MUI GitHub repo. Likely under
  `packages/mui-system`. Record in `decisions/`.
- Before building: scan for existing open-source tools covering Style
  Dictionary or Token Studio output parsing. Do not build what exists.
- Read the Firebender `/sync-figma-token` skill source for diff logic
  structure. Time-box to one session. Record in `decisions/`.
- Build a cross-reference: for each Figma variable, find its code
  equivalent, compare resolved values, flag mismatches and missing entries
  in either direction.
- Add as an extension to Dimension 9 (governance) or as a named sub-
  dimension: token sync integrity (Figma vs code). Additive to schema --
  no breaking changes.

**Documentation frame reader:**

- Inspect the Material UI Figma community file for documentation frame
  conventions. What frames exist? What text layers? What naming convention?
- Define a minimal documentation frame schema: what the reader looks for
  (component name, description, usage guidance, do / don't examples,
  props or variant labels).
- Build the reader as a separate module. The audit script calls it if the
  component description field is empty or below threshold length.
- Score against documentation quality principles: functional language,
  intent explicit, not bloated, no redundancy with component structure.
- Document Material UI findings as a reference case. Note what a client
  file will likely do differently -- this becomes the client adaptation
  checklist.

**Deliverables:**
```
audit/mui/v2.0/mui_findings_v2.0.json
audit/mui/v2.0/mui_report_v2.0.md
prompts/audit-prompt.md
```

---

### Release 2.1 -- Studio library application

**Test vehicle:** Studio-built Figma library + code repo
**Prompt version:** v2.1
**Question:** Does the script hold against a real-world, less-maintained
system? What breaks?

**Tasks:**

- Run the v2.0 script against the studio file without modification first.
  Record every failure mode before making any adjustments.
- Adjust the reader for the studio file's documentation and variable
  conventions.
- Compare findings profile against Material UI. The studio file should
  surface more blockers -- if it does not, scoring thresholds may be too
  lenient.
- Identify which dimensions are most sensitive to file structure differences.
  These are the ones requiring the most adaptation work before any client
  sprint.

**Deliverables:**
```
audit/studio/v2.1/studio_findings_v2.1.json
audit/studio/v2.1/studio_report_v2.1.md
prompts/audit-prompt.md
decisions/XXX-studio-adaptation-notes.md
```

---

### Release 2.2 -- Repeatability and baseline diff

**Test vehicle:** Whichever surfaced more interesting findings in 2.1
**Prompt version:** v2.2
**Question:** Can the audit detect change over time?

**Tasks:**

- Add run metadata to JSON: timestamp, Figma named version or branch,
  script version, prompt version.
- Add diff mode: given two JSON outputs, produce a changelog. What improved,
  regressed, is new.
- Test by introducing a deliberate inconsistency into the test file, running
  the audit, reverting, running again, verifying the diff catches it.
- Storage convention:
  - `audit/baseline/` -- baseline run for comparison
  - `audit/latest/` -- most recent run
  - `audit/diffs/` -- diff reports between runs

**Deliverables:**
```
prompts/audit-prompt.md
audit/baseline/  (baseline JSON stored here)
audit/diffs/     (diff reports stored here)
```

---

### Release 3.0 -- Client adaptation sprint

**Test vehicle:** First client Figma files + code repository
**Prompt version:** v3.0-[clientname]
**Question:** Does the tested script produce valid findings against a real
client system, and what adaptation is required?

This is not a development sprint. The script is tested. The work is
adaptation and application.

**Tasks:**

- Inspect client file structure before running anything: variable collection
  naming, documentation frame conventions, component description coverage,
  code token format.
- Map client conventions to the audit schema. Document every gap or mismatch
  in `decisions/`.
- Adjust the documentation frame reader for the client's specific frame
  structure.
- Adjust the scoring config if the client context warrants different
  dimension weighting (banking context: accessibility and web-readiness
  likely higher weight).
- Run the audit. Produce the phase readiness recommendation.
- The client prompt is a variant of v2.2, not a replacement. Both are
  maintained.

**Deliverables:**
```
prompts/audit-prompt-[clientname].md
config/scoring-weights-[clientname].json
audit/[clientname]/v3.0/[client]_findings_v3.0.json
audit/[clientname]/v3.0/[client]_report_v3.0.md
decisions/XXX-[clientname]-adaptation-notes.md
```

---

### Decision point after Release 3.0: agent wrapper and plugin

With a tested, repeatable, client-applied script in place, the question of
whether to wrap the script in an agent or build a Figma plugin has real
evidence behind it.

The agent wrapper means Claude Code (or a similar agent runtime) can be
asked questions about the audit findings conversationally: "what are the
blockers", "what changed since last run", "what is the minimum work for
phase 2 readiness."

The plugin question is whether the script workflow is usable by a client
design team without a developer present. If not, a plugin becomes necessary.
That decision requires evidence from Release 3.0 -- specifically, how much
friction the client experienced running the script.

Do not build either until this decision point is reached with evidence.

---

## Prompt versioning convention

The audit prompt lives at `prompts/audit-prompt.md`. Each release is
marked with a git tag. The prompt file contains:
- The prompt itself
- A changelog section (what changed from the previous version and why)
- A reference to the audit output it produced
- The schema version it targets (noted at the top)

The prompt evolves in place. Git tags and history preserve earlier
versions. Client-specific variants are separate files:
`prompts/audit-prompt-[clientname].md`.

---

## What this plan is not doing

- Automated remediation (findings are flagged and recommended, not fixed,
  through all releases in this plan)
- Figma plugin development (deferred to the Release 3.0 decision point)
- Component code generation (Phase 2 capability, not in current arc)
- Writing to Figma canvas (read-only throughout)
