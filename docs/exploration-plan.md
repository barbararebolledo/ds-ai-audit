# Exploration plan: AI-readiness audit
# ds-ai-poc

This document is the release plan for the AI-readiness audit tool.
It covers the sequence from the current state to a client-ready,
agent-capable audit system.

Last updated: April 2026

---

## Vision

The target state is an auditing agent that runs continuously or on trigger
against a connected design system (Figma + code repository), maintains a
baseline score across seven clusters and 44 dimensions, detects drift when
changes are made, surfaces findings in a structured format that other agents
can consume, and produces human-readable reports calibrated to audience
(designer, developer, system owner).

It knows the difference between a systemic problem and a one-off deviation.
It can be asked questions: "what changed since last week", "which components
are blocking AI readiness", "what is the minimum work required to reach a
passing score."

The agent starts as a one-off audit script, becomes an ongoing QA process,
and eventually splits into two tracks: intent QA (does the system explain
itself?) and structure QA (is the system well-built?). The split happens
when the methodology is mature enough to support specialised agents with
distinct knowledge bases.

That is the north star. Every decision made before it is reached should be
reversible or extensible toward it.

---

## Two tracks

This plan covers the **audit project** only. A separate thinking track
(intent hypothesis, knowledge layer, positioning) lives outside this repo
in Obsidian (Claude Vault). The two tracks share one bridge: the knowledge
layer work, which grounds the audit's scoring criteria in existing
frameworks. The knowledge layer is started here (test dimension, reading
list, mini knowledge layer sketch) and continued in the thinking track.

---

## Test vehicles

| Phase | Vehicle | Rationale |
|---|---|---|
| Releases 1.3 -- 2.1 | Material UI (Figma community file + GitHub repo) | Public, well-documented, known gaps between Figma and code |
| Release 2.2 | Studio-built library or client library (TBC) | More realistic inconsistencies, closer to client conditions |
| Release 3.0+ | Client file (first engagement) | Adaptation sprint, not development sprint |

The client file is treated as an application of a tested script, not a
development context. The script is validated before any client work begins.

---

## Release sequence

---

### Release 1.3 -- Stable audit script ✅ COMPLETE

**Test vehicle:** Material UI
**Result:** 44.3/100 not ready. Four blockers identified.

Stable audit script. Ten dimensions. REST API primary source. MCP for
spot-checks. Schema designed. Key finding: 96.2% of existing MUI
descriptions are code snippets, not functional intent.

---

### Release 1.4 -- Scoring and readiness recommendation ✅ COMPLETE

**Test vehicle:** Material UI
**Result:** Scoring methodology formalised.

Two-layer scoring system (sub-checks 0-4, dimension scores 0-100). Tiered
weights based on MUI v1.3 evidence. Phase readiness logic. Eleven
dimensions. Override rule: any sub-check at 0 forces blocker.

---

### Release 2.0 -- Code-side integration and documentation frame reader ✅ COMPLETE

**Test vehicle:** Material UI (Figma + GitHub)
**Result:** 55.3/100 not ready. 10 blockers. 7 clusters, 44 dimensions.

Token diff scripts, documentation frame reader, restructured audit from
flat dimensions to seven clusters. Design-to-code parity cluster added.
Score increase from 44.3 to 55.3 reflects broader measurement, not
system improvement.

---

### Release 2.1 -- Schema iteration and efficiency ✅ COMPLETE

**Test vehicle:** Material UI
**Result:** 55.3/100 (zero drift from v2.0). All v2.1 fields validated.

Four workstreams completed:

1. Schema aligned with v2.0 cluster-based reality. Remediation section,
   severity_rank, cluster_summary, mandatory recommendations.
2. Dimension 3.3 scored against six-level documentation hierarchy.
   Patterns as first-class audit targets. Cluster 4 renamed to
   "Design Quality Baseline."
3. Two-phase audit: Phase 1 (discovery) determines evidence availability,
   Phase 2 (targeted scoring) skips dimensions without evidence.
4. Token reduction: response filtering, get_variable_defs preference,
   pre-compute cache pattern. 95% MCP payload reduction.

---

### Release 2.2 -- Front-end and knowledge layer

**Test vehicle:** Material UI (existing v2.1 audit output as sample data)
**Question:** Can the audit results be consumed by a front end and by
agents grounded in a knowledge layer?

Two workstreams running in parallel.

**Front-end schema and information architecture:**

- Draft front-end schema and information architecture in Claude session.
  Define what the front end displays: cluster overview, dimension drill-down,
  finding list with severity sorting, remediation roadmap, score comparison.
- Iterate with Konsta on the IA. Apply changes and close the first draft.
- Konsta builds the front-end visualisation layer consuming the v2.1 audit
  JSON directly. No markdown rendering. JSON is the source of truth.
- The v2.1 schema is stable for front-end purposes. Scoring criteria may
  evolve underneath but the structural contract (clusters, dimensions,
  findings, remediation) does not change.

**Knowledge layer (bridge to thinking track):**

- Pick one test dimension (likely 3.3 intent quality) and sketch a mini
  knowledge layer around it: which existing frameworks apply, how they
  connect to the scoring criteria, what the audit measures versus what
  the frameworks describe.
- Produce a reading list of existing frameworks on: intent (design, product,
  UX, screenwriting), design system quality, component governance.
- The mini knowledge layer proves the structure works. Once validated,
  scale to other dimensions in the thinking track.
- This work starts here (grounded in the audit methodology) and continues
  in Obsidian (Claude Vault) for the intellectual development.

**Deliverables:**
```
Front-end IA document (format TBC)
Front-end schema (for Konsta)
Knowledge layer test dimension sketch
Reading list
```

---

### Release 2.3 -- Studio or client library stress test

**Test vehicle:** Studio-built library or first available client library
**Question:** Does the script hold against a real-world, less-maintained
system? What breaks?

This release is blocked on securing a test case. Work continues on other
releases in the meantime.

**Tasks:**

- Run the v2.1 audit against the target file without modification first.
  Record every failure mode before making any adjustments.
- Adjust the documentation frame reader for the target file's conventions.
- Compare findings profile against Material UI. The target file should
  surface more blockers. If it does not, scoring thresholds may be too
  lenient.
- Identify which dimensions are most sensitive to file structure
  differences. These are the ones requiring the most adaptation work
  before any client sprint.
- Test the two-phase discovery skip logic against a file with different
  characteristics (fewer components, no variables, no code repo).

**Deliverables:**
```
audit/[vehicle]/v2.3/[vehicle]_audit_v2.3.json
audit/[vehicle]/v2.3/[vehicle]_audit_v2.3.md
decisions/XXX-[vehicle]-adaptation-notes.md
```

---

### Release 2.4 -- Methodology refinement

**Question:** What needs to change in the scoring methodology before
client application?

This is the release for ideas and refinements that emerge from the
knowledge layer work, the front-end IA process, and the stress test.

**Possible tasks (to be confirmed):**

- Weighted scoring within the six-level documentation hierarchy (some
  levels worth more than others) versus binary presence scoring.
- Scoring weights config restructured to match cluster-based dimensions.
- Knowledge layer findings applied to scoring criteria.
- Any schema changes required by front-end IA decisions.
- Pre-compute cache staleness detection (automated Figma file version
  comparison).

**Deliverables:**
```
Updated scoring criteria (config/scoring-weights.json)
Updated schema if needed (audit/schema/audit-schema.json)
Decision records for methodology changes
```

---

### Release 2.5 -- Repeatability and baseline diff

**Test vehicle:** Whichever surfaced more interesting findings in 2.3
**Question:** Can the audit detect change over time?

**Tasks:**

- Add diff mode: given two JSON outputs, produce a changelog. What
  improved, regressed, is new.
- Test by introducing a deliberate inconsistency into the test file,
  running the audit, reverting, running again, verifying the diff
  catches it.
- Storage convention:
  - `audit/baseline/` -- baseline run for comparison
  - `audit/latest/` -- most recent run
  - `audit/diffs/` -- diff reports between runs

**Deliverables:**
```
Diff logic (script or prompt extension)
audit/baseline/  (baseline JSON stored here)
audit/diffs/     (diff reports stored here)
```

---

### Release 3.0 -- First client application

**Test vehicle:** First client Figma files + code repository
**Question:** Does the tested script produce valid findings against a real
client system, and what adaptation is required?

This is not a development sprint. The script is tested. The work is
adaptation and application.

**Tasks:**

- Inspect client file structure before running anything: variable
  collection naming, documentation frame conventions, component
  description coverage, code token format.
- Map client conventions to the audit schema. Document every gap or
  mismatch in `decisions/`.
- Adjust the documentation frame reader for the client's specific
  frame structure.
- Adjust the scoring config if the client context warrants different
  dimension weighting.
- Configure platform-specific thresholds for Cluster 4 dimensions
  (interaction targets, contrast ratios, focus states) in the client
  scoring config.
- Run the audit. Produce the phase readiness recommendation.
- The client prompt is a variant, not a replacement. Both are maintained.

**Deliverables:**
```
prompts/audit-prompt-[clientname].md
config/scoring-weights-[clientname].json
audit/[clientname]/v3.0/[client]_audit_v3.0.json
audit/[clientname]/v3.0/[client]_audit_v3.0.md
decisions/XXX-[clientname]-adaptation-notes.md
```

---

### Milestone: Agent wrapper decision point (post Release 3.0)

With a tested, repeatable, client-applied script in place, the question of
whether to wrap the script in an agent or build a Figma plugin has real
evidence behind it.

**Agent wrapper:** Claude Code (or a similar agent runtime) can be asked
questions about the audit findings conversationally: "what are the
blockers", "what changed since last run", "what is the minimum work for
passing." The agent reads the audit JSON and the knowledge layer. It does
not re-run the audit on every question. It reasons over existing findings.

**Ongoing QA agent:** The audit moves from one-off runs to continuous
monitoring. The agent watches for Figma file changes (via webhooks or
polling), re-runs affected dimensions, and surfaces regressions. This
requires the baseline diff capability from Release 2.5.

**Intent QA / Structure QA split:** When the methodology is mature enough,
the single audit agent splits into two specialised agents. Intent QA
focuses on Cluster 3 (documentation and intent) with the knowledge layer
as its grounding. Structure QA focuses on Clusters 1, 2, and 4 (tokens,
components, design quality) with the scoring criteria as its grounding.
The split happens when running both in a single pass produces too much
noise or when clients need one but not the other.

**Figma plugin:** Whether the script workflow is usable by a client design
team without a developer present. If not, a plugin becomes necessary.
That decision requires evidence from Release 3.0 -- specifically, how much
friction the client experienced running the script.

Do not build any of these until the decision point is reached with evidence.

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
- Figma plugin development (deferred to the agent wrapper decision point)
- Component code generation (Phase 2 capability, not in current arc)
- Writing to Figma canvas (read-only throughout)
- Intent hypothesis development (separate track in Obsidian)
