# Setup and working with Claude

## Installing Claude Code

Claude Code runs in the terminal inside VS Code. It gives you a
conversational interface to reason about your work, rewrite copy,
and develop rules.

To install (one time):

1. Open VS Code
2. Open the terminal (Terminal > New Terminal)
3. Run:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
4. Once installed, navigate to the audit repo:
   ```
   cd /Users/barbara.rebolledo/Github\ repo/ds-ai-audit
   ```
5. Type `claude` to start a session

You should see a Claude prompt in the terminal. You are ready.

---

## Which model to use

Claude Code gives you access to different models. For your work:

**Sonnet** (default) -- use for most of your work. Rewriting
findings, testing phrasing, iterating on tone. It is fast and
good at language work.

**Opus** -- switch to this when you are developing the writing
rules themselves, thinking about patterns, or working on something
that needs deeper reasoning. To switch:
```
/model opus
```

You do not need to switch back to Sonnet. Just start a new session
and it resets to the default.

---

## How to prompt Claude Code

Claude Code reads the repo. It knows the project structure, the
schema, and the audit JSON. You do not need to explain everything
from scratch.

Good opening prompts:

```
Read CLAUDE.md and the MUI audit JSON at
audit/material-ui/v2.1/mui-audit-v2.1.json.
I am rewriting the finding copy for clarity and tone.
Show me the current blockers and suggest rewrites.
```

```
Read the finding CDC-001 in the MUI audit JSON.
The current description is too technical. Rewrite it
so a design system lead who is not a developer
understands the problem and feels the urgency.
```

```
I have rewritten 5 findings. Read the updated JSON and
tell me if the tone is consistent across them. Flag
any that feel off.
```

Tips:

- Be specific about what you want. "Rewrite this" is vague.
  "Rewrite this so it is clearer to a non-technical stakeholder"
  gives Claude something to aim at.
- Ask Claude to explain its reasoning. "Why did you phrase it
  that way?" helps you develop your own rules.
- If a rewrite is not right, say why. "Too soft for a blocker"
  or "too long for a summary" is useful feedback.
- Ask Claude to read your writing rules file and apply them
  when rewriting. This is how you test whether the rules work.

---

## Session management

A "session" is one continuous conversation with Claude Code in the
terminal. Start a new session when:

- You are switching to a different task (e.g. from rewriting
  findings to developing writing rules)
- The conversation has gotten long and Claude seems to lose track
  of earlier decisions
- You have finished a batch of work and want a clean start

To end a session: type `/exit` or close the terminal.

To start a new session: type `claude` again.

Claude Code reads the repo files fresh at the start of each
session, so your latest changes are always picked up.

---

## What Claude Code can and cannot do

**It can:**
- Read and understand the entire repo
- Rewrite text and suggest alternatives
- Check consistency across findings
- Apply your writing rules to new content
- Edit files directly (it will ask for permission)
- Explain the scoring methodology and dimensions

**It cannot:**
- Push to GitHub (you do that yourself)
- Run the dashboard (use Cursor for that)
- Make design decisions about the audit methodology
- Access Figma or any external tools

---

## Working with Barbara

Barbara reviews and merges your branch to main. When you have a
batch ready:

1. Make sure all changes are committed and pushed to your branch
2. Tell Barbara the branch is ready for review
3. She will review the rewrites and either merge or give feedback

If you are unsure about a rewrite (e.g. a finding where the
technical content is ambiguous), flag it. Do not guess at meaning.
Ask Barbara or Claude Code to explain the finding before rewriting.

---

## Quick reference

| Task | Tool | Where |
|---|---|---|
| Edit audit JSON | VS Code | audit repo, your branch |
| Reason about copy | Claude Code | terminal in VS Code |
| Preview in dashboard | Cursor | dashboard repo, localhost |
| Commit and push | Git | terminal in VS Code |
| Develop writing rules | VS Code + Claude Code | your branch |
