# What we are building

## The short version

We are building an AI-readiness audit for design systems. The audit
reads a design system (Figma files and code) and produces a
structured report that says: here is how ready your system is for
AI-assisted workflows, here is what is blocking it, and here is
what to fix first.

The output is a JSON file with scores, findings, and remediation
recommendations. A dashboard displays the results visually.

Your job is to define how the findings read. The tone, the
structure, the clarity. Right now the findings are written by an
AI for a technical audience. They need to work for system owners,
designers, developers, and stakeholders who may not have deep
design systems expertise.

---

## What the audit measures

The audit scores a design system across 7 clusters and 56
dimensions. Each dimension gets a score from 0 to 4. The clusters
group related dimensions together.

Here is what each cluster measures, in plain language:

### Cluster 0: Prerequisites

Does the system have a clear platform strategy? If not, everything
else is unreliable. This is a gate: if it fails, all other scores
carry a warning.

### Cluster 1: Token and variable system

Tokens are the design values (colours, spacing, type sizes) stored
as named variables. This cluster checks whether they exist, whether
they are structured in layers (raw values, semantic names, component
names), whether the naming is consistent, and whether they are
documented.

Why it matters for AI: an agent building a screen needs to know
which colour to use for a primary button. If the token system is
flat or undocumented, the agent guesses. If it is structured and
named well, the agent picks the right value every time.

### Cluster 2: Component quality

Components are the building blocks (buttons, inputs, cards).
This cluster checks whether component properties are connected to
tokens (not hardcoded), whether the API is well-structured, and
whether all meaningful states (hover, focus, disabled, error) exist
as named variants.

Why it matters for AI: an agent generating a form needs to know
that a text input has an error state. If the error state exists
as a named variant, the agent uses it. If it does not, the agent
generates a form with no error handling.

### Cluster 3: Documentation and intent

This is the cluster most relevant to your work. It measures whether
the design system can explain itself.

It has five dimensions:

3.1 Component description coverage: do components have
descriptions? Of those with descriptions, what percentage actually
explain what the component does (functional intent) rather than
just showing a code snippet?

3.2 Documentation structure: is the documentation structured data
(machine-queryable) or narrative prose?

3.3 Intent quality: is the documentation well-structured, concise,
and useful? Scored against a six-level hierarchy: purpose,
structure, behaviour, use cases, error handling, edge cases.

3.4 Usage guidance formalisation: are the usage rules formal
(do/don't, constraints) or vague ("consider using...")?

3.5 Documentation frame metadata: does the Figma file contain
structured documentation pages with useful metadata?

The key finding from auditing Material UI: 96.2% of component
descriptions are code import snippets like
`import { Button } from '@mui/material'`. Descriptions exist but
intent is absent. An agent reading these descriptions learns how
to import a component but not when to use it or what it does.

### Cluster 4: Design quality baseline

Universal quality standards that any design system should meet:
contrast ratios, spacing consistency, type hierarchy, motion,
focus states, error states, empty states. These are the rules
that can be checked mechanically.

This is not "craft." Craft is human judgement, taste, knowing which
rule to break. This cluster measures whether the basic quality
standards are encoded in the system.

### Cluster 5: Governance and ecosystem

How the system is maintained: naming conventions, versioning,
contribution standards, deprecation, testing, adoption tracking.

### Cluster 6: Design-to-code parity

Whether the Figma file and the code repository agree. Token values,
token names, component names, variant coverage, behaviour. If they
disagree, the agent does not know which source of truth to use.

---

## What a finding looks like

Every finding in the audit has these fields:

- **id**: a stable identifier (e.g. CDC-001)
- **severity**: blocker, warning, note, or pass
- **severity_rank**: a number for sorting (3=blocker, 0=pass)
- **summary**: one line, used in dashboards and lists
- **description**: the full finding, 1-3 sentences
- **recommendation**: what to do to fix it

Here is an example of a current finding:

> **id:** CDC-001
> **severity:** blocker
> **summary:** "96.2% of component descriptions are code import
> snippets with no functional intent"
> **description:** "Of 143 component set root entries, 52 have
> descriptions (36.4% coverage). Of those 52, 50 are code import
> snippets (96.2%). Only 2 descriptions contain any functional
> intent. An agent cannot determine component purpose from these
> descriptions."
> **recommendation:** "Replace code import snippets with functional
> intent descriptions on component set root entries, starting with
> the 6 primary component pages."

This is accurate but it reads like a technical audit log. The
numbers are right. The voice is flat. A system owner reading this
would understand the problem but would not feel the urgency. A
designer might not fully understand why "code import snippets" are
a problem.

Your job is to rewrite findings so they are clear, direct, and
land with the right weight for each severity level. A blocker
should feel like a blocker. A note should feel proportionate.

---

## The scoring scale

Each dimension is scored 0-4:

0 = absent (nothing exists)
1 = minimal (something exists but it is thin)
2 = partial (some coverage, significant gaps)
3 = substantial (mostly covered, minor gaps)
4 = comprehensive (fully covered, well-structured)

The overall score is a weighted percentage (0-100). Material UI
scored 55.3/100, which means "not ready for AI-assisted workflows."

---

## The idea: a UX writing dimension

We are considering adding a UX writing quality dimension to the
audit, likely in Cluster 4 (design quality baseline). This would
measure whether the content within components (labels, error
messages, helper text, placeholder text) follows established
UX writing principles: clear, concise, action-oriented, consistent.

This is not yet defined. If you see patterns while rewriting the
findings that suggest what this dimension should measure, capture
them. Your work on tone of voice rules may directly inform what
this dimension looks like.

---

## What you are not touching

You are working on the editorial layer: how findings read. You are
not changing scores, adding dimensions, modifying the schema, or
altering the audit logic. If you find a finding that seems
incorrectly scored or missing, flag it to Barbara rather than
changing it.
