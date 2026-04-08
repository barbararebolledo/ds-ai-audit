# ADR 010: Cluster 3 taxonomy, co-location principle scope, and dimension naming

Date: 2026-04-08
Status: Confirmed
Origin: Thinking Track sessions (co-location principle spark, Cluster 3 review)
Affects: CLAUDE.md (dimension definitions), dimension-reference.json, scoring rubrics, client-facing narrative

---

## Context

Carbon v3.0 scored 4 on dimension 3.4 (usage guidance) while scoring 0 on 3.1 (component description coverage). The discrepancy exposed a question: should the co-location principle, already applied to 3.1 and 3.5, extend to all Cluster 3 dimensions? Investigating that question led to a broader review of the cluster's internal logic, the relationship between its dimensions, and the clarity of its naming for client audiences.

The co-location principle states that external documentation with no declared path from the component within the agent's toolchain scores lower than documentation co-located with the component or explicitly referenced from it.

---

## Decisions

### 1. Cluster 3 taxonomy: discoverability and readability

Cluster 3 is organised into two sub-categories:

**Discoverability** -- can the agent find the documentation?
- 3.1 Functional Intent Coverage
- 3.5 In-File Documentation Structure

**Readability** -- does the documentation structure reduce hallucination and assumption?
- 3.2 Documentation Indexing
- 3.3 Intent Quality
- 3.4 Usage Guidance Structure

This taxonomy is the organising principle for the cluster. It determines which rules apply to which dimensions and structures the client-facing narrative.

### 2. Co-location principle scope

The co-location principle applies to discoverability dimensions only (3.1, 3.5). It does not apply to readability dimensions (3.2, 3.3, 3.4).

Rationale: co-location is about findability. A dimension that measures content quality (is the guidance structured? is the documentation deep?) should not be penalised for where the content lives. A dimension that measures whether an agent can find the content should. The taxonomy makes this rule self-evident rather than requiring a case-by-case justification.

This resolves the Carbon 3.4 question: Carbon's score of 4 on usage guidance is legitimate because the dimension measures content structure, not discoverability. The cluster average already reflects the discoverability gap through 3.1 and 3.5.

### 3. Readability reframe

AI can read anything. The question is not "can the agent read it" but "does the structure reduce hallucination and assumption?" Less structure means more inference. More inference means more errors and more tokens.

This framing should be visible in methodology language, including dimension descriptions and client-facing narratives. Readability dimensions should note that less structure means more tokens and more errors per task. Discoverability dimensions should note that absent functional intent forces the agent into expensive learning loops with no accuracy guarantee. These are distinct cost mechanisms and both belong in dimension descriptions.

### 4. 3.2 vs 3.4 distinction confirmed

These dimensions are distinct and measure different things at different levels:

- 3.2 (Documentation Indexing) = is the documentation indexed? System-level: schemas, frontmatter, queryable structure. Remediation owner: infrastructure/platform team.
- 3.4 (Usage Guidance Structure) = is the content written in a structured way? Content-level: labelled sections, explicit rules, parseable writing vs narrative prose. Remediation owner: content/documentation team.

A system can score high on 3.2 and low on 3.4 (well-indexed documentation with vague prose) or low on 3.2 and high on 3.4 (well-written content in an unindexed wiki). Different failure modes, different remediation owners.

### 5. 3.3 confirmed as distinct

Dimension 3.3 (Intent Quality) measures depth and completeness against the six-level documentation hierarchy. A system can score high on 3.2 (well-indexed) and 3.4 (well-structured prose) but low on 3.3 if documentation only covers purpose and use cases with nothing on error handling or edge cases. The hierarchy is the measurement instrument; 3.2 and 3.4 measure properties of the container, 3.3 measures the substance inside it.

### 6. Cluster and dimension renaming

The following names are changed to improve client readability and align with the taxonomy:

| ID | Previous name | New name | Reason |
|---|---|---|---|
| Cluster 3 | Documentation and Intent | Documentation Readiness | Previous name described content without communicating what the cluster measures. "Readiness" implies the documentation can be more or less ready for agent consumption. |
| 3.1 | Component Description Coverage | Functional Intent Coverage | "Description" implies any text in a field. The dimension measures whether functional intent is present, not whether a description exists. Removes "component" because cluster context provides that. |
| 3.2 | Documentation Structure and Machine-Readability | Documentation Indexing | The previous name was accurate but overlong. "Indexing" names what the dimension rewards at the top of the scale: schemas, frontmatter, queryable structure that lets an agent look things up rather than reading everything linearly. Clean separation from 3.4 (content-level structure). |
| 3.4 | Usage Guidance Formalisation | Usage Guidance Structure | "Formalisation" is academic and opaque. "Structure" names what the dimension rewards: guidance organised with labelled sections and explicit rules rather than narrative prose. Consistent language with 3.5. |
| 3.5 | Documentation Frame Metadata | In-File Documentation Structure | "Frame" is Figma jargon. "Metadata" is technical. The actual question is whether the Figma file contains structured documentation an agent can read directly. "In-file" captures the co-location concept. |

Dimension 3.3 (Intent Quality) retains its current name.

---

## What changes

1. **CLAUDE.md**: Update Cluster 3 section with new cluster name, new dimension names for 3.1, 3.2, 3.4, 3.5, sub-category labels, and the readability reframe in dimension descriptions.
2. **dimension-reference.json**: Update dimension names and descriptions for 3.1, 3.2, 3.4, 3.5. Update cluster name.
3. **Scoring rubrics**: No changes to score levels or thresholds. The scoring criteria remain the same; only names and descriptions change.
4. **Client-facing narrative**: The discoverability/readability taxonomy and cost framing should be reflected in any client-facing materials that reference Cluster 3.
5. **Benchmark scores**: No rescoring required. Carbon's 3.4 score of 4 is confirmed as legitimate under this taxonomy.

---

## What does not change

- Score levels and thresholds for any dimension
- The co-location principle itself (already in v3.0)
- Dimension weights in scoring-weights.json
- Any dimension outside Cluster 3
- The six-level documentation hierarchy
- Audit schema structure

---

## Implementation route

This ADR is a Thinking Track decision record. Implementation in the ds-ai-audit repo (updating CLAUDE.md, dimension-reference.json, and related files) should be handled in a separate session using this ADR as the handoff brief. Recommended model: Sonnet, as the implementation is structured application of confirmed decisions with no open reasoning required.
