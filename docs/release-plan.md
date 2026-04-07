# Release plan: AI-readiness audit
# ds-ai-audit

This document is the release plan for the AI-readiness audit tool.
It covers the sequence from the current state to a client-ready,
agent-capable audit system.

Last updated: April 2026

---

## Vision

The target state is an auditing agent that runs continuously or on trigger
against a connected design system (Figma + code repository), maintains a
baseline score across seven clusters and 56 dimensions, detects drift when
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

| Phase | Vehicle | Evidence sources | Rationale |
|---|---|---|---|
| Releases 1.3--2.1 | Material UI | Figma community file + GitHub repo | Public, well-documented, known gaps between Figma and code |
| Release 2.2 | Material UI (re-run) | Figma community file + GitHub repo | Fresh audit against updated schema; produces clean baseline for comparison |
| Release 2.2 | Carbon Design System v11 | Figma community file + GitHub repo | Second benchmark audit confirmed. Carbon scores 62.5/100 vs MUI 55.3/100. Scripts refactored to be system-agnostic. |
| Release 2.3 | Public design system with Storybook | Figma + Storybook (no source repo) | Stress test against a less-maintained system; tests Storybook as evidence source |
| Release 2.3 fallback | Nordea | Client Figma + code | If no public system is found, Nordea serves as both stress test and first client application |
| Release 3.0 | Nordea | Client Figma + code | First client engagement. Adaptation sprint, not development sprint |

The client file is treated as an application of a tested script, not a
development context. The script is validated before any client work begins.

---

## Release sequence

---

### Release 1.3 -- Stable audit script ✅

**Test vehicle:** Material UI
**Result:** 44.3/100 not ready. Four blockers identified.

Stable audit script. Ten dimensions. REST API primary source. MCP for
spot-checks. Schema designed. Key finding: 96.2% of existing MUI
descriptions are code snippets, not functional intent.

---

### Release 1.4 -- Scoring and readiness recommendation ✅

**Test vehicle:** Material UI
**Result:** Scoring methodology formalised.

Two-layer scoring system (sub-checks 0-4, dimension scores 0-100). Tiered
weights based on MUI v1.3 evidence. Phase readiness logic. Eleven
dimensions. Override rule: any sub-check at 0 forces blocker.

---

### Release 2.0 -- Code-side integration and documentation frame reader ✅

**Test vehicle:** Material UI (Figma + GitHub)
**Result:** 55.3/100 not ready. 10 blockers. 7 clusters, 56 dimensions.

Token diff scripts, documentation frame reader, restructured audit from
flat dimensions to seven clusters. Design-to-code parity cluster added.
Score increase from 44.3 to 55.3 reflects broader measurement, not
system improvement.

---

### Release 2.1 -- Schema iteration and efficiency ✅

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

### Release 2.2 -- Front-end, impact model, benchmark data, and research

**Test vehicle:** Material UI (re-run) + benchmark system (Carbon or Ant Design)

This release has four parallel workstreams. The schema updates come first
because everything else depends on them.

#### Workstream 1: Schema updates

Decisions have been made since v2.2-schema that are not yet reflected in
the audit schema or supporting data structures. These need to be
implemented before the audit re-run or the front-end build.

**Audit schema (audit-schema.json):**

- Add `value_framing` (optional string) to RemediationItem. One to two
  sentences explaining the operational consequence of not fixing this
  item. Editorial content, not formulaic.
- Add `impact_categories` (optional array of enum) to RemediationItem.
  Values: `correction_cycles`, `theme_rework`, `parity_defects`,
  `token_efficiency`. Connects remediation items to the impact
  calculator in the front-end.
- Review whether any other fields are needed to support the impact
  model's connection to audit data. The formulas themselves live in
  front-end helpers, not in the schema. The schema carries the
  structural facts (scores, rates, counts) that the formulas consume.

**Editorial JSON structure:**

- Formalise the two-JSON architecture: a data JSON (source of truth,
  structural, produced by the audit) and an editorial JSON (prose,
  interpretation, value framing, content for Eeva to edit). The
  front-end merges them at render time.
- Define the editorial JSON schema. It keys into the data JSON by
  finding ID, dimension ID, and cluster key. It carries: value_framing
  text, finding copy (Eeva's edited versions), cluster narratives, and
  any other client-facing prose.
- Document the content editing workflow: Eeva edits editorial JSON
  (extracted to markdown via compile script), her edits merge back into
  JSON, the front-end consumes the merged result.

#### Workstream 2: Front-end build

The front-end is a React dashboard consuming the audit JSON directly.
No markdown rendering. JSON is the source of truth.

Bárbara builds the initial front-end using Variant for visual direction
and Claude Code for implementation. Once it reaches a solid state, handover
to Konsta to continue and maintain. Konsta is the long-term technical
owner.

**Current state:**

- DESIGN-SPEC.md written to the dashboard repo
- Dark theme direction confirmed from Variant exploration
- Implementation in progress via Claude Code
- Several elements identified as missing from Variant output: data gaps
  section, effort-by-ownership table, findings/blocker count per cluster
  card, prerequisites caution flag
- IQ-001 cluster label to be corrected (Doc & Intent, not Component
  Quality)
- "High Confidence Estimate" pill to be replaced with "Projected
  estimate"

**Remaining front-end tasks:**

- Wire dashboard to real audit JSON data (currently uses placeholder
  content from Variant)
- Build benchmark/comparison screen
- Implement impact calculator with formulas from impact model
- Integrate content workflow (editorial JSON merge at render time)
- Add sprints/year and releases/year to impact calculator inputs (or
  state defaults)
- Prepare handover documentation for Konsta

#### Workstream 3: Audit runs and benchmark data

Both audits run against the updated schema (Workstream 1) so the
comparison screen has two datasets produced by identical methodology.

**MUI re-run:**

- Re-run the Material UI audit against the updated v2.2 schema.
  Produces clean output with value_framing and impact_categories
  populated on remediation items.
- Replaces the v2.1 backfilled output currently used as sample data.

**Benchmark audit:**

- Choose second system. Current recommendation is Carbon (IBM) for its
  mature documentation and well-structured token architecture, which
  should produce meaningfully different scores from MUI in Clusters 1
  and 3. Ant Design is the alternative if Carbon's Figma file proves
  problematic.
- Prerequisite: confirm the community Figma file is published to a team
  library. Unpublished files return empty arrays from `/components` and
  `/styles`.
- Run the full two-phase audit against the same schema version as the
  MUI re-run.
- Produces the second dataset for the comparison screen.

#### Workstream 4: Research and empirical data

The impact model makes causal claims about the relationship between
design system quality and operational cost. These claims need empirical
grounding beyond the four studies currently cited.

**Literature scan:**

- Locate and properly cite the four studies referenced in the impact
  model (Google Research on structured context, TokenOps framework,
  Princeton NLP Group on priority-based context allocation, code domain
  research on code smells and token usage). The current references are
  summaries without proper citations.
- Search for additional published research on: structured prompting and
  context engineering, documentation quality as a factor in agent
  performance, token consumption patterns in tool-augmented LLM
  workflows, design system documentation and developer productivity
  (even pre-AI research on this is relevant as an analogy).
- Identify whether any research exists on design system documentation
  quality and agent token consumption specifically. If not, confirm that
  our experiment (below) would be the first.

**MVP token efficiency experiment:**

- Write a prompt: "Select the correct Material UI component for showing
  a non-blocking feedback message after a form submission. Explain your
  choice."
- Run it against current MUI data (descriptions are code snippets).
  Record total token count, reasoning steps, and correctness.
- Write proper intent descriptions for Alert and Snackbar.
- Run the same prompt with intent documentation prepended.
- Compare: total tokens, reasoning steps, correctness.
- Even a single data point is powerful for client presentations.

**Extended experiment (after benchmark audit):**

- Run the same experiment against the benchmark system (Carbon or Ant
  Design). A system with better documentation should produce lower token
  counts. Two data points from different systems start to look like a
  pattern rather than an anecdote.

**Deliverables:**
```
audit/schema/audit-schema.json (updated)
Editorial JSON schema definition (location TBC)
Content editing workflow documentation
Front-end dashboard (initial build, then handover)
audit/material-ui/v2.2/ (re-run output)
audit/[benchmark-system]/v2.2/ (benchmark output)
Literature scan document with proper citations
Token efficiency experiment write-up with data
```

---

### Release 2.3 -- Stress test against a less-maintained system

**Test vehicle:** Public design system with Storybook (primary plan),
or Nordea (fallback)

**Question:** Does the script hold against a real-world, less-maintained
system? What breaks?

The primary plan is to find a public design system that is messier than
MUI or Carbon: inconsistent naming, partial documentation, gaps between
Figma and code. A system with a public Storybook can serve as the
code-side evidence source without requiring access to the source
repository.

If no suitable public system is found, the stress test is absorbed into
the Nordea engagement (Release 3.0). Nordea then serves as both stress
test and first client application, with enough runway built in to run
the audit, find what breaks, adjust, and re-run before delivering.

**Tasks:**

- Identify candidate system. Criteria: public Figma library, public
  Storybook, visibly less mature than MUI (incomplete documentation,
  naming inconsistencies, partial token architecture).
- Confirm whether the audit scoring logic can consume Storybook as a
  code-side evidence source. Storybook exposes component inventory, prop
  definitions, states, and sometimes documentation. Determine which
  code-only dimensions (2.2 component API composability, 2.3 variant
  completeness, 2.4 escape hatch usage, 5.5 test coverage, 5.6 adoption
  visibility, 5.7 code consistency) can be scored from Storybook and
  which still require source repo access.
- Run the audit without modification first. Record every failure mode
  before making adjustments.
- Compare findings profile against MUI and the benchmark system. The
  target should surface more blockers. If it does not, scoring
  thresholds may be too lenient.
- Identify which dimensions are most sensitive to file structure
  differences. These are the ones requiring the most adaptation work
  before any client sprint.

**Deliverables:**
```
audit/[vehicle]/v2.3/[vehicle]_audit_v2.3.json
audit/[vehicle]/v2.3/[vehicle]_audit_v2.3.md
decisions/XXX-[vehicle]-adaptation-notes.md
decisions/XXX-storybook-as-evidence-source.md (if applicable)
```

---

### Release 2.4 -- Methodology refinement

**Question:** What needs to change in the scoring methodology before
client application?

This is the release for refinements that emerge from the knowledge layer
work, the front-end build, the research, and the stress test.

**Possible tasks (to be confirmed):**

- Weighted scoring within the six-level documentation hierarchy (some
  levels worth more than others) versus binary presence scoring.
- Scoring weights config restructured to match cluster-based dimensions.
- Knowledge layer findings applied to scoring criteria.
- Any schema changes required by front-end or content workflow decisions.
- Pre-compute cache staleness detection (automated Figma file version
  comparison).
- Token efficiency dimension refinement based on experiment data.

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

### Release 3.0 -- First client application (Nordea)

**Test vehicle:** Nordea Figma files + code repository
**Question:** Does the tested script produce valid findings against a real
client system, and what adaptation is required?

This is not a development sprint. The script is tested. The work is
adaptation and application.

If Release 2.3 did not happen as a separate stress test (no suitable public
system was found), this release absorbs the stress-test tasks. In that case,
build in enough runway to run the audit, identify failure modes, adjust, and
re-run before delivering to the client.

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
- Populate the impact calculator with Nordea's team context (team size,
  sprint cadence, hourly rate) to produce client-specific projections.
- The client prompt is a variant, not a replacement. Both are maintained.

**Deliverables:**
```
prompts/audit-prompt-nordea.md
config/scoring-weights-nordea.json
audit/nordea/v3.0/nordea_audit_v3.0.json
audit/nordea/v3.0/nordea_audit_v3.0.md
decisions/XXX-nordea-adaptation-notes.md
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
