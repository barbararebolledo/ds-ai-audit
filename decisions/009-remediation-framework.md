# 009: Remediation framework and three-file output architecture

**Date:** 7 April 2026
**Status:** Accepted (except where marked Draft)
**Release:** 3.0

---

## Context

The Carbon/MUI benchmark (Evidence/carbon-mui-benchmark-findings.md) produced three open threads that required methodology decisions. Those decisions were worked in the Thinking Track and arrived as a confirmed handoff (Sparks/2026-04-07-remediation-framework-handoff.md). This ADR implements them.

A parallel architectural problem surfaced during implementation: the audit JSON file is large enough to cause MCP timeout failures on write operations, and the remediation section is structurally distinct from the scoring data -- it is a living document between runs, not immutable machine output. This prompted a decision to split the audit output into three files per run, which is also documented here.

---

## Decision 1: Three-file output architecture

Each audit run produces three files, joined by `audit_id`:

- `[system]-audit.json` -- immutable machine output. Scores, clusters, dimensions, findings, data gaps, meta. Written by the audit engine on each run. Never hand-edited. Accumulates over time; previous runs are never overwritten.
- `[system]-remediation.json` -- the remediation plan. A flat array of prioritised remediation items. Written by the audit engine on each run, editable by the auditor between runs. Updated as items are addressed and new findings emerge.
- `[system]-editorial.json` -- human-written prose overrides for client-facing output. Cluster narratives, finding copy, remediation descriptions. Written and maintained by the content editor (Eeva). Never touched by the audit engine.

The join key across all three files is `audit_id`, defined in the meta block of the audit file.

**Rationale:** The three-file split reflects three distinct concerns with different ownership and different lifecycles. The audit file is machine-generated and immutable. The remediation file is machine-generated but human-maintained. The editorial file is human-generated throughout. Mixing these into a single file creates write risk (large file + MCP timeouts), authorship confusion, and coupling between concerns that evolve at different rates.

**Scalability toward recurring audits:** The audit file accumulates. Each run produces a new dated file. The remediation file is the continuity layer -- it carries forward between runs, updated to reflect what has been addressed and what is new. The editorial file is stable until a client engagement requires a content refresh. This structure directly supports the target state: a recurring QA agent that writes audit files, diffs them against previous runs, and proposes an updated remediation file for human review.

**Schema files:**
- `audit-schema.json` moves to v3.0. The `remediation` block is removed entirely.
- `remediation-schema.json` is new, starting at v1.0. Lives at `audit/schema/remediation-schema.json`.
- `editorial-schema.json` stays at v1.0. Its scope is clarified: prose overrides only, no remediation structure.

---

## Decision 2: Three-bucket system retired, replaced by priority_tier

The existing `Remediation` object in the audit schema used three named buckets: `quick_wins`, `foundational_blockers`, and `post_migration`. These are removed.

The remediation file uses a flat array of `RemediationItem` objects. Each item carries a `priority_tier` field (integer: 1, 2, or 3) that encodes client-facing remediation priority.

**Priority tier definitions:**

- **Tier 1 -- Necessary for agent readability.** Without these items addressed, the agent cannot read the system at all. Covers: component descriptions (3.1), token documentation (1.6), co-location mechanism (declared path from component to docs). Effort is irrelevant to the tier assignment -- a tier 1 item that takes weeks is still tier 1.
- **Tier 2 -- High leverage, low effort.** Improves the quality of what the agent reads. Within the design system team's control. Covers: parity gap register (6.6), structured usage guidance (3.4 improvements), documentation structure (3.2). Days to weeks.
- **Tier 3 -- Important but high effort.** Design quality improvements requiring design capacity and cross-functional alignment. Covers: empty state patterns (4.12), responsive coverage gaps, accessibility documentation. Weeks to months.

**Sort order within the remediation file:** Items are sorted by `priority_tier` ascending (1 first), then by `effort_estimate` ascending (hours → days → weeks), then by `severity_rank` descending (higher severity first within the same tier and effort band). This produces an implicit roadmap: a client reading from the top works through the highest-priority, lowest-effort items first within each tier.

**Rationale for retiring the three-bucket system:** The bucket names (`quick_wins`, `foundational_blockers`, `post_migration`) encoded effort and urgency in a single label, which produced ambiguity -- a foundational blocker could also be a quick win depending on the team's capacity. The `priority_tier` field separates readability priority (why it matters to the agent) from effort (how much work it is), which are independent concerns. Effort is already carried by `effort_estimate`. The tier carries the readability logic. The sort order does the roadmap work the buckets were trying to do.

---

## Decision 3: Two new fields on RemediationItem

**`remediation_type`** (string, enum, optional in schema, expected in practice)

Values: `relocate` | `refactor` | `rebuild`

- `relocate` -- the documentation exists (on a docs site, in code comments, in an external tool) but is not accessible from the design file and has no declared path to it. Fix: add links in component description fields, or declare the mapping in CLAUDE.md. Lowest effort.
- `refactor` -- the component is structurally sound but documentation is missing or thin. Fix: add descriptions, structure usage guidance, declare the co-location path. Documentation work on a solid foundation.
- `rebuild` -- the component is structurally poor (deep nesting, inconsistent variant logic, naming inconsistency in Figma; deprecated patterns, no types, no tests in code). Documenting it would be documenting something broken. Fix: rebuild the component to a clean standard, then document it. Highest effort -- design and/or engineering work before documentation work is viable.

**How the audit engine determines the type:**
- High cluster 2 score + low cluster 3 score → `refactor`
- Low cluster 2 score + low cluster 3 score → `rebuild`
- Documentation exists in external sources but not co-located or declared → `relocate`

**`priority_tier`** (integer, enum: 1 | 2 | 3, optional in schema, expected in practice)

Defined above in Decision 2.

**Position in RemediationItem:** Both fields sit after `impact_categories` and before `projected_score_improvement` in the schema definition.

---

## Decision 4: Co-location principle (new methodological principle)

**Principle:** Intent documentation must be declared and accessible from the component within the agent's toolchain. The principle is about declared accessibility, not physical location.

Two valid routes, scoring equally on readiness:

- **Route A:** Native Figma component description field + link field. The agent reads component metadata directly via the REST API. Self-describing, no additional configuration needed.
- **Route B:** In-file documentation pages (e.g. the Aktia/UMP template structure with anatomy, behaviour, touch target sections) with the structure declared in CLAUDE.md so the agent knows where to find them and how to parse them.

**Scoring implication:** External-only documentation with no declared path from the component scores lower on dimension 3.1 -- not because it is external, but because it is undeclared. A system with excellent docs site documentation but no link or declaration from Figma components has not completed the translation for agent access.

**What does not change:** Token efficiency and sustainability of each route are measured separately in the impact layer, not in the readiness score. The co-location principle affects scoring in dimensions 3.1, 3.4, and 3.5. Dimension descriptions for those dimensions should reference the principle and its two valid routes.

**Client narrative:** "The documentation exists. It is just in the wrong place." The remediation for undeclared external documentation is a `relocate` action -- the lowest-effort remediation type.

---

## Decision 5: Usage guidance scoring confirmed (no methodology change)

The gap between Carbon's 4/4 and MUI's 2/4 on dimension 3.4 is a real quality difference, not a format artefact.

Structure is a readability property, not a formatting preference. Dedicated, labelled usage sections (when to use, when not to use, content guidelines) are more reliably agent-parseable than equivalent guidance scattered through prose. The audit measures readability. Structured content is more readable by an agent than unstructured content, even when the substantive design thinking behind both is equally strong.

No methodology change is needed. This decision documents the reasoning so the scoring is not re-litigated in future sessions or client presentations.

---

## Decision 6: Code-side rebuild threshold (DRAFT -- requires developer validation)

**Assumption:** When a component scores 0/4 or 1/4 on three or more code quality dimensions (2.2 component API composability, 2.4 escape hatch usage, 5.5 test coverage, 5.7 code consistency, and 1.5 token format and machine-readability), the remediation item should be flagged as a `rebuild` candidate rather than assuming refactoring is viable.

**Status: Draft.** This is a heuristic, not a confirmed threshold. It requires validation from a developer (Konsta) who can assess whether the dimension combination and the 3-out-of-5 threshold match real-world codebase judgement. Do not implement this as automated logic until the threshold is validated. Until then, `rebuild` classification on code-side items is a manual auditor judgement call.

---

## Release milestone restructure

As a consequence of this session's architectural decisions, the release milestone map is restructured:

- **Releases 1.x -- 2.x:** Complete. Methodology built, schemas iterated, benchmark audits run.
- **Release 3.0 -- Working pilot.** Schema finalised (three-file architecture, v3.0). Front-end built and wired to real data. Tool works end-to-end and is ready to run against a client without adaptation risk.
- **Release 4.0 -- First client application (Nordea).** Adaptation sprint. Run the tested tool against Nordea's system, deliver findings. If the Nordea engagement requires schema changes, those are v3.1 (additive) or v4.0 (breaking).

The release plan document (`docs/release-plan.md`) requires a separate update to reflect this restructure. That is a deferred task for a short dedicated session.

---

## What to build in Claude Code

The following tasks are ready for execution in a Claude Code session. Read this ADR and the current schema before starting.

1. Update `audit-schema.json` to v3.0: remove the `remediation` block and the `Remediation` and `RemediationItem` definitions from `$defs`. Update `$comment` to document the v3.0 change. Update `schema_version` const from `"2.2"` to `"3.0"`.

2. Write `audit/schema/remediation-schema.json` at v1.0. The root object contains: `meta` (audit_id, system_name, schema_version, generated_at), `items` (flat array of RemediationItem). RemediationItem carries all existing fields (`id`, `action`, `affected_cluster`, `affected_dimensions`, `effort_estimate`, `ownership`, `value_framing`, `impact_categories`, `projected_score_improvement`, `finding_ids`) plus the two new fields (`remediation_type`, `priority_tier`). Sort order convention is documented in the schema comment: priority_tier ascending, effort_estimate ascending, severity_rank descending.

3. Update `audit/schema/editorial-schema.json`: add a `$comment` clarifying that the editorial schema covers prose overrides only and does not carry remediation structure.

4. Split `audit/material-ui/v2.2/mui-audit-v2.2.json`: extract the `remediation` block into a new file `audit/material-ui/v2.2/mui-remediation-v2.2.json`. Add `priority_tier` and `remediation_type` to each item. Apply the sort order convention. Remove the `remediation` key from the audit file.

5. Split `audit/carbon/v2.2/carbon-audit-v2.2.json`: same as above, producing `audit/carbon/v2.2/carbon-remediation-v2.2.json`.

6. Update `_index.md` in the Github repo root to reflect the new schema files and the split audit output structure.

---

## References

- Handoff brief: `Sparks/2026-04-07-remediation-framework-handoff.md`
- Evidence base: `Thinking-track/Evidence/carbon-mui-benchmark-findings.md`
- Superseded schema: `audit/schema/audit-schema.json` (v2.2)
- New schemas: `audit/schema/audit-schema.json` (v3.0), `audit/schema/remediation-schema.json` (v1.0)
- Affected dimensions: 3.1, 3.4, 3.5 (co-location principle)
- Developer validation needed: Decision 6 (code-side rebuild threshold) -- flag for Konsta
