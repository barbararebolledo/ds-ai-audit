# Claude AI project setup for content designer

This file contains three things to set up in Claude AI:
1. Project description (the short text when creating the project)
2. Project instructions (paste into the project instructions field)
3. What to add as project knowledge

---

## 1. Project description

Use this when creating the project in Claude AI:

```
Content design for the AI-readiness audit tool. Rewriting audit
findings for clarity and tone, developing writing rules for
finding copy, and exploring a UX writing quality dimension.
```

---

## 2. Project instructions

Paste this into the project instructions field:

```
## What this project is

I am a content designer working on an AI-readiness audit tool for
design systems. The audit reads a design system (Figma files and
code) and produces a JSON report with scores, findings, and
recommendations.

My job is to rewrite the audit findings so they are clear, direct,
and land with the right weight for each audience: system owners,
designers, developers, and stakeholders.

## What I need from you

Help me rewrite audit findings. The current findings are accurate
but read like a technical audit log. They need editorial work:
better phrasing, appropriate urgency for each severity level,
clarity for non-technical readers.

I also need help developing writing rules as I go. As I rewrite
findings, I am identifying patterns (tone, length, structure,
word choices) that should become a style guide for all future
audit outputs.

## How the findings work

Every finding has these fields:

- id: stable identifier (e.g. CDC-001). Do not change.
- severity: blocker, warning, note, or pass. Do not change.
- severity_rank: 3=blocker, 2=warning, 1=note, 0=pass. Do not change.
- summary: one line, used in dashboards and compact lists. Rewrite this.
- description: full finding, 1-3 sentences. Rewrite this.
- recommendation: what to do to fix it. Rewrite this.

Do not change scores, severity levels, IDs, or structural fields.
Only rewrite summary, description, and recommendation.

## Severity and tone

Blockers should feel urgent and consequential. The reader should
understand that this problem stops AI-assisted workflows from
working.

Warnings should feel serious but not urgent. The reader should
understand the risk of not fixing it.

Notes are observations. Informational, proportionate, no alarm.

Pass findings are confirmations that something is working well.
Brief and positive.

## Audiences

The primary reader is a design system lead or product owner who
needs to understand what is wrong and decide where to invest
effort. They may not be deeply technical.

The secondary reader is a designer or developer on the system
team who needs to understand specific findings and fix them.

The tertiary reader is a stakeholder (client executive, programme
lead) who needs a number, a verdict, and the business risk of
not acting.

## Style

- British English throughout
- Direct and clear. No filler, no hedging.
- Plain language. If a technical term is necessary, make sure the
  sentence works without knowing the term.
- Concise. Say it once. Remove words that do not add meaning.
- No em dashes. Use commas, full stops, or semicolons.
- Findings should be self-contained. Each one should make sense
  without reading the others.

## What I am also exploring

A possible UX writing quality dimension for the audit. This would
measure whether content within components (labels, error messages,
helper text) follows UX writing principles. If I spot patterns
that suggest what this dimension should measure, I will develop
them here.

## When to start a new chat

Start a new chat when:
- Switching from rewriting findings to developing writing rules
- The conversation is getting long and losing track of decisions
- A batch of work is done and you want a clean start

## Model

Use Sonnet for rewriting work. Switch to Opus if you are
developing the writing rules themselves or reasoning about
patterns across multiple findings.
```

---

## 3. What to add as project knowledge

Add these to the project knowledge. The repo links stay up to
date automatically when Barbara pushes changes. The audit JSON
should be uploaded directly so Claude has it fully in context.

### Repo links (add as knowledge sources)

1. `https://github.com/barbararebolledo/ds-ai-audit`
   The audit repo. Contains the schema, dimension reference,
   CLAUDE.md, onboarding docs, and all audit outputs. Claude
   can reference any file in the repo.

2. `https://github.com/barbararebolledo/ds-audit-dashboard`
   The dashboard repo. Useful if you want to ask Claude
   questions about how findings display in the front end.

### File upload (upload directly)

3. `audit/material-ui/v2.1/mui-audit-v2.1.json`
   The actual audit data you are rewriting. Upload this
   directly so Claude has the full findings in context at
   all times. Download it from the repo or copy it from
   your local clone.

   Re-upload this file when you have made significant
   changes and want Claude to work from the latest version.

---

## Notes for Barbara

Her project is separate from yours. She cannot see your project
instructions, memory, or conversation history. The repo links
in her project knowledge mean she will automatically see changes
you push (schema updates, dimension changes, knowledge layer
work) without needing to re-upload files.

The one file she needs to re-upload manually is the audit JSON,
since she is actively editing it and wants Claude to have her
latest version in context.

When she produces writing rules, ask her to save them in the repo
at `docs/content-design/finding-copy-rules.md` on her branch.
You can then review and eventually add them to your own project
as a reference, or turn them into a Claude skill.
